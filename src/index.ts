// Core dependencies for AI-powered tutorial generation API
import { google } from "@ai-sdk/google";
import { swagger } from "@elysiajs/swagger";
import { env } from "@yolk-oss/elysia-env";
import { generateText } from "ai";
import { Elysia, t } from "elysia";
import JSZip from "jszip";

// Service layer imports
import { GitHubCrawler } from "./services/github-crawler";
import { LocalCrawler } from "./services/local-crawler";
import { TutorialPipeline } from "./services/pipeline";

// Type definitions and utilities
import {
	type CrawlerResult,
	type GitHubRepository,
	isGitHubRepository,
	isLocalRepository,
	type LocalRepository,
} from "./types/tutorial";
import { isValidGitHubUrl } from "./utils/github-helpers";

// Custom error classes for structured error handling

// Thrown when required environment variables are missing
class ConfigurationError extends Error {
	constructor(public configKey: string) {
		super(`Configuration missing: ${configKey}`);
	}
}

// Thrown when file crawling operations fail
class CrawlerError extends Error {
	constructor(
		public source: string,
		public reason: string,
	) {
		super(`Crawler failed for ${source}: ${reason}`);
	}
}

// Thrown when request validation fails
class ValidationError extends Error {
	constructor(
		public field: string,
		public issue: string,
	) {
		super(`Validation failed for ${field}: ${issue}`);
	}
}

// GitHub API specific error classes

// Thrown when a GitHub repository cannot be found or accessed
class GitHubNotFoundError extends Error {
	constructor(public repository: string) {
		super(`Repository ${repository} not found`);
	}
}

// Thrown when GitHub authentication fails
class GitHubAuthError extends Error {
	constructor(public reason: string) {
		super(`GitHub authentication failed: ${reason}`);
	}
}

// Thrown when GitHub API rate limit is exceeded
class GitHubRateLimitError extends Error {
	constructor(public resetTime?: Date) {
		super(`GitHub rate limit exceeded`);
	}
}

// Thrown when GitHub API operations fail
class GitHubAPIError extends Error {
	constructor(
		public operation: string,
		public statusCode?: number,
	) {
		super(`GitHub API error during ${operation}`);
	}
}

// Thrown when local file system path validation fails
class LocalPathError extends Error {
	constructor(
		public path: string,
		public reason: string,
	) {
		super(`Local path error: ${reason}`);
	}
}

// Thrown when local file operations fail
class LocalFileError extends Error {
	constructor(
		public filePath: string,
		public operation: string,
	) {
		super(`Failed to ${operation} file: ${filePath}`);
	}
}

// Environment variables validation plugin
const envPlugin = env({
	GOOGLE_GENERATIVE_AI_API_KEY: t.Optional(t.String()),
	CLAUDE_API_KEY: t.Optional(t.String()),
	OPENAI_API_KEY: t.Optional(t.String()),
	GITHUB_TOKEN: t.String(),
	PORT: t.Number({ default: 3000 }),
	NODE_ENV: t.Union([t.Literal("development"), t.Literal("production")], {
		default: "development",
	}),
});

