// Local Filesystem Crawler Service
// Handles local directory scanning and file fetching using fast-glob for maximum performance

import * as path from "node:path";
import fg from "fast-glob";
import type {
	CrawlerOptions,
	CrawlerResult,
	FetchedFile,
	LocalRepository,
} from "../types/tutorial";
import {
	calculateLocalStatistics,
	getLocalExcludePatterns,
	getLocalIncludePatterns,
	isPathSafe,
} from "../utils/local-helpers";

// Local filesystem-specific error classes for this module
class LocalPathError extends Error {
	constructor(
		public path: string,
		public reason: string,
	) {
		super(`Local path error: ${reason}`);
	}
}

class LocalFileError extends Error {
	constructor(
		public filePath: string,
		public operation: string,
	) {
		super(`Failed to ${operation} file: ${filePath}`);
	}
}

export interface LocalCrawlerOptions extends CrawlerOptions {
	followSymlinks?: boolean;
	respectGitignore?: boolean;
	scanHidden?: boolean;
}

// LocalRepository is now imported from types/tutorial.ts

export class LocalCrawler {
	private readonly DEFAULT_MAX_FILE_SIZE = 1024 * 1024; // 1MB
	private readonly DEFAULT_MAX_FILES = 100;

	/**
	 * Maps local filesystem errors to our custom error types
	 */
	private mapLocalError(
		error: unknown,
		operation: string,
		path?: string,
	): never {
		// Handle Node.js filesystem errors
		if (error && typeof error === "object" && "code" in error) {
			const fsError = error as { code: string; message?: string };

			switch (fsError.code) {
				case "ENOENT":
					throw new LocalPathError(
						path || "unknown",
						"File or directory not found",
					);
				case "EACCES":
				case "EPERM":
					throw new LocalPathError(path || "unknown", "Permission denied");
				case "EISDIR":
					throw new LocalPathError(
						path || "unknown",
						"Expected a file but found a directory",
					);
				case "ENOTDIR":
					throw new LocalPathError(
						path || "unknown",
						"Expected a directory but found a file",
					);
				default:
					throw new LocalFileError(path || "unknown", operation);
			}
		}

		// Handle standard JavaScript errors
		if (error instanceof Error) {
			if (path) {
				throw new LocalFileError(path, operation);
			} else {
				throw new LocalPathError("unknown", error.message);
			}
		}

		// Fallback for unknown error types
		throw new LocalFileError(path || "unknown", operation);
	}

	/**
	 * Crawls a local directory and returns files matching the specified options
	 */
	async crawlDirectory(
		targetPath: string,
		options: LocalCrawlerOptions = {},
	): Promise<CrawlerResult<LocalRepository>> {
		const startTime = Date.now();
		console.log(`\n🗂️  Starting local directory crawl`);
		console.log(`📍 Target path: ${targetPath}`);
		console.log(`⚙️  Options:`, {
			maxFiles: options.maxFiles || this.DEFAULT_MAX_FILES,
			maxFileSize: `${Math.round((options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE) / 1024)}KB`,
			includeTests: options.includeTests ?? false,
			respectGitignore: options.respectGitignore ?? true,
			followSymlinks: options.followSymlinks ?? false,
			includePatterns: options.includePatterns?.length || 0,
			excludePatterns: options.excludePatterns?.length || 0,
		});

		// Parse and validate the local path (simple validation without async calls)
		const absolutePath = path.resolve(targetPath);
		const relativePath = path.relative(process.cwd(), absolutePath);

		if (!isPathSafe(absolutePath)) {
			throw new LocalPathError(
				absolutePath,
				"Path is not allowed for security reasons",
			);
		}

		console.log(`🔍 Parsed path: ${absolutePath}`);
		console.log(`📁 Relative path: ${relativePath}`);

		// Get repository information
		const repository = await this.getDirectoryInfo(absolutePath);
		console.log(`📊 Directory info: ${repository.name}`);
		console.log(`🔧 Repository type: Local (non-Git analysis)`);

		// Build glob patterns
		const { includePatterns, excludePatterns } =
			this.buildGlobPatterns(options);
		console.log(`📋 Include patterns: ${includePatterns.length} patterns`);
		console.log(`🚫 Exclude patterns: ${excludePatterns.length} patterns`);

		// Crawl files from the directory
		const files = await this.crawlFiles(
			absolutePath,
			includePatterns,
			excludePatterns,
			options,
		);

		// Calculate statistics
		const statistics = calculateLocalStatistics(files, absolutePath, startTime);

		console.log(`\n✅ Crawl completed successfully!`);
		console.log(`📁 Files found: ${statistics.totalFiles}`);
		console.log(`💾 Total size: ${statistics.totalSize}`);
		console.log(`⏱️  Processing time: ${statistics.processingTime}`);
		console.log(`📊 File types:`, statistics.fileTypes);

		return {
			repository,
			files,
			statistics,
		};
	}

