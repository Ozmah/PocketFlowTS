// GitHub Repository Crawler Service
// Handles authentication, crawling, and file fetching from GitHub repositories

import { Octokit } from "@octokit/rest";
import type {
	CrawlerOptions,
	CrawlerResult,
	FetchedFile,
	GitHubRepository,
} from "../types/tutorial";
import {
	calculateStatistics,
	getDefaultExcludePatterns,
	getTestExcludePatterns,
	parseGitHubUrl,
	sanitizeUrlForLogging,
	shouldIncludeFile,
} from "../utils/github-helpers";

// GitHub-specific error classes for this module
class GitHubNotFoundError extends Error {
	constructor(public repository: string) {
		super(`Repository ${repository} not found`);
	}
}

class GitHubAuthError extends Error {
	constructor(public reason: string) {
		super(`GitHub authentication failed: ${reason}`);
	}
}

class GitHubRateLimitError extends Error {
	constructor(public resetTime?: Date) {
		super(`GitHub rate limit exceeded`);
	}
}

class GitHubAPIError extends Error {
	constructor(
		public operation: string,
		public statusCode?: number,
	) {
		super(`GitHub API error during ${operation}`);
	}
}

export class GitHubCrawler {
	private octokit: Octokit;
	private readonly DEFAULT_MAX_FILE_SIZE = 1024 * 1024; // 1MB
	private readonly DEFAULT_MAX_FILES = 100;

	constructor(githubToken: string) {
		this.octokit = new Octokit({
			auth: githubToken,
			userAgent: "PocketFlowTS-Crawler/1.0",
		});
	}

	/**
	 * Maps Octokit/GitHub API errors to our custom error types
	 */
	private mapGitHubError(
		error: unknown,
		operation: string,
		repository?: string,
	): never {
		// Handle Octokit errors with status codes
		if (error && typeof error === "object" && "status" in error) {
			const octokitError = error as { status: number; message?: string };

			switch (octokitError.status) {
				case 404:
					throw new GitHubNotFoundError(repository || "unknown");
				case 401:
					throw new GitHubAuthError("Invalid or missing GitHub token");
				case 403:
					if (octokitError.message?.includes("rate limit")) {
						throw new GitHubRateLimitError();
					}
					throw new GitHubAuthError(
						"Access forbidden - insufficient permissions",
					);
				default:
					throw new GitHubAPIError(operation, octokitError.status);
			}
		}

		// Handle standard JavaScript errors
		if (error instanceof Error) {
			throw new GitHubAPIError(operation);
		}

		// Fallback for unknown error types
		throw new GitHubAPIError(operation);
	}

