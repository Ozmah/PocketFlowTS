// Local filesystem helper utilities for path validation and security
import * as path from "node:path";
import type { CrawlerStatistics } from "../types/tutorial";
import { formatFileSize, getFileExtension } from "./github-helpers";

export interface LocalPathInfo {
	absolutePath: string;
	relativePath: string;
	isDirectory: boolean;
	isValid: boolean;
	error?: string;
}

/**
 * Validates if a path is safe to access based on security rules
 */
export function isPathSafe(targetPath: string): boolean {
	try {
		const absolutePath = path.resolve(targetPath);

		// Get allowed paths from environment or use defaults
		const allowedPaths = [
			process.env.HOME || "/home",
			process.cwd(),
			"/tmp",
			"/var/tmp",
			"/mnt", // Allow mounted drives in WSL
		].map((p) => path.resolve(p));

		// Blocked paths for security
		const blockedPaths = [
			"/etc",
			"/bin",
			"/usr/bin",
			"/sbin",
			"/usr/sbin",
			"/boot",
			"/sys",
			"/proc",
			"/dev",
			"/root",
		].map((p) => path.resolve(p));

		// Check if path is under any blocked path
		for (const blocked of blockedPaths) {
			if (absolutePath.startsWith(blocked)) {
				return false;
			}
		}

		// Check if path is under any allowed path
		for (const allowed of allowedPaths) {
			if (absolutePath.startsWith(allowed)) {
				return true;
			}
		}
		return false;
	} catch (error) {
		console.log(`❌ Path validation error:`, error);
		return false;
	}
}

/**
 * Parses and validates a local file path
 */
export async function parseLocalPath(
	targetPath: string,
): Promise<LocalPathInfo> {
	try {
		const absolutePath = path.resolve(targetPath);
		const relativePath = path.relative(process.cwd(), absolutePath);

		// Check if path is safe
		if (!isPathSafe(absolutePath)) {
			return {
				absolutePath,
				relativePath,
				isDirectory: false,
				isValid: false,
				error: "Path is not allowed for security reasons",
			};
		}

		// Check if path exists using Bun's file API
		const file = Bun.file(absolutePath);
		if (!(await file.exists())) {
			return {
				absolutePath,
				relativePath,
				isDirectory: false,
				isValid: false,
				error: "Path does not exist",
			};
		}

		// Check if it's a directory
		const stats = await Bun.file(absolutePath).stat();

		return {
			absolutePath,
			relativePath,
			isDirectory: stats.isDirectory(),
			isValid: true,
		};
	} catch (error) {
		return {
			absolutePath: targetPath,
			relativePath: targetPath,
			isDirectory: false,
			isValid: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Gets default exclude patterns for local filesystem scanning
 */
export function getLocalExcludePatterns(): string[] {
	return [
		// Version control
		".git/**",
		".svn/**",
		".hg/**",

		// Dependencies
		"node_modules/**",
		"vendor/**",
		".pnp.*",

		// Build outputs
		"dist/**",
		"build/**",
		"out/**",
		"target/**",
		".next/**",
		".nuxt/**",
		".output/**",

		// Cache directories
		".cache/**",
		".temp/**",
		".tmp/**",
		"tmp/**",

		// IDE and editor files
		".vscode/**",
		".idea/**",
		"*.swp",
		"*.swo",
		"*~",

		// OS files
		".DS_Store",
		"Thumbs.db",
		"desktop.ini",

		// Logs and temp files
		"*.log",
		"*.log.*",
		"*.tmp",
		"*.temp",

		// Lock files
		"*.lock",
		"package-lock.json",
		"yarn.lock",
		"pnpm-lock.yaml",
		"bun.lockb",
		"composer.lock",
		"Pipfile.lock",

		// Coverage and test outputs
		"coverage/**",
		".nyc_output/**",
		"test-results/**",

		// Security sensitive files
		".env*",
		"*.pem",
		"*.key",
		"*.crt",
		"*.p12",
		"*.pfx",

		// Large files that are usually not code
		"*.iso",
		"*.dmg",
		"*.exe",
		"*.msi",
		"*.deb",
		"*.rpm",

		// Binary files
		"*.jpg",
		"*.jpeg",
		"*.png",
		"*.gif",
		"*.bmp",
		"*.ico",
		"*.tiff",
		"*.webp",
		"*.mp3",
		"*.mp4",
		"*.avi",
		"*.mov",
		"*.wav",
		"*.flac",
		"*.zip",
		"*.tar",
		"*.gz",
		"*.rar",
		"*.7z",
		"*.pdf",
		"*.doc",
		"*.docx",
		"*.xls",
		"*.xlsx",
		"*.ppt",
		"*.pptx",
		"*.ttf",
		"*.otf",
		"*.woff",
		"*.woff2",
		"*.bin",
		"*.dat",
		"*.db",
		"*.sqlite",
	];
}

/**
 * Gets default include patterns for code files
 */
export function getLocalIncludePatterns(): string[] {
	return [
		// JavaScript/TypeScript
		"**/*.{js,jsx,ts,tsx}",

		// Vue/Svelte
		"**/*.{vue,svelte}",

		// Backend languages
		"**/*.{py,rb,php,java,kt,scala}",

		// Systems languages
		"**/*.{c,cpp,cc,cxx,h,hpp,cs,vb,fs,go,rs,swift}",

		// Web technologies
		"**/*.{html,css,scss,sass,less}",

		// Data formats
		"**/*.{json,xml,yaml,yml,toml}",

		// Documentation
		"**/*.{md,txt,rst,adoc}",

		// Database and query languages
		"**/*.{sql,graphql,prisma}",

		// Shell scripts
		"**/*.{sh,bash,zsh,fish,ps1}",

		// Build and config files
		"**/Dockerfile",
		"**/Makefile",
		"**/CMakeLists.txt",
		"**/*.{dockerfile,makefile,cmake}",

		// Config files
		"**/*config*",
		"**/*rc",
		"**/.env*",
	];
}

/**
 * Calculates statistics for local file crawling
 */
export function calculateLocalStatistics(
	files: Array<{ path: string; size: number }>,
	projectRoot: string,
	startTime: number,
): CrawlerStatistics {
	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	const processingTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

	// Count file types and create relative paths for display
	const fileTypes: Record<string, number> = {};
	files.forEach((file) => {
		const relativePath = path.relative(projectRoot, file.path);
		const extension = getFileExtension(relativePath) || "no-extension";
		fileTypes[extension] = (fileTypes[extension] || 0) + 1;
	});

	return {
		totalFiles: files.length,
		totalSize: formatFileSize(totalSize),
		fileTypes,
		processingTime,
		skippedFiles: 0,
		errorFiles: 0,
	};
}