	/**
	 * Gets directory information
	 */
	private async getDirectoryInfo(dirPath: string): Promise<LocalRepository> {
		console.log(`🔍 Analyzing directory: ${dirPath}...`);

		const name = path.basename(dirPath);
		const relativePath = path.relative(process.cwd(), dirPath);

		// Local repositories are always treated as non-Git for analysis purposes
		// Try to detect primary language from file extensions
		let language: string | undefined;
		try {
			const codeFiles = await fg(["**/*.{js,ts,py,java,go,rs,php,rb}"], {
				cwd: dirPath,
				onlyFiles: true,
				absolute: false,
				ignore: ["node_modules/**", ".git/**"],
			});

			const langCount: Record<string, number> = {};
			codeFiles.forEach((file) => {
				const ext = path.extname(file).slice(1);
				const langMap: Record<string, string> = {
					js: "JavaScript",
					jsx: "JavaScript",
					ts: "TypeScript",
					tsx: "TypeScript",
					py: "Python",
					java: "Java",
					go: "Go",
					rs: "Rust",
					php: "PHP",
					rb: "Ruby",
				};
				const lang = langMap[ext];
				if (lang) {
					langCount[lang] = (langCount[lang] || 0) + 1;
				}
			});

			// Get the most common language
			language = Object.entries(langCount).sort(
				([, a], [, b]) => b - a,
			)[0]?.[0];
		} catch {
			// If language detection fails, leave undefined
		}

		return {
			name,
			fullPath: dirPath,
			relativePath,
			isGitRepository: false, // Always false for local repositories
			language: language || null,
			url: `file://${dirPath}`, // File URL for local directories
		};
	}

	/**
	 * Crawls files from the directory using fast-glob
	 */
	private async crawlFiles(
		dirPath: string,
		includePatterns: string[],
		excludePatterns: string[],
		options: LocalCrawlerOptions,
	): Promise<FetchedFile[]> {
		const maxFiles = options.maxFiles || this.DEFAULT_MAX_FILES;
		const maxFileSize = options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;

		console.log(`🌳 Scanning directory with fast-glob: ${dirPath}...`);

		// Use fast-glob for high-performance file discovery
		const entries = await fg(includePatterns, {
			cwd: dirPath,
			ignore: excludePatterns,
			onlyFiles: true,
			absolute: true,
			stats: true,
			followSymbolicLinks: options.followSymlinks ?? false,
			dot: options.scanHidden ?? false,
		});

		console.log(`📂 Found ${entries.length} files in directory tree`);

		// Filter files by size and apply limits
		const validFiles = entries
			.filter((entry) => {
				if (!entry.stats) return false;

				if (entry.stats.size > maxFileSize) {
					console.log(
						`⚠️  Skipping large file: ${path.relative(dirPath, entry.path)} (${Math.round(entry.stats.size / 1024)}KB)`,
					);
					return false;
				}
				return true;
			})
			.slice(0, maxFiles); // Limit total files

		console.log(
			`✅ ${validFiles.length} files match the criteria (limited to ${maxFiles})`,
		);

		if (validFiles.length === 0) {
			console.log(`⚠️  No files found matching the specified patterns`);
			return [];
		}

		// Read file contents
		const files: FetchedFile[] = [];
		let processedCount = 0;

		for (const entry of validFiles) {
			processedCount++;
			if (processedCount % 10 === 0) {
				console.log(
					`📥 Processing files: ${processedCount}/${validFiles.length}`,
				);
			}

			try {
				const content = await this.getFileContent(entry.path);
				const relativePath = path.relative(dirPath, entry.path);

				files.push({
					path: relativePath,
					content,
					size: entry.stats?.size || content.length,
				});
			} catch (error) {
				console.warn(
					`⚠️  Failed to read file ${path.relative(dirPath, entry.path)}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				);
				// Continue with other files instead of failing completely
			}
		}

		console.log(`📁 Successfully read ${files.length} files`);
		return files;
	}

	/**
	 * Reads the content of a specific file
	 */
	private async getFileContent(filePath: string): Promise<string> {
		const file = Bun.file(filePath);
		return await file.text();
	}

	/**
	 * Builds the complete glob patterns for include and exclude
	 */
	private buildGlobPatterns(options: LocalCrawlerOptions): {
		includePatterns: string[];
		excludePatterns: string[];
	} {
		// Build include patterns
		let includePatterns: string[] = [];

		if (options.includePatterns && options.includePatterns.length > 0) {
			includePatterns = options.includePatterns;
		} else {
			// Use default code file patterns
			includePatterns = getLocalIncludePatterns();
		}

		// Build exclude patterns
		const excludePatterns = [...getLocalExcludePatterns()];

		// Add test exclusions if not including tests
		if (!options.includeTests) {
			excludePatterns.push(
				"**/*.test.*",
				"**/*.spec.*",
				"**/test/**",
				"**/tests/**",
				"**/__tests__/**",
				"**/__test__/**",
				"**/spec/**",
				"**/specs/**",
			);
		}

		// Add custom exclude patterns
		if (options.excludePatterns) {
			excludePatterns.push(...options.excludePatterns);
		}

		return {
			includePatterns,
			excludePatterns,
		};
	}

	/**
	 * Validates if a path is safe (basic security check only)
	 */
	validatePath(targetPath: string): {
		isValid: boolean;
		error?: string;
	} {
		const absolutePath = path.resolve(targetPath);

		// Check security only
		if (!isPathSafe(absolutePath)) {
			return {
				isValid: false,
				error: "Path is not allowed for security reasons",
			};
		}

		return {
			isValid: true,
		};
	}
}