	/**
	 * Crawls a GitHub repository and returns files matching the specified options
	 */
	async crawlRepository(
		repoUrl: string,
		options: CrawlerOptions = {},
	): Promise<CrawlerResult<GitHubRepository>> {
		const startTime = Date.now();
		console.log(`\n🕷️  Starting GitHub repository crawl`);
		console.log(`📍 Repository: ${sanitizeUrlForLogging(repoUrl)}`);
		console.log(`⚙️  Options:`, {
			maxFiles: options.maxFiles || this.DEFAULT_MAX_FILES,
			maxFileSize: `${Math.round((options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE) / 1024)}KB`,
			includeTests: options.includeTests ?? false,
			includePatterns: options.includePatterns?.length || 0,
			excludePatterns: options.excludePatterns?.length || 0,
		});

		// Parse and validate the GitHub URL
		const { owner, repo, branch } = parseGitHubUrl(repoUrl);
		console.log(
			`🔍 Parsed repository: ${owner}/${repo}${branch ? ` (branch: ${branch})` : ""}`,
		);

		// Get repository information
		const repository = await this.getRepositoryInfo(owner, repo);
		console.log(
			`📊 Repository info: ${repository.language || "Unknown"} - ${repository.size}KB - ${
				repository.private ? "Private" : "Public"
			}`,
		);

		// Get the target branch (use specified branch or default branch)
		const targetBranch = branch || repository.defaultBranch;
		console.log(`🌿 Using branch: ${targetBranch}`);

		// Build exclude patterns
		const excludePatterns = this.buildExcludePatterns(options);
		console.log(`📋 Exclude patterns: ${excludePatterns.length} patterns`);

		// Crawl files from the repository
		const files = await this.crawlFiles(
			owner,
			repo,
			targetBranch,
			options,
			excludePatterns,
		);

		// Calculate statistics
		const statistics = calculateStatistics(files, startTime);

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
	 * Gets repository information from GitHub API
	 */
	private async getRepositoryInfo(
		owner: string,
		repo: string,
	): Promise<GitHubRepository> {
		console.log(`🔍 Fetching repository info for ${owner}/${repo}...`);

		const { data } = await this.octokit.rest.repos
			.get({
				owner,
				repo,
			})
			.catch((error) => {
				this.mapGitHubError(
					error,
					"fetching repository info",
					`${owner}/${repo}`,
				);
			});

		return {
			name: data.name,
			fullName: data.full_name,
			defaultBranch: data.default_branch,
			isGitRepository: true as const, // Always true for GitHub repositories
			language: data.language,
			size: data.size,
			private: data.private,
			description: data.description,
			url: data.html_url,
		};
	}

	/**
	 * Crawls files from the repository using GitHub Trees API
	 */
	private async crawlFiles(
		owner: string,
		repo: string,
		branch: string,
		options: CrawlerOptions,
		excludePatterns: string[],
	): Promise<FetchedFile[]> {
		const maxFiles = options.maxFiles || this.DEFAULT_MAX_FILES;
		const maxFileSize = options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;

		console.log(`🌳 Fetching file tree for ${owner}/${repo}@${branch}...`);

		// Get the tree recursively
		const { data: tree } = await this.octokit.rest.git.getTree({
			owner,
			repo,
			tree_sha: branch,
			recursive: "true",
		});

		console.log(`📂 Found ${tree.tree.length} items in repository tree`);

		// Filter files based on patterns and limits
		const validFiles = tree.tree
			.filter((item) => {
				if (item.type !== "blob") return false;
				if (!item.path) return false;
				if (item.size && item.size > maxFileSize) {
					console.log(
						`⚠️  Skipping large file: ${item.path} (${Math.round(item.size / 1024)}KB)`,
					);
					return false;
				}

				return shouldIncludeFile(
					item.path,
					options.includePatterns,
					excludePatterns,
				);
			})
			.slice(0, maxFiles); // Limit total files

		console.log(
			`✅ ${validFiles.length} files match the criteria (limited to ${maxFiles})`,
		);

		if (validFiles.length === 0) {
			console.log(`⚠️  No files found matching the specified patterns`);
			return [];
		}

		// Fetch file contents
		const files: FetchedFile[] = [];
		let processedCount = 0;

		for (const fileInfo of validFiles) {
			processedCount++;
			if (processedCount % 10 === 0) {
				console.log(
					`📥 Processing files: ${processedCount}/${validFiles.length}`,
				);
			}

			if (!fileInfo.path || !fileInfo.sha) {
				console.warn(`⚠️ Missing path or sha for file, skipping`);
				continue;
			}

			try {
				const content = await this.getFileContent(owner, repo, fileInfo.sha);

				files.push({
					path: fileInfo.path,
					content,
					size: fileInfo.size || content.length,
				});
			} catch (error) {
				console.warn(
					`⚠️  Failed to fetch file ${fileInfo.path}: ${
						error instanceof Error ? error.message : "Unknown error"
					}`,
				);
				// Continue with other files instead of failing completely
			}
		}

		console.log(`📁 Successfully fetched ${files.length} files`);
		return files;
	}

	/**
	 * Gets the content of a specific file from GitHub
	 */
	private async getFileContent(
		owner: string,
		repo: string,
		sha: string,
	): Promise<string> {
		const { data } = await this.octokit.rest.git.getBlob({
			owner,
			repo,
			file_sha: sha,
		});

		if (data.encoding === "base64") {
			return Buffer.from(data.content, "base64").toString("utf-8");
		} else {
			return data.content;
		}
	}

	/**
	 * Builds the complete list of exclude patterns
	 */
	private buildExcludePatterns(options: CrawlerOptions): string[] {
		const patterns = [...getDefaultExcludePatterns()];

		// Add test exclusions if not including tests
		if (!options.includeTests) {
			patterns.push(...getTestExcludePatterns());
		}

		// Add custom exclude patterns
		if (options.excludePatterns) {
			patterns.push(...options.excludePatterns);
		}

		return patterns;
	}

	/**
	 * Checks the current rate limit status
	 */
	async checkRateLimit(): Promise<{
		remaining: number;
		reset: Date;
		limit: number;
	}> {
		const { data } = await this.octokit.rest.rateLimit.get();
		const coreLimit = data.resources.core;

		return {
			remaining: coreLimit.remaining,
			reset: new Date(coreLimit.reset * 1000),
			limit: coreLimit.limit,
		};
	}

	/**
	 * Tests the GitHub token and API connection
	 */
	async testConnection(): Promise<{
		success: boolean;
		user?: string;
		scopes?: string[];
	}> {
		const { data: user } = await this.octokit.rest.users.getAuthenticated();

		// Get token scopes from the response headers if available
		const rateLimit = await this.checkRateLimit();

		console.log(`✅ GitHub API connection successful`);
		console.log(`👤 Authenticated as: ${user.login}`);
		console.log(`🔢 Rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);

		return {
			success: true,
			user: user.login,
		};
	}
}
