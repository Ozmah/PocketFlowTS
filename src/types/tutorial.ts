// Core types for PocketFlowTS tutorial generation
// Migrated from original project to work with Vercel AI SDK structured outputs

export interface FetchedFile {
	path: string;
	content: string;
	size: number;
}

export interface Abstraction {
	name: string;
	description: string;
	files: string[];
	codeExamples: string[];
}

export interface Relationship {
	from: string;
	to: string;
	type: "uses" | "extends" | "implements" | "contains" | "depends_on";
	description: string;
}

export interface ProjectAnalysis {
	summary: string;
	relationships: Relationship[];
	keyInsights: string[];
}

export interface ChapterContent {
	title: string;
	description: string;
	content: string;
	codeExamples: string[];
	relatedConcepts: string[];
}

export interface TutorialFile {
	filename: string;
	content: string;
	type: "markdown" | "index" | "config" | "gemfile" | "readme";
}

export interface PipelineStep {
	step: number;
	name: string;
	status: "pending" | "running" | "completed" | "error";
	message: string;
	timestamp: string;
	duration?: number;
	tokens?: number;
}

export type StreamingData =
	| Record<string, unknown>
	| string
	| number
	| boolean
	| null;

export interface StreamingResponse {
	type:
		| "step_start"
		| "step_progress"
		| "step_complete"
		| "step_error"
		| "final_result";
	step?: PipelineStep;
	data?: StreamingData;
	error?: string;
}

// Structured output schemas for AI SDK
export interface IdentifyAbstractionsOutput {
	abstractions: {
		name: string;
		description: string;
		files: string[];
		importance: number;
		codeExamples: string[];
	}[];
	summary: string;
}

export interface AnalyzeRelationshipsOutput {
	projectSummary: string;
	relationships: {
		from: string;
		to: string;
		type: "uses" | "extends" | "implements" | "contains" | "depends_on";
		description: string;
		strength: number;
	}[];
	keyInsights: string[];
}

export interface OrderChaptersOutput {
	orderedChapters: {
		abstraction: string;
		order: number;
		reasoning: string;
	}[];
	pedagogicalFlow: string;
}

export interface WriteChapterOutput {
	title: string;
	description: string;
	introduction: string;
	sections: {
		heading: string;
		content: string;
		codeExamples: string[];
	}[];
	conclusion: string;
	relatedConcepts: string[];
	technologies: string[];
}

// Base Repository interface with common fields
export interface Repository {
	name: string;
	language: string | null;
	url: string;
}

// GitHub Crawler types - Always Git repositories
export interface GitHubRepository extends Repository {
	isGitRepository: true;
	fullName: string;
	defaultBranch: string;
	size: number;
	private: boolean;
	description: string | null;
}

// Local Crawler types - Never treated as Git repositories (for analysis purposes)
export interface LocalRepository extends Repository {
	isGitRepository: false;
	fullPath: string;
	relativePath: string;
}

export interface CrawlerOptions {
	includePatterns?: string[];
	excludePatterns?: string[];
	maxFileSize?: number;
	maxFiles?: number;
	includeTests?: boolean;
}

// Local-specific crawler options
export interface LocalCrawlerOptions extends CrawlerOptions {
	respectGitignore?: boolean; // Optimization tool, not Git repository feature
	followSymlinks?: boolean;
}

export interface CrawlerStatistics {
	totalFiles: number;
	totalSize: string;
	fileTypes: Record<string, number>;
	processingTime: string;
	skippedFiles: number;
	errorFiles: number;
}

export interface GitHubFileInfo {
	path: string;
	type: "blob" | "tree";
	size: number;
	sha: string;
	url: string;
}

// Generics

export interface CrawlerResult<T extends Repository> {
	repository: T;
	files: FetchedFile[];
	statistics: CrawlerStatistics;
}

// Type guards

export function isGitHubRepository(
	repo: GitHubRepository | LocalRepository,
): repo is GitHubRepository {
	return repo.isGitRepository === true;
}

export function isLocalRepository(
	repo: GitHubRepository | LocalRepository,
): repo is LocalRepository {
	return repo.isGitRepository === false;
}
