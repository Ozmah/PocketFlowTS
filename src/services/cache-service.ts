import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, stat, unlink, writeFile, } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";

// --- TYPE DEFINITIONS ---

/**
 * Options to control caching behavior for an individual request.
 */
export interface CacheOptions {
	/** Whether to use the cache for this request. */
	useCache?: boolean;
	/** Time-to-live for this specific cache entry in milliseconds. */
	ttl?: number;
	/** A schema to validate the cached object against. */
	schema?: z.ZodSchema<any>;
}

/**
 * Represents a single entry in the LLM cache.
 */
interface CacheEntry {
	/** The cached response content. */
	response: string;
	/** Timestamp when the entry was created. */
	timestamp: number;
	/** The TTL for this specific entry. */
	ttl: number;
	/** The provider used to generate the response. */
	provider: string;
	/** Hash of the Zod schema, if provided. */
	schemaHash?: string;
}

/**
 * The structure of the main cache file (llm_cache.json).
 */
type LLMCache = Record<string, CacheEntry>;

/**
 * The structure of the cache metrics file.
 */
export interface CacheMetrics {
	totalRequests: number;
	cacheHits: number;
	cacheMisses: number;
	hitRate: number;
	cacheSize: number; // in bytes
	lastCleanup: number; // timestamp
}

// --- CONSTANTS ---

const CACHE_DIR = ".cache";
const CACHE_FILE = "llm_cache.json";
const METADATA_FILE = "cache_metadata.json";
const LOG_FILE = "llm_interactions.log";
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const HASH_ALGORITHM = "sha256";

/**
 * # CacheService
 *
 * A singleton service for caching LLM responses to reduce API calls and latency.
 */
export class CacheService {
	private static instance: CacheService;
	private isDirEnsured = false;

	private readonly cacheDir: string;
	private readonly cacheFile: string;
	private readonly metadataFile: string;
	private readonly logFile: string;

	private constructor() {
		this.cacheDir = join(process.cwd(), CACHE_DIR);
		this.cacheFile = join(this.cacheDir, CACHE_FILE);
		this.metadataFile = join(this.cacheDir, METADATA_FILE);
		this.logFile = join(this.cacheDir, LOG_FILE);
	}

	/**
	 * Returns the singleton instance of the CacheService.
	 */
	public static getInstance(): CacheService {
		if (!CacheService.instance) {
			CacheService.instance = new CacheService();
		}
		return CacheService.instance;
	}

	private async ensureCacheDirOnce(): Promise<void> {
		if (this.isDirEnsured) return;
		await this.ensureCacheDir();
		this.isDirEnsured = true;
	}

	/**
	 * Generates a consistent SHA-256 hash for a given prompt, provider, and options.
	 * This hash is used as the key in the cache.
	 */
	generateCacheKey(
		prompt: string,
		provider: string,
		options: CacheOptions,
	): string {
		const hash = createHash(HASH_ALGORITHM);
		hash.update(prompt);
		hash.update(provider);

		if (options.schema) {
			hash.update(this._serializeSchema(options.schema));
		}

		return hash.digest("hex");
	}

	/**
	 * Ensures that the cache directory exists, creating it if necessary.
	 */
	private async ensureCacheDir(): Promise<void> {
		try {
			if (!existsSync(this.cacheDir)) {
				await mkdir(this.cacheDir, { recursive: true });
			}
		} catch (error) {
			console.error("Failed to create cache directory:", error);
		}
	}

	/**
	 * Loads the cache from the JSON file, simultaneously cleaning up expired entries.
	 */
	private async loadCache(): Promise<LLMCache> {
		await this.ensureCacheDirOnce();
		try {
			if (!existsSync(this.cacheFile)) {
				return {};
			}
			const content = await readFile(this.cacheFile, "utf-8");
			const cache: LLMCache = JSON.parse(content);
			const now = Date.now();
			let modified = false;

			for (const key in cache) {
				const entry = cache[key];
				if (now > entry.timestamp + entry.ttl) {
					delete cache[key];
					modified = true;
				}
			}

			if (modified) {
				await this.saveCache(cache);
			}

			return cache;
		} catch (error) {
			console.error("Failed to load or parse cache, starting fresh:", error);
			return {};
		}
	}

	/**
	 * Saves the given cache object to the JSON file.
	 */
	private async saveCache(cache: LLMCache): Promise<void> {
		await this.ensureCacheDirOnce();
		try {
			await writeFile(this.cacheFile, JSON.stringify(cache, null, 2));
		} catch (error) {
			console.error("Failed to save cache:", error);
		}
	}

	/**
	 * Logs an interaction (hit or miss) to the log file.
	 */
	private async logInteraction(
		key: string,
		status: "HIT" | "MISS",
		provider: string,
	): Promise<void> {
		await this.ensureCacheDirOnce();
		const timestamp = new Date().toISOString();
		const logEntry = `${timestamp} - ${status} - ${provider} - ${key}\n`;
		try {
			await appendFile(this.logFile, logEntry);
		} catch (error) {
			console.error("Failed to write to log file:", error);
		}
	}

