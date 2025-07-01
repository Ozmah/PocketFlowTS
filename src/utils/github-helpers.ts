// GitHub API helper utilities for URL validation, parsing, and formatting

import type { CrawlerStatistics } from "../types/tutorial";

export interface ParsedGitHubUrl {
	owner: string;
	repo: string;
	branch?: string;
	path?: string;
}

/**
 * Validates if a URL is a valid GitHub repository URL
 */
export function isValidGitHubUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return (
			parsed.hostname === "github.com" &&
			parsed.pathname.split("/").filter(Boolean).length >= 2
		);
	} catch {
		return false;
	}
}

/**
 * Parses a GitHub URL and extracts owner, repo, branch, and path information
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl {
	if (!isValidGitHubUrl(url)) {
		throw new Error(`Invalid GitHub URL: ${url}`);
	}

	const parsed = new URL(url);
	const pathParts = parsed.pathname.split("/").filter(Boolean);

	if (pathParts.length < 2) {
		throw new Error(`Invalid GitHub repository URL: ${url}`);
	}

	const [owner, repo, ...rest] = pathParts;

	// Remove .git suffix if present
	const cleanRepo = repo.endsWith(".git") ? repo.slice(0, -4) : repo;

	// Extract branch and path if present (e.g., /owner/repo/tree/branch/path)
	let branch: string | undefined;
	let path: string | undefined;

	if (rest.length > 0 && rest[0] === "tree" && rest.length > 1) {
		branch = rest[1];
		if (rest.length > 2) {
			path = rest.slice(2).join("/");
		}
	}

	return {
		owner,
		repo: cleanRepo,
		branch,
		path,
	};
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
	const sizes = ["Bytes", "KB", "MB", "GB"];
	if (bytes === 0) return "0 Bytes";

	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const size = (bytes / 1024 ** i).toFixed(1);

	return `${size} ${sizes[i]}`;
}

/**
 * Gets file extension from a file path
 */
export function getFileExtension(filePath: string): string {
	const parts = filePath.split(".");
	return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

/**
 * Determines if a file is likely a binary file based on extension
 */
export function isBinaryFile(filePath: string): boolean {
	const binaryExtensions = new Set([
		"jpg",
		"jpeg",
		"png",
		"gif",
		"bmp",
		"ico",
		"tiff",
		"webp",
		"mp3",
		"mp4",
		"avi",
		"mov",
		"wav",
		"flac",
		"zip",
		"tar",
		"gz",
		"rar",
		"7z",
		"pdf",
		"doc",
		"docx",
		"xls",
		"xlsx",
		"ppt",
		"pptx",
		"exe",
		"dll",
		"so",
		"dylib",
		"ttf",
		"otf",
		"woff",
		"woff2",
		"bin",
		"dat",
		"db",
		"sqlite",
	]);

	const extension = getFileExtension(filePath);
	return binaryExtensions.has(extension);
}

/**
 * Checks if a file path should be included based on patterns
 */
export function shouldIncludeFile(
	filePath: string,
	includePatterns?: string[],
	excludePatterns?: string[],
): boolean {
	// Skip binary files by default
	if (isBinaryFile(filePath)) {
		return false;
	}

	// Check exclude patterns first
	if (excludePatterns && excludePatterns.length > 0) {
		const micromatch = require("micromatch");
		if (micromatch.isMatch(filePath, excludePatterns)) {
			return false;
		}
	}

	// Default: include common code file extensions
	const codeExtensions = new Set([
		"js",
		"jsx",
		"ts",
		"tsx",
		"vue",
		"svelte",
		"py",
		"rb",
		"php",
		"java",
		"kt",
		"scala",
		"c",
		"cpp",
		"cc",
		"cxx",
		"h",
		"hpp",
		"cs",
		"vb",
		"fs",
		"go",
		"rs",
		"swift",
		"html",
		"css",
		"scss",
		"sass",
		"less",
		"json",
		"xml",
		"yaml",
		"yml",
		"toml",
		"md",
		"txt",
		"rst",
		"adoc",
		"sql",
		"graphql",
		"prisma",
		"sh",
		"bash",
		"zsh",
		"fish",
		"ps1",
		"dockerfile",
		"makefile",
		"cmake",
	]);

	const extension = getFileExtension(filePath);
	const fileName = filePath.split("/").pop()?.toLowerCase() || "";

	// First check if it's a common code file or special filename
	const isCodeFile =
		codeExtensions.has(extension) ||
		fileName === "dockerfile" ||
		fileName === "makefile" ||
		fileName.startsWith(".env") ||
		fileName.endsWith("rc") ||
		fileName.endsWith("config");

	// If include patterns are specified, check them in addition to code files
	if (includePatterns && includePatterns.length > 0) {
		const micromatch = require("micromatch");
		return isCodeFile && micromatch.isMatch(filePath, includePatterns);
	}

	// No include patterns specified, return based on code file check
	return isCodeFile;
}

/**
 * Gets default exclude patterns for common directories and files
 */
export function getDefaultExcludePatterns(): string[] {
	return [
		"node_modules/**",
		".git/**",
		".github/**",
		"dist/**",
		"build/**",
		"out/**",
		"target/**",
		".next/**",
		".nuxt/**",
		".cache/**",
		".vscode/**",
		".idea/**",
		"coverage/**",
		"*.log",
		"*.lock",
		"package-lock.json",
		"yarn.lock",
		"pnpm-lock.yaml",
		"bun.lockb",
	];
}

/**
 * Gets default exclude patterns for test files
 */
export function getTestExcludePatterns(): string[] {
	return [
		"**/*.test.*",
		"**/*.spec.*",
		"**/test/**",
		"**/tests/**",
		"**/__tests__/**",
		"**/__test__/**",
		"**/spec/**",
		"**/specs/**",
	];
}

/**
 * Calculates and formats processing statistics
 */
export function calculateStatistics(
	files: Array<{ path: string; size: number }>,
	startTime: number,
	skippedFiles: number = 0,
	errorFiles: number = 0,
): CrawlerStatistics {
	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	const processingTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

	// Count file types
	const fileTypes: Record<string, number> = {};
	files.forEach((file) => {
		const extension = getFileExtension(file.path) || "no-extension";
		fileTypes[extension] = (fileTypes[extension] || 0) + 1;
	});

	return {
		totalFiles: files.length,
		totalSize: formatFileSize(totalSize),
		fileTypes,
		processingTime,
		skippedFiles,
		errorFiles,
	};
}

/**
 * Sanitizes a GitHub URL for safe logging (removes potential tokens)
 */
export function sanitizeUrlForLogging(url: string): string {
	try {
		const parsed = new URL(url);
		// Remove any tokens or sensitive query parameters
		parsed.search = "";
		parsed.hash = "";
		return parsed.toString();
	} catch {
		// If URL parsing fails, return a safe placeholder
		return "[INVALID_URL]";
	}
}
