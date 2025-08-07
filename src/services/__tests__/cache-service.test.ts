import { rm } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { CacheService } from "../cache-service";

const CACHE_DIR = ".cache";

describe("CacheService", () => {
	let cacheService: CacheService;

	// Setup: Get a fresh instance and clear any previous cache before tests start
	beforeAll(async () => {
		cacheService = CacheService.getInstance();
		await cacheService.clear();
	});

	// Teardown: Clean up the cache directory after all tests are done
	afterAll(async () => {
		await cacheService.clear();
		// Optional: remove the .cache directory itself
		// await rm(join(process.cwd(), CACHE_DIR), { recursive: true, force: true });
	});

	describe("generateCacheKey", () => {
		it("should generate a consistent SHA-256 hash", () => {
			const prompt = "test prompt";
			const provider = "test-provider";
			const options = {};
			const key1 = cacheService.generateCacheKey(prompt, provider, options);
			const key2 = cacheService.generateCacheKey(prompt, provider, options);
			expect(key1).toBe(key2);
			expect(key1).toMatch(/^[a-f0-9]{64}$/);
		});

		it("should generate different hashes for different prompts", () => {
			const prompt1 = "prompt 1";
			const prompt2 = "prompt 2";
			const provider = "test-provider";
			const options = {};
			const key1 = cacheService.generateCacheKey(prompt1, provider, options);
			const key2 = cacheService.generateCacheKey(prompt2, provider, options);
			expect(key1).not.toBe(key2);
		});

		it("should generate different hashes for different providers", () => {
			const prompt = "test prompt";
			const provider1 = "provider-1";
			const provider2 = "provider-2";
			const options = {};
			const key1 = cacheService.generateCacheKey(prompt, provider1, options);
			const key2 = cacheService.generateCacheKey(prompt, provider2, options);
			expect(key1).not.toBe(key2);
		});

		it("should include schema definition in the hash", () => {
			const prompt = "test prompt";
			const provider = "test-provider";
			const schema1 = z.object({ name: z.string() });
			const schema2 = z.object({ age: z.number() });

			const key1 = cacheService.generateCacheKey(prompt, provider, { schema: schema1 });
			const key2 = cacheService.generateCacheKey(prompt, provider, { schema: schema2 });
			const key3 = cacheService.generateCacheKey(prompt, provider, {});

			expect(key1).not.toBe(key2);
			expect(key1).not.toBe(key3);
			expect(key2).not.toBe(key3);
		});
	});

	describe("Cache Operations (get/set)", () => {
		// Clear cache before each test in this block
		beforeEach(async () => {
			await cacheService.clear();
		});

		it("should set and get a cache entry", async () => {
			const prompt = "test get/set";
			const response = "test response";
			const provider = "test-provider";

			await cacheService.set(prompt, response, provider, {});
			const cachedResponse = await cacheService.get(prompt, provider, {});

			expect(cachedResponse).toBe(response);
		});

		it("should return null for a cache miss", async () => {
			const prompt = "non-existent prompt";
			const provider = "test-provider";
			const cachedResponse = await cacheService.get(prompt, provider, {});
			expect(cachedResponse).toBeNull();
		});

		it("should respect useCache: false option", async () => {
			const prompt = "test useCache:false";
			const response = "response should not be cached";
			const provider = "test-provider";

			await cacheService.set(prompt, response, provider, {});
			const cachedResponse = await cacheService.get(prompt, provider, { useCache: false });
			expect(cachedResponse).toBeNull();
		});

		it("should handle TTL expiration", async () => {
			const prompt = "test ttl";
			const response = "expired response";
			const provider = "test-provider";
			const ttl = 100; // 100 ms

			await cacheService.set(prompt, response, provider, { ttl });

			// Wait for TTL to expire
			await new Promise(resolve => setTimeout(resolve, ttl + 50));

			const cachedResponse = await cacheService.get(prompt, provider, {});
			expect(cachedResponse).toBeNull();
		});

		it("should validate schema on get", async () => {
			const prompt = "test schema validation";
			const provider = "test-provider";
			const schema1 = z.object({ name: z.string() });
			const schema2 = z.object({ name: z.string(), age: z.number() });
			const response = JSON.stringify({ name: "Jules" });

			// Set with schema1
			await cacheService.set(prompt, response, provider, { schema: schema1 });

			// Get with schema1 should succeed
			const res1 = await cacheService.get(prompt, provider, { schema: schema1 });
			expect(JSON.parse(res1!)).toEqual({ name: "Jules" });

			// Get with schema2 should fail (return null) because schema is different
			const res2 = await cacheService.get(prompt, provider, { schema: schema2 });
			expect(res2).toBeNull();
		});
	});

	describe("Metrics Tracking", () => {
		beforeEach(async () => {
			await cacheService.clear();
		});

		it("should track hits and misses correctly", async () => {
			const promptHit = "prompt hit";
			const promptMiss = "prompt miss";
			const provider = "metrics-provider";

			await cacheService.set(promptHit, "response", provider, {});

			await cacheService.get(promptHit, provider, {}); // Hit
			await cacheService.get(promptMiss, provider, {}); // Miss
			await cacheService.get(promptHit, provider, {}); // Hit

			const metrics = await cacheService.getMetrics();
			expect(metrics.totalRequests).toBe(3);
			expect(metrics.cacheHits).toBe(2);
			expect(metrics.cacheMisses).toBe(1);
			expect(metrics.hitRate).toBeCloseTo(66.67);
		});
	});

	describe("Management Operations", () => {
		beforeEach(async () => {
			await cacheService.clear();
		});

		it("should clear the cache", async () => {
			await cacheService.set("p1", "r1", "prov", {});
			await cacheService.clear();
			const res = await cacheService.get("p1", "prov", {});
			expect(res).toBeNull();
			const metrics = await cacheService.getMetrics();
			// clear() also clears metrics file, but the subsequent get() call will increment it.
			expect(metrics.totalRequests).toBe(1);
		});

		it("should clean up expired entries and report correctly", async () => {
			await cacheService.set("p-exp", "r-exp", "prov", { ttl: 10 });
			await cacheService.set("p-valid", "r-valid", "prov", { ttl: 100000 });

			await new Promise(resolve => setTimeout(resolve, 50));

			const { removed, remaining } = await cacheService.cleanup();
			expect(removed).toBe(1);
			expect(remaining).toBe(1);
		});

		it("should get provider stats", async () => {
			await cacheService.clear();
			await cacheService.set("p1", "res1", "gemini", {});
			await cacheService.set("p2", "res2", "gemini", {});
			await cacheService.set("p3", "res3", "claude", {});

			const stats = await cacheService.getProviderStats();
			expect(stats.gemini.entries).toBe(2);
			expect(stats.claude.entries).toBe(1);
			expect(stats.gemini.totalSize).toBe(Buffer.byteLength("res1", 'utf-8') + Buffer.byteLength("res2", 'utf-8'));
		});
	});
});