// Main application instance with middleware chain
const app = new Elysia()
	.use(
		swagger({
			documentation: {
				info: {
					title: "PocketFlowTS API",
					description:
						"Advanced tutorial generation API that analyzes GitHub repositories and local directories to create educational content using AI. Features intelligent code crawling, abstraction identification, and structured learning materials generation.",
					version: "1.0.0",
					contact: {
						name: "PocketFlowTS Team",
						url: "https://github.com/your-org/pocketflowts",
					},
				},
				tags: [
					{
						name: "Tutorial Generation",
						description:
							"Main tutorial generation endpoints with AI-powered analysis",
					},
					{
						name: "AI Testing",
						description: "AI model testing and validation endpoints",
					},
					{
						name: "Crawlers",
						description: "Code repository and directory crawling utilities",
					},
					{
						name: "Health",
						description: "Service health and status monitoring",
					},
					{
						name: "Development",
						description: "Development and testing sandbox endpoints",
					},
				],
				servers: [
					{
						url: "http://localhost:3000",
						description: "Local development server",
					},
				],
			},
		}),
	)
	.use(envPlugin)
	// Register custom error types for structured error handling
	.error({
		ConfigurationError,
		CrawlerError,
		ValidationError,
		GitHubNotFoundError,
		GitHubAuthError,
		GitHubRateLimitError,
		GitHubAPIError,
		LocalPathError,
		LocalFileError,
	})
	// Global error handler with specific response formatting per error type
	.onError(({ error, code, set, request }) => {
		const isDocsRoute =
			request.url.includes("/swagger") || request.url.includes("/openapi");
		if (!isDocsRoute) {
			console.error(`Error ${code}:`, error);
		}

		switch (code) {
			case "ConfigurationError":
				set.status = 400;
				return {
					error: "Configuration missing",
					configKey: error.configKey,
					message: "Please check your environment variables",
				};

			case "CrawlerError":
				set.status = 400;
				return {
					error: "Crawler failed",
					source: error.source,
					reason: error.reason,
				};

			case "ValidationError":
				set.status = 422;
				return {
					error: "Validation failed",
					field: error.field,
					issue: error.issue,
				};

			case "GitHubNotFoundError":
				set.status = 404;
				return {
					error: "Repository not found",
					repository: error.repository,
					message:
						"Check if the repository exists and your token has access to it",
				};

			case "GitHubAuthError":
				set.status = 401;
				return {
					error: "GitHub authentication failed",
					reason: error.reason,
					message:
						"Check if your GITHUB_TOKEN is valid and has necessary permissions",
				};

			case "GitHubRateLimitError":
				set.status = 429;
				return {
					error: "GitHub rate limit exceeded",
					message: "Please wait before trying again",
					resetTime: error.resetTime,
				};

			case "GitHubAPIError":
				set.status = error.statusCode || 500;
				return {
					error: "GitHub API error",
					operation: error.operation,
					statusCode: error.statusCode,
					message: `Failed during ${error.operation}`,
				};

			case "LocalPathError":
				set.status = 400;
				return {
					error: "Local path error",
					path: error.path,
					reason: error.reason,
					message: "Check if the path exists and is accessible",
				};

			case "LocalFileError":
				set.status = 500;
				return {
					error: "Local file operation failed",
					filePath: error.filePath,
					operation: error.operation,
					message: `Failed to ${error.operation} file`,
				};

			case "VALIDATION":
				set.status = 422;
				return {
					error: "Validation failed",
					details: error.all || error.message,
				};

			case "NOT_FOUND":
				set.status = 404;
				return { error: "Endpoint not found" };

			case "PARSE":
				set.status = 400;
				return { error: "Invalid request body format" };

			case "INTERNAL_SERVER_ERROR":
				set.status = 500;
				return {
					error: "Internal server error",
					message:
						process.env.NODE_ENV === "development"
							? error.message
							: "Server error",
				};

			case "INVALID_COOKIE_SIGNATURE":
				set.status = 400;
				return { error: "Invalid cookie signature" };

			case "INVALID_FILE_TYPE":
				set.status = 400;
				return { error: "Invalid file type" };

			default:
				if (typeof code === "number") {
					set.status = code;
					return {
						error: error instanceof Error ? error.message : "Request failed",
					};
				}

				set.status = 500;
				return {
					error: "Unknown error",
					message:
						process.env.NODE_ENV === "development" && error instanceof Error
							? error.message
							: "Server error",
				};
		}
	})
	.get("/", () => "🚀 PocketFlowTS is running!", {
		detail: {
			summary: "Health check endpoint",
			description:
				"Simple health check that confirms the PocketFlowTS service is running and responsive. Returns a welcome message.",
			tags: ["Health"],
		},
	})
	// Main tutorial generation endpoint
	// Processes GitHub repositories or local directories to create educational content
	.post(
		"/generate-tutorial",
		async ({ body, env }) => {
			console.log(
				"🎯 Debug - Received tutorial generation request:",
				JSON.stringify(body, null, 2),
			);

			// Validate required AI API key
			if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
				throw new ConfigurationError("GOOGLE_GENERATIVE_AI_API_KEY");
			}

			// Auto-detect source type based on URL format
			const isGitHubUrl = isValidGitHubUrl(body.source);
			const sourceType = isGitHubUrl ? "github" : "local";

			console.log(`\n🚀 Starting PocketFlowTS Tutorial Generation`);
			console.log(`🎯 Detected source type: ${sourceType.toUpperCase()}`);
			console.log(`📍 Source: ${body.source}`);
			console.log("⚙️ Configuration:", {
				sourceType,
				language: body.language || "english",
				maxAbstractions: body.maxAbstractions || 8,
				includeTests: body.includeTests ?? true,
			});

			// Initialize crawler result variable
			let crawlerResult:
				| CrawlerResult<GitHubRepository>
				| CrawlerResult<LocalRepository>;

			if (sourceType === "github") {
				// Handle GitHub repository crawling
				if (!env.GITHUB_TOKEN) {
					throw new ConfigurationError("GITHUB_TOKEN");
				}

				console.log("🕷️ Initializing GitHub crawler...");
				const githubCrawler = new GitHubCrawler(env.GITHUB_TOKEN);

				// Verify API connection before proceeding
				await githubCrawler.testConnection();

				// Check rate limit to avoid quota issues
				const rateLimit = await githubCrawler.checkRateLimit();
				if (rateLimit.remaining < 10) {
					console.warn(
						`⚠️ Low GitHub rate limit: ${rateLimit.remaining} requests remaining`,
					);
				}

				console.log(`💻 GitHub rate limit: ${rateLimit.remaining} requests remaining`);

				// Execute crawl operation with specified options
				crawlerResult = await githubCrawler.crawlRepository(body.source, {
					includePatterns: body.includePatterns,
					excludePatterns: body.excludePatterns,
					maxFileSize: body.maxFileSize || 1024 * 1024,
					maxFiles: body.maxFiles || 100,
					includeTests: body.includeTests ?? true,
				});
			} else {
				// Handle local directory crawling
				console.log("🗂️ Initializing local crawler...");
				const localCrawler = new LocalCrawler();

				// Validate path for security compliance
				const pathValidation = localCrawler.validatePath(body.source);
				if (!pathValidation.isValid) {
					throw new ValidationError(
						"source",
						pathValidation.error || "Path validation failed",
					);
				}

				// Execute local directory scan with specified options
				crawlerResult = await localCrawler.crawlDirectory(body.source, {
					includePatterns: body.includePatterns,
					excludePatterns: body.excludePatterns,
					maxFileSize: body.maxFileSize || 1024 * 1024,
					maxFiles: body.maxFiles || 100,
					includeTests: body.includeTests ?? true,
					respectGitignore: body.respectGitignore ?? true,
					followSymlinks: body.followSymlinks ?? false,
				});
			}

			// Log crawling results
			console.log(`\n📊 Crawling Results Summary:`);
			console.log(`📂 Repository/Directory: ${crawlerResult.repository.name}`);
			console.log(
				`💻 Language: ${crawlerResult.repository.language || "Unknown"}`,
			);
			console.log(`📁 Files crawled: ${crawlerResult.statistics.totalFiles}`);
			console.log(`💾 Total size: ${crawlerResult.statistics.totalSize}`);

			// Validate crawling results
			if (crawlerResult.files.length === 0) {
				throw new CrawlerError(
					body.source,
					"No files found matching the specified criteria. Please check your include/exclude patterns.",
				);
			}

			// Initialize AI tutorial generation pipeline
			const pipeline = new TutorialPipeline();

			// Prepare pipeline configuration object
			const pipelineConfig = {
				language: body.language || "english",
				maxAbstractions: body.maxAbstractions || 8,
				includeTests: body.includeTests ?? true,
				files: crawlerResult.files,
				repository: crawlerResult.repository,
				statistics: crawlerResult.statistics,
			};

			// Execute tutorial generation pipeline
			const startTime = Date.now();
			let tutorialGenerated = false;
			let finalResult = null;

			// Process pipeline updates and track generation progress
			for await (const update of pipeline.generateTutorial(pipelineConfig)) {
				// Handle pipeline state updates
				switch (update.type) {
					case "step_start":
						console.log(`\n🔄 Step ${update.step?.step}: ${update.step?.name}`);
						console.log(`   Status: ${update.step?.status}`);
						console.log(`   Message: ${update.step?.message}`);
						break;

					case "step_progress":
						console.log(
							`   📊 Progress: ${JSON.stringify(update.data, null, 2)}`,
						);
						break;

					case "step_complete":
						console.log(
							`✅ Step ${update.step?.step} completed: ${update.step?.message}`,
						);
						if (update.step?.tokens) {
							console.log(`   🎯 Tokens used: ${update.step.tokens}`);
						}
						if (update.data) {
							console.log(
								`   📋 Result: ${JSON.stringify(update.data, null, 2)}`,
							);
						}
						break;

					case "step_error":
						console.error(
							`❌ Step ${update.step?.step} failed: ${update.error}`,
						);
						break;

					case "final_result":
						if (
							update.data &&
							typeof update.data === "object" &&
							"success" in update.data &&
							update.data.success
						) {
							const duration = ((Date.now() - startTime) / 1000).toFixed(2);
							console.log(`\n🎉 Tutorial Generation Completed Successfully!`);
							console.log(`⏱️  Total time: ${duration}s`);

							// Store pipeline output with type assertion for property access
							finalResult = update.data as Record<string, unknown>;
							console.log(`📊 Statistics:`, finalResult.statistics);
							console.log(
								`📁 Files generated: ${Array.isArray(finalResult.tutorialFiles) ? finalResult.tutorialFiles.length : 0}`,
							);
							tutorialGenerated = true;
						}
						break;
				}
			}

			// Generate and return ZIP file directly
			if (tutorialGenerated && finalResult) {
				// Extract tutorial files from pipeline result
				const tutorialFiles = Array.isArray(finalResult.tutorialFiles)
					? (finalResult.tutorialFiles as Array<{
							filename: string;
							content: string;
							type: "markdown" | "index";
						}>)
					: [];

				if (tutorialFiles.length === 0) {
					throw new Error("No tutorial files were generated");
				}

				// Create ZIP file with JSZip
				console.log("📦 Creating ZIP file with tutorial files...");
				const zip = new JSZip();

				// Add each tutorial file to the ZIP
				tutorialFiles.forEach((file) => {
					zip.file(file.filename, file.content);
				});

				// Generate ZIP buffer
				const zipBuffer = await zip.generateAsync({
					type: "uint8array",
					compression: "DEFLATE",
					compressionOptions: { level: 6 },
				});

				const zipFilename = `${crawlerResult.repository.name}_tutorial.zip`;

				console.log(
					`✅ ZIP generated successfully: ${zipFilename} (${tutorialFiles.length} files, ${zipBuffer.length} bytes)`,
				);

				// Return ZIP file directly as download
				return new Response(zipBuffer, {
					headers: {
						"Content-Type": "application/zip",
						"Content-Disposition": `attachment; filename="${zipFilename}"`,
						"Content-Length": zipBuffer.length.toString(),
					},
				});
			} else {
				throw new Error("Tutorial generation did not complete successfully");
			}
		},
		{
			detail: {
				summary: "Generate AI-powered tutorial from source code",
				description:
					"Analyzes GitHub repositories or local directories to generate the tutorial. Uses AI to identify abstractions, analyze relationships, and create structured materials with code examples and explanations. Supports automatic source type detection (GitHub vs local).",
				tags: ["Tutorial Generation"],
			},
			body: t.Object({
				source: t.String({
					minLength: 1,
					description:
						"GitHub repository URL (https://github.com/owner/repo) or local directory path. Auto-detected based on format.",
					error: "Source (GitHub URL or local path) is required",
				}),
				language: t.Optional(
					t.String({
						default: "english",
						description:
							"Output language for the generated tutorial (default: english)",
					}),
				),
				maxAbstractions: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 15,
						default: 8,
						description:
							"Maximum number of code abstractions to identify and explain (1-15)",
					}),
				),
				includeTests: t.Optional(
					t.Boolean({
						default: true,
						description:
							"Whether to include test files in the analysis and tutorial generation",
					}),
				),
				// Crawler options
				includePatterns: t.Optional(
					t.Array(
						t.String({ description: "Glob pattern for files to include" }),
						{
							description:
								"File patterns to include in analysis (e.g., ['**/*.js', '**/*.ts'])",
						},
					),
				),
				excludePatterns: t.Optional(
					t.Array(
						t.String({ description: "Glob pattern for files to exclude" }),
						{
							description:
								"File patterns to exclude from analysis (e.g., ['**/node_modules/**', '**/dist/**'])",
						},
					),
				),
				maxFileSize: t.Optional(
					t.Number({
						minimum: 1024,
						maximum: 10 * 1024 * 1024,
						default: 1024 * 1024,
						description:
							"Maximum file size in bytes to process (1KB - 10MB, default: 1MB)",
					}),
				),
				maxFiles: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 500,
						default: 100,
						description:
							"Maximum number of files to process (1-500, default: 100)",
					}),
				),
				// Local-specific options (ignored for GitHub)
				respectGitignore: t.Optional(
					t.Boolean({
						default: true,
						description:
							"Whether to respect .gitignore files when crawling local directories",
					}),
				),
				followSymlinks: t.Optional(
					t.Boolean({
						default: false,
						description:
							"Whether to follow symbolic links when crawling local directories",
					}),
				),
			}),
		},
	)
	.post(
		"/test-ai",
		async ({ body, env }) => {
			if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
				throw new ConfigurationError("GOOGLE_GENERATIVE_AI_API_KEY");
			}

			const result = await generateText({
				model: google("gemini-2.5-pro"),
				prompt: body.prompt,
			});

			return {
				success: true,
				response: result.text,
				usage: result.usage,
			};
		},
		{
			detail: {
				summary: "Test AI model integration",
				description:
					"Tests the AI model connection and generates text based on a provided prompt. Useful for validating API keys and model availability. Uses Google Gemini 2.5-pro model.",
				tags: ["AI Testing"],
			},
			body: t.Object({
				prompt: t.String({
					minLength: 1,
					maxLength: 4000,
					description:
						"Text prompt to send to the AI model (1-4000 characters)",
				}),
			}),
		},
	)
	.post(
		"/sandbox-flow",
		async ({ body, env }) => {
			if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
				throw new ConfigurationError("GOOGLE_GENERATIVE_AI_API_KEY");
			}
			console.log("\n🚀 Starting PocketFlowTS Tutorial Generation Pipeline");
			console.log("⚙️  Configuration:", {
				language: body.language || "english",
				maxAbstractions: body.maxAbstractions || 8,
				includeTests: body.includeTests ?? true,
			});

			const pipeline = new TutorialPipeline();

			const startTime = Date.now();
			let tutorialGenerated = false;

			for await (const update of pipeline.generateTutorial(body)) {
				switch (update.type) {
					case "step_start":
						console.log(`\n🔄 Step ${update.step?.step}: ${update.step?.name}`);
						console.log(`   Status: ${update.step?.status}`);
						console.log(`   Message: ${update.step?.message}`);
						break;

					case "step_progress":
						console.log(
							`   📊 Progress: ${JSON.stringify(update.data, null, 2)}`,
						);
						break;

					case "step_complete":
						console.log(
							`✅ Step ${update.step?.step} completed: ${update.step?.message}`,
						);
						if (update.step?.tokens) {
							console.log(`   🎯 Tokens used: ${update.step.tokens}`);
						}
						if (update.data) {
							console.log(
								`   📋 Result: ${JSON.stringify(update.data, null, 2)}`,
							);
						}
						break;

					case "step_error":
						console.error(
							`❌ Step ${update.step?.step} failed: ${update.error}`,
						);
						break;

					case "final_result":
						if (
							update.data &&
							typeof update.data === "object" &&
							"success" in update.data &&
							update.data.success
						) {
							const duration = ((Date.now() - startTime) / 1000).toFixed(2);
							console.log(`\n🎉 Tutorial Generation Completed Successfully!`);
							console.log(`⏱️  Total time: ${duration}s`);

							const finalData = update.data as Record<string, unknown>;
							console.log(`📊 Statistics:`, finalData.statistics);
							console.log(
								`📁 Files generated: ${Array.isArray(finalData.tutorialFiles) ? finalData.tutorialFiles.length : 0}`,
							);
							tutorialGenerated = true;
						}
						break;
				}
			}

			if (tutorialGenerated) {
				return {
					success: true,
					message:
						"Tutorial generated successfully! Check console for details.",
				};
			} else {
				throw new Error("Tutorial generation did not complete successfully");
			}
		},
		{
			detail: {
				summary: "Test tutorial generation pipeline",
				description:
					"Tests the tutorial generation pipeline with mock data. Useful for development and debugging the AI pipeline without requiring actual source code input. Logs all pipeline steps to console.",
				tags: ["Development"],
			},
			body: t.Object({
				language: t.Optional(
					t.String({
						default: "english",
						description: "Output language for the generated tutorial",
					}),
				),
				maxAbstractions: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 15,
						default: 8,
						description: "Maximum number of code abstractions to identify",
					}),
				),
				includeTests: t.Optional(
					t.Boolean({
						default: true,
						description: "Whether to include test files in analysis",
					}),
				),
			}),
			response: {
				200: t.Object({
					success: t.Boolean(),
					message: t.String(),
				}),
				400: t.Object({
					error: t.String(),
				}),
				500: t.Object({
					success: t.Boolean(),
					error: t.String(),
					message: t.String(),
					details: t.Optional(t.String()),
				}),
			},
		},
	)
	.post(
		"/sandbox-unified-crawler",
		async ({ body, env }) => {
			console.log("🔄 Debug - Received body:", JSON.stringify(body, null, 2));

			// Detect source type automatically
			const isGitHubUrl = isValidGitHubUrl(body.source);
			const sourceType = isGitHubUrl ? "github" : "local";

			console.log(`\n🔄 Starting Unified Crawler Sandbox`);
			console.log(`🎯 Detected source type: ${sourceType.toUpperCase()}`);
			console.log(`📍 Source: ${body.source}`);
			console.log("⚙️ Configuration:", {
				sourceType,
				maxFiles: body.maxFiles || 100,
				maxFileSize: body.maxFileSize
					? `${Math.round(body.maxFileSize / 1024)}KB`
					: "1MB",
				includeTests: body.includeTests ?? false,
				includePatterns: body.includePatterns?.length || 0,
				excludePatterns: body.excludePatterns?.length || 0,
			});

			let result:
				| CrawlerResult<GitHubRepository>
				| CrawlerResult<LocalRepository>;

			if (sourceType === "github") {
				// GitHub Repository Crawling
				if (!env.GITHUB_TOKEN) {
					throw new ConfigurationError("GITHUB_TOKEN");
				}

				console.log("🕷️ Initializing GitHub crawler...");
				const githubCrawler = new GitHubCrawler(env.GITHUB_TOKEN);

				// Test connection
				await githubCrawler.testConnection();

				// Check rate limit
				const rateLimit = await githubCrawler.checkRateLimit();
				if (rateLimit.remaining < 10) {
					console.warn(
						`⚠️ Low GitHub rate limit: ${rateLimit.remaining} requests remaining`,
					);
				}

				// Perform GitHub crawl
				result = await githubCrawler.crawlRepository(body.source, {
					includePatterns: body.includePatterns,
					excludePatterns: body.excludePatterns,
					maxFileSize: body.maxFileSize,
					maxFiles: body.maxFiles,
					includeTests: body.includeTests,
				});
			} else {
				// Local Directory Crawling
				console.log("🗂️ Initializing local crawler...");
				const localCrawler = new LocalCrawler();

				// Validate path security
				const pathValidation = localCrawler.validatePath(body.source);
				if (!pathValidation.isValid) {
					throw new ValidationError(
						"source",
						pathValidation.error || "Path validation failed",
					);
				}

				// Perform local crawl
				result = await localCrawler.crawlDirectory(body.source, {
					includePatterns: body.includePatterns,
					excludePatterns: body.excludePatterns,
					maxFileSize: body.maxFileSize,
					maxFiles: body.maxFiles,
					includeTests: body.includeTests,
					respectGitignore: body.respectGitignore ?? true,
					followSymlinks: body.followSymlinks ?? false,
				});
			}

			// Unified logging regardless of source type
			console.log(`\n📊 Unified Crawling Results Summary:`);
			console.log(`🎯 Source type: ${sourceType.toUpperCase()}`);
			console.log(`📂 Repository/Directory: ${result.repository.name}`);
			console.log(`💻 Language: ${result.repository.language || "Unknown"}`);
			console.log(`📁 Files crawled: ${result.statistics.totalFiles}`);
			console.log(`💾 Total size: ${result.statistics.totalSize}`);
			console.log(`⏱️ Processing time: ${result.statistics.processingTime}`);

			if (isGitHubRepository(result.repository)) {
				console.log(`🌿 Branch: ${result.repository.defaultBranch}`);
				console.log(`🔒 Private: ${result.repository.private ? "Yes" : "No"}`);
			} else if (isLocalRepository(result.repository)) {
				console.log(`📍 Path: ${result.repository.fullPath}`);
				console.log(
					`🔧 Git repository: ${result.repository.isGitRepository ? "Yes" : "No"}`,
				);
			}

			if (Object.keys(result.statistics.fileTypes).length > 0) {
				console.log("📋 File types found:");
				Object.entries(result.statistics.fileTypes)
					.sort(([, a], [, b]) => b - a)
					.slice(0, 10)
					.forEach(([ext, count]) => {
						console.log(`   ${ext || "no-ext"}: ${count} files`);
					});
			}

			// Sample files for verification
			if (result.files.length > 0) {
				console.log("\n📄 Sample files (first 3):");
				result.files.slice(0, 3).forEach((file, index) => {
					const preview = file.content.slice(0, 100).replace(/\n/g, " ");
					console.log(`   ${index + 1}. ${file.path} (${file.size} bytes)`);
					console.log(
						`      Preview: ${preview}${file.content.length > 100 ? "..." : ""}`,
					);
				});
			}

			// Return unified response structure
			return {
				success: true,
				sourceType,
				message: `${sourceType === "github" ? "GitHub repository" : "Local directory"} crawled successfully! Check console for detailed results.`,
				repository: {
					name: result.repository.name,
					language: result.repository.language,
					...(isGitHubRepository(result.repository)
						? {
								fullName: result.repository.fullName,
								defaultBranch: result.repository.defaultBranch,
								private: result.repository.private,
								url: result.repository.url,
							}
						: {
								fullPath: result.repository.fullPath,
								relativePath: result.repository.relativePath,
								isGitRepository: result.repository.isGitRepository,
								url: result.repository.url,
							}),
				},
				files: result.files.map((file) => ({
					path: file.path,
					size: file.size,
					type: file.path.split(".").pop() || "unknown",
				})),
				statistics: result.statistics,
			};
		},
		{
			detail: {
				summary: "Test unified source crawler",
				description:
					"Crawls either GitHub repositories or local directories based on automatic source type detection. Combines both GitHub and local crawler functionality into a single endpoint. Useful for testing the unified crawling approach with automatic fallback.",
				tags: ["Crawlers"],
			},
			body: t.Object({
				source: t.String({
					minLength: 1,
					description:
						"GitHub repository URL (https://github.com/owner/repo) or local directory path. Type auto-detected based on format.",
					error: "Source (GitHub URL or local path) is required",
				}),
				includePatterns: t.Optional(
					t.Array(t.String({ description: "File pattern to include" }), {
						description:
							"Glob patterns for files to include (e.g., ['**/*.js', '**/*.ts'])",
					}),
				),
				excludePatterns: t.Optional(
					t.Array(t.String({ description: "File pattern to exclude" }), {
						description:
							"Glob patterns for files to exclude (e.g., ['**/node_modules/**'])",
					}),
				),
				maxFileSize: t.Optional(
					t.Number({
						minimum: 1024,
						maximum: 10 * 1024 * 1024,
						default: 1024 * 1024,
						description: "Maximum file size in bytes to process (1KB - 10MB)",
					}),
				),
				maxFiles: t.Optional(
					t.Number({
						minimum: 1,
						maximum: 500,
						default: 100,
						description: "Maximum number of files to process (1-500)",
					}),
				),
				includeTests: t.Optional(
					t.Boolean({
						default: false,
						description: "Whether to include test files in the crawl",
					}),
				),
				// Local specific options (ignored for GitHub)
				respectGitignore: t.Optional(
					t.Boolean({
						default: true,
						description:
							"Whether to respect .gitignore files (local directories only)",
					}),
				),
				followSymlinks: t.Optional(
					t.Boolean({
						default: false,
						description:
							"Whether to follow symbolic links (local directories only)",
					}),
				),
			}),
			response: {
				200: t.Object({
					success: t.Boolean(),
					sourceType: t.Union([t.Literal("github"), t.Literal("local")]),
					message: t.String(),
					repository: t.Object({
						name: t.String(),
						language: t.Nullable(t.String()),
						// Conditional fields based on source type
						fullName: t.Optional(t.String()), // GitHub only
						defaultBranch: t.Optional(t.String()), // GitHub only
						private: t.Optional(t.Boolean()), // GitHub only
						fullPath: t.Optional(t.String()), // Local only
						relativePath: t.Optional(t.String()), // Local only
						isGitRepository: t.Optional(t.Boolean()), // Local only
						url: t.Optional(t.String()), // Both
					}),
					files: t.Array(
						t.Object({
							path: t.String(),
							size: t.Number(),
							type: t.String(),
						}),
					),
					statistics: t.Object({
						totalFiles: t.Number(),
						totalSize: t.String(),
						fileTypes: t.Record(t.String(), t.Number()),
						processingTime: t.String(),
						skippedFiles: t.Number(),
						errorFiles: t.Number(),
					}),
				}),
				400: t.Object({
					error: t.String(),
					message: t.Optional(t.String()),
				}),
				500: t.Object({
					success: t.Boolean(),
					error: t.String(),
					message: t.String(),
					details: t.Optional(t.String()),
				}),
			},
		},
	)
	.listen(3000);

console.log(
	`🦊 PocketFlowTS is running at ${app.server?.hostname}:${app.server?.port}`,
);