	/**
	 * Retrieves a cached response. Returns null if not found, expired, or if caching is disabled.
	 */
	async get(
		prompt: string,
		provider: string,
		options: CacheOptions,
	): Promise<string | null> {
		await this.ensureCacheDirOnce();
		if (options.useCache === false) {
			return null;
		}

		const key = this.generateCacheKey(prompt, provider, options);
		const cache = await this.loadCache();
		const entry = cache[key];

		if (!entry) {
			await this.logInteraction(key, "MISS", provider);
			await this.updateMetrics(false);
			return null;
		}

		if (Date.now() > entry.timestamp + entry.ttl) {
			await this.logInteraction(key, "MISS", provider);
			await this.updateMetrics(false);
			return null;
		}

		if (options.schema) {
			const currentSchemaHash = this.getSchemaHash(options.schema);
			if (entry.schemaHash !== currentSchemaHash) {
				await this.logInteraction(key, "MISS", provider);
				await this.updateMetrics(false);
				return null;
			}
		}

		await this.logInteraction(key, "HIT", provider);
		await this.updateMetrics(true);
		return entry.response;
	}

	/**
	 * Stores a response in the cache.
	 */
	async set(
		prompt: string,
		response: string,
		provider: string,
		options: CacheOptions,
	): Promise<void> {
		await this.ensureCacheDirOnce();
		const key = this.generateCacheKey(prompt, provider, options);
		const cache = await this.loadCache();

		const newEntry: CacheEntry = {
			response,
			timestamp: Date.now(),
			ttl: options.ttl ?? DEFAULT_TTL,
			provider,
			schemaHash: options.schema
				? this.getSchemaHash(options.schema)
				: undefined,
		};

		cache[key] = newEntry;
		await this.saveCache(cache);
	}

	private _serializeSchema(schema: z.ZodSchema<any>): string {
		// Using schema.describe() provides a stable, detailed JSON representation
		// of the schema, including types, checks, and descriptions.
		if (typeof schema.describe !== 'function') {
			return 'unknown_schema';
		}
		return JSON.stringify(schema.describe());
	}

	private getSchemaHash(schema: z.ZodSchema<any>): string {
		const hash = createHash(HASH_ALGORITHM);
		hash.update(this._serializeSchema(schema));
		return hash.digest("hex");
	}

	// --- Metrics and Management ---

	private async loadMetrics(): Promise<CacheMetrics> {
		await this.ensureCacheDirOnce();
		try {
			if (!existsSync(this.metadataFile)) {
				return {
					totalRequests: 0,
					cacheHits: 0,
					cacheMisses: 0,
					hitRate: 0,
					cacheSize: 0,
					lastCleanup: Date.now(),
				};
			}
			const content = await readFile(this.metadataFile, "utf-8");
			return JSON.parse(content);
		} catch (error) {
			console.error("Failed to load metrics, resetting:", error);
			return {
				totalRequests: 0,
				cacheHits: 0,
				cacheMisses: 0,
				hitRate: 0,
				cacheSize: 0,
				lastCleanup: Date.now(),
			};
		}
	}

	private async saveMetrics(metrics: CacheMetrics): Promise<void> {
		await this.ensureCacheDirOnce();
		try {
			await writeFile(this.metadataFile, JSON.stringify(metrics, null, 2));
		} catch (error) {
			console.error("Failed to save metrics:", error);
		}
	}

	private async updateMetrics(hit: boolean): Promise<void> {
		const metrics = await this.loadMetrics();
		metrics.totalRequests += 1;
		if (hit) {
			metrics.cacheHits += 1;
		} else {
			metrics.cacheMisses += 1;
		}
		metrics.hitRate = (metrics.cacheHits / metrics.totalRequests) * 100;

		try {
			const stats = await stat(this.cacheFile);
			metrics.cacheSize = stats.size;
		} catch (error) {
			metrics.cacheSize = 0;
		}

		await this.saveMetrics(metrics);
	}

	async getMetrics(): Promise<CacheMetrics> {
		return this.loadMetrics();
	}

	async clear(): Promise<void> {
		await this.ensureCacheDirOnce();
		if (existsSync(this.cacheFile)) await unlink(this.cacheFile);
		if (existsSync(this.metadataFile)) await unlink(this.metadataFile);
		if (existsSync(this.logFile)) await unlink(this.logFile);
		console.log("Cache cleared successfully.");
	}

	async cleanup(): Promise<{ removed: number; remaining: number }> {
		await this.ensureCacheDirOnce();
		let initialCache: LLMCache = {};
		try {
			const content = await readFile(this.cacheFile, "utf-8");
			initialCache = JSON.parse(content);
		} catch (e) {
			// File likely doesn't exist, which is fine.
		}

		const initialCount = Object.keys(initialCache).length;

		const cleanedCache = await this.loadCache();
		const remainingCount = Object.keys(cleanedCache).length;

		const removedCount = initialCount - remainingCount;

		const metrics = await this.loadMetrics();
		metrics.lastCleanup = Date.now();
		await this.saveMetrics(metrics);

		return { removed: removedCount, remaining: remainingCount };
	}

	async getProviderStats(): Promise<Record<string, { entries: number; totalSize: number }>> {
		await this.ensureCacheDirOnce();
		const cache = await this.loadCache();
		const stats: Record<string, { entries: number; totalSize: number }> = {};

		for (const key in cache) {
			const entry = cache[key];
			if (!stats[entry.provider]) {
				stats[entry.provider] = { entries: 0, totalSize: 0 };
			}
			stats[entry.provider].entries += 1;
			stats[entry.provider].totalSize += Buffer.byteLength(entry.response, 'utf-8');
		}

		return stats;
	}
}
