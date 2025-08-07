// Pipeline service that orchestrates the complete tutorial generation flow
// Implements streaming responses for real-time feedback

import { MOCK_FILES, MOCK_PROJECT_NAME } from "../data/mock-project";
import type {
	AnalyzeRelationshipsOutput,
	CrawlerStatistics,
	FetchedFile,
	GitHubRepository,
	LocalRepository,
	OrderChaptersOutput,
	PipelineStep,
	StreamingData,
	StreamingResponse,
	TutorialFile,
	WriteChapterOutput,
} from "../types/tutorial";
import { AIService } from "./ai-service";
import { CacheService, type CacheOptions, type CacheMetrics } from "./cache-service";
import { frontMatterService } from "./frontmatter-service";
import { jekyllService } from "./jekyll-service";

export interface PipelineOptions extends CacheOptions {
	language?: string;
	maxAbstractions?: number;
	includeTests?: boolean;
	files?: FetchedFile[];
	repository?: GitHubRepository | LocalRepository;
	statistics?: CrawlerStatistics;
}

export class TutorialPipeline {
	private aiService: AIService;
	private cacheService: CacheService;
	private steps: PipelineStep[] = [];

	constructor() {
		this.aiService = new AIService();
		this.cacheService = CacheService.getInstance();
		this.initializePipelineSteps();
	}

	private initializePipelineSteps() {
		const stepNames = [
			"Repository Analysis",
			"Abstraction Identification",
			"Relationship Analysis",
			"Chapter Ordering",
			"Content Generation",
			"Tutorial Assembly",
		];

		this.steps = stepNames.map((name, index) => ({
			step: index + 1,
			name,
			status: "pending",
			message: "Waiting to start...",
			timestamp: new Date().toISOString(),
		}));
	}

	private updateStep(
		stepIndex: number,
		status: PipelineStep["status"],
		message: string,
		tokens?: number,
	) {
		const startTime = this.steps[stepIndex].timestamp;
		const endTime = new Date().toISOString();
		const duration =
			status === "completed"
				? Math.round(
						(new Date(endTime).getTime() - new Date(startTime).getTime()) /
							1000,
					)
				: undefined;

		this.steps[stepIndex] = {
			...this.steps[stepIndex],
			status,
			message,
			timestamp: endTime,
			duration,
			tokens,
		};
	}

	private createStreamResponse(
		type: StreamingResponse["type"],
		step?: PipelineStep,
		data?: StreamingData,
		error?: string,
	): StreamingResponse {
		return { type, step, data, error };
	}

	async *generateTutorial(
		options: PipelineOptions = {},
	): AsyncGenerator<StreamingResponse> {
		const {
			language = "english",
			maxAbstractions = 8,
			includeTests = true,
			useCache = true,
			ttl,
		} = options;

		const cacheOptions: CacheOptions = { useCache, ttl };

		try {
			// Step 1: Repository Analysis
			yield this.createStreamResponse("step_start", {
				...this.steps[0],
				status: "running",
			});
			this.updateStep(
				0,
				"running",
				"Analyzing repository structure and files...",
			);

			await this.delay(500); // Brief processing delay

			// Use real files from crawler or fallback to mock data for testing
			const rawFiles = options.files || MOCK_FILES;
			const files = includeTests
				? rawFiles
				: rawFiles.filter(
						(file) =>
							!file.path.includes("test") &&
							!file.path.includes("spec") &&
							!file.path.includes(".test.") &&
							!file.path.includes(".spec."),
					);
			const projectName = options.repository?.name || MOCK_PROJECT_NAME;

			this.updateStep(
				0,
				"completed",
				`Analyzed ${files.length} files from ${projectName}`,
			);
			yield this.createStreamResponse("step_complete", this.steps[0], {
				filesCount: files.length,
				projectName,
			});

			// Step 2: Abstraction Identification
			yield this.createStreamResponse("step_start", {
				...this.steps[1],
				status: "running",
			});
			this.updateStep(
				1,
				"running",
				"Identifying key code abstractions and patterns...",
			);

			const abstractionsResult = await this.aiService.identifyAbstractions(
				files,
				projectName,
				maxAbstractions,
				cacheOptions,
			);

			this.updateStep(
				1,
				"completed",
				`Identified ${abstractionsResult.object.abstractions.length} key abstractions`,
				abstractionsResult.usage?.totalTokens || 0,
			);
			yield this.createStreamResponse("step_complete", this.steps[1], {
				abstractions: abstractionsResult.object.abstractions.map((a) => ({
					name: a.name,
					importance: a.importance,
					files: a.files.length,
				})),
				summary: abstractionsResult.object.summary,
				cached: abstractionsResult.cached,
			});

			// Step 3: Relationship Analysis
			yield this.createStreamResponse("step_start", {
				...this.steps[2],
				status: "running",
			});
			this.updateStep(
				2,
				"running",
				"Analyzing relationships between abstractions...",
			);

			const relationshipsResult = await this.aiService.analyzeRelationships(
				abstractionsResult.object.abstractions,
				files,
				cacheOptions,
			);

			this.updateStep(
				2,
				"completed",
				`Mapped ${relationshipsResult.object.relationships.length} relationships`,
				relationshipsResult.usage?.totalTokens || 0,
			);
			yield this.createStreamResponse("step_complete", this.steps[2], {
				relationships: relationshipsResult.object.relationships.map((r) => ({
					from: r.from,
					to: r.to,
					type: r.type,
					strength: r.strength,
				})),
				insights: relationshipsResult.object.keyInsights,
				projectSummary: relationshipsResult.object.projectSummary,
				cached: relationshipsResult.cached,
			});

			// Step 4: Chapter Ordering
			yield this.createStreamResponse("step_start", {
				...this.steps[3],
				status: "running",
			});
			this.updateStep(
				3,
				"running",
				"Determining optimal chapter order for learning...",
			);

			const orderingResult = await this.aiService.orderChapters(
				abstractionsResult.object.abstractions,
				relationshipsResult.object.relationships,
				cacheOptions,
			);

			this.updateStep(
				3,
				"completed",
				`Ordered ${orderingResult.object.orderedChapters.length} chapters`,
				orderingResult.usage?.totalTokens || 0,
			);
			yield this.createStreamResponse("step_complete", this.steps[3], {
				chapterOrder: orderingResult.object.orderedChapters,
				pedagogicalFlow: orderingResult.object.pedagogicalFlow,
				cached: orderingResult.cached,
			});

			// Step 5: Content Generation
			yield this.createStreamResponse("step_start", {
				...this.steps[4],
				status: "running",
			});
			this.updateStep(
				4,
				"running",
				"Generating chapter content and extracting technologies...",
			);

			const chapters: WriteChapterOutput[] = [];
			let totalContentTokens = 0;

			// Generate chapters in the determined order
			for (let i = 0; i < orderingResult.object.orderedChapters.length; i++) {
				const chapterOrder = orderingResult.object.orderedChapters[i];
				const abstraction = abstractionsResult.object.abstractions.find(
					(a) => a.name === chapterOrder.abstraction,
				);

				if (!abstraction) continue;

				yield this.createStreamResponse("step_progress", this.steps[4], {
					currentChapter: i + 1,
					totalChapters: orderingResult.object.orderedChapters.length,
					chapterName: abstraction.name,
				});

				// Get related abstractions for context
				const relatedAbstractions = relationshipsResult.object.relationships
					.filter(
						(r) => r.from === abstraction.name || r.to === abstraction.name,
					)
					.map((r) => (r.from === abstraction.name ? r.to : r.from))
					.slice(0, 3);

				const chapterResult = await this.aiService.writeChapter(
					abstraction,
					files,
					relatedAbstractions,
					chapterOrder.order,
					language,
					cacheOptions,
				);

				chapters.push(chapterResult.object);
				totalContentTokens += chapterResult.usage?.totalTokens || 2000; // Estimate if no usage data

				await this.delay(500); // Brief pause between chapters
			}

			this.updateStep(
				4,
				"completed",
				`Generated ${chapters.length} tutorial chapters`,
				totalContentTokens,
			);
			yield this.createStreamResponse("step_complete", this.steps[4], {
				chaptersGenerated: chapters.length,
				totalTokens: totalContentTokens,
			});

			// Step 6: Tutorial Assembly
			yield this.createStreamResponse("step_start", {
				...this.steps[5],
				status: "running",
			});
			this.updateStep(
				5,
				"running",
				"Assembling tutorial structure and Jekyll configuration...",
			);

			const tutorialFiles = await this.assembleTutorial(
				chapters,
				orderingResult.object,
				relationshipsResult.object,
				projectName,
			);

			this.updateStep(
				5,
				"completed",
				`Created ${tutorialFiles.length} tutorial files`,
			);
			yield this.createStreamResponse("step_complete", this.steps[5], {
				filesCreated: tutorialFiles.length,
				tutorialSize: this.calculateTutorialSize(tutorialFiles),
			});

			// Final result
			const cacheMetrics = await this.cacheService.getMetrics();
			yield this.createStreamResponse("final_result", undefined, {
				success: true,
				tutorialFiles,
				statistics: {
					totalSteps: this.steps.length,
					totalTokensUsed: this.steps.reduce(
						(sum, step) => sum + (step.tokens || 0),
						0,
					),
					processingTime: this.calculateTotalDuration(),
					abstractionsIdentified: abstractionsResult.object.abstractions.length,
					relationshipsMapped: relationshipsResult.object.relationships.length,
					chaptersGenerated: chapters.length,
				},
				cacheMetrics: {
					...cacheMetrics,
					hitRateFormatted: `${cacheMetrics.hitRate.toFixed(2)}%`,
				},
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			const currentStep = this.steps.find((s) => s.status === "running");

			if (currentStep) {
				this.updateStep(
					currentStep.step - 1,
					"error",
					`Error: ${errorMessage}`,
				);
			}

			yield this.createStreamResponse(
				"step_error",
				currentStep,
				undefined,
				errorMessage,
			);
		}
	}

	private async assembleTutorial(
		chapters: WriteChapterOutput[],
		ordering: OrderChaptersOutput,
		relationships: AnalyzeRelationshipsOutput,
		projectName: string,
	): Promise<TutorialFile[]> {
		const files: TutorialFile[] = [];

		// Generate tutorial metadata for front matter
		const tutorialMetadata = frontMatterService.generateTutorialMetadata(
			chapters.map((ch) => ({ path: ch.title, content: ch.introduction })),
			{
				tutorialId: this.slugify(projectName),
				technologies: this.consolidateTechnologies(chapters),
			},
		);

		// Extract GitHub URL if available
		const githubUrl = jekyllService.extractGitHubUrl(
			chapters.map((ch) => ({ path: ch.title, content: ch.introduction })),
		);

		// Generate Jekyll configuration files
		const jekyllFiles = jekyllService.generateJekyllFiles(
			tutorialMetadata.title,
			tutorialMetadata.technologies,
			githubUrl,
		);

		// Create index file with front matter
		const indexContent = this.generateIndexContent(
			chapters,
			ordering,
			relationships,
			projectName,
		);
		const indexFrontMatter =
			frontMatterService.generateIndexFrontMatter(tutorialMetadata);
		const indexWithFrontMatter = frontMatterService.addFrontMatterToContent(
			indexFrontMatter,
			indexContent,
		);

		files.push({
			filename: "index.md",
			content: indexWithFrontMatter,
			type: "index",
		});

		// Create individual chapter files with front matter
		const allChapterTitles = chapters.map((ch) => ch.title);

		chapters.forEach((chapter, index) => {
			const chapterNumber = String(index + 1).padStart(2, "0");
			const filename = `${chapterNumber}_${this.slugify(chapter.title)}.md`;

			// Generate chapter metadata using AI-provided data directly
			const chapterMetadata = frontMatterService.generateChapterMetadata(
				chapter.title,
				chapter.description,
				index + 1,
				chapters.length,
				tutorialMetadata.id,
				allChapterTitles,
				chapter.relatedConcepts,
				chapter.technologies,
			);

			// Generate content with correct navigation
			const content = this.generateChapterContent(chapter, index + 1, {
				prevChapter: chapterMetadata.prevChapter,
				nextChapter: chapterMetadata.nextChapter,
			});

			const chapterFrontMatter = frontMatterService.generateChapterFrontMatter(
				chapterMetadata,
				tutorialMetadata,
			);

			const contentWithFrontMatter = frontMatterService.addFrontMatterToContent(
				chapterFrontMatter,
				content,
			);

			files.push({
				filename,
				content: contentWithFrontMatter,
				type: "markdown",
			});
		});

		// Add Jekyll configuration files
		files.push({
			filename: "_config.yml",
			content: jekyllFiles.configYml,
			type: "config",
		});

		files.push({
			filename: "Gemfile",
			content: jekyllFiles.gemfile,
			type: "gemfile",
		});

		files.push({
			filename: "README.md",
			content: jekyllService.generateReadme(tutorialMetadata.title),
			type: "readme",
		});

		return files;
	}

	private generateIndexContent(
		chapters: WriteChapterOutput[],
		ordering: OrderChaptersOutput,
		relationships: AnalyzeRelationshipsOutput,
		projectName: string,
	): string {
		const toc = chapters
			.map((chapter, index) => {
				const chapterNumber = String(index + 1).padStart(2, "0");
				const filename = `${chapterNumber}_${this.slugify(chapter.title)}.md`;
				return `${index + 1}. [${chapter.title}](${filename}) - ${chapter.description}`;
			})
			.join("\n");

		return `# ${projectName} - Tutorial Guide

${relationships.projectSummary}

## Learning Path

${ordering.pedagogicalFlow}

## Tutorial Contents

${toc}

## Key Insights

${relationships.keyInsights.map((insight) => `- ${insight}`).join("\n")}

---

*Generated by PocketFlowTS AI Tutorial Generator*
*Total chapters: ${chapters.length}*
*Generated on: ${new Date().toLocaleDateString()}*`;
	}

	private generateChapterContent(
		chapter: WriteChapterOutput,
		chapterNumber: number,
		chapterMetadata?: {
			prevChapter: { file: string | null; title: string | null };
			nextChapter: { file: string | null; title: string | null };
		},
	): string {
		const sectionsContent = chapter.sections
			.map((section) => {
				const codeExamples =
					section.codeExamples.length > 0
						? `\n\n${section.codeExamples.map((code) => `\`\`\`typescript\n${code}\n\`\`\``).join("\n\n")}`
						: "";

				return `## ${section.heading}\n\n${section.content}${codeExamples}`;
			})
			.join("\n\n");

		const relatedConcepts =
			chapter.relatedConcepts.length > 0
				? `\n\n## Related Concepts\n\n${chapter.relatedConcepts.map((concept) => `- ${concept}`).join("\n")}`
				: "";

		// Generate navigation links
		const navigationLinks = this.generateNavigationLinks(chapterMetadata);

		return `# Chapter ${chapterNumber}: ${chapter.title}

${chapter.description}

## Introduction

${chapter.introduction}

${sectionsContent}

## Conclusion

${chapter.conclusion}${relatedConcepts}

---

${navigationLinks}`;
	}

	/**
	 * Generates navigation links for chapter content
	 */
	private generateNavigationLinks(chapterMetadata?: {
		prevChapter: { file: string | null; title: string | null };
		nextChapter: { file: string | null; title: string | null };
	}): string {
		if (!chapterMetadata) {
			return "*[← Tutorial Home](index.md)*";
		}

		const { prevChapter, nextChapter } = chapterMetadata;

		const navigationParts: string[] = [];

		// Previous chapter link
		if (prevChapter.file && prevChapter.title) {
			navigationParts.push(`[← ${prevChapter.title}](${prevChapter.file})`);
		} else {
			navigationParts.push(`[← Tutorial Home](index.md)`);
		}

		// Next chapter link
		if (nextChapter.file && nextChapter.title) {
			navigationParts.push(`[${nextChapter.title} →](${nextChapter.file})`);
		}

		return `*${navigationParts.join(" | ")}*`;
	}

	private slugify(text: string): string {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, "")
			.replace(/[\s_-]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	private calculateTutorialSize(files: TutorialFile[]): string {
		const totalBytes = files.reduce(
			(sum, file) => sum + file.content.length,
			0,
		);
		return `${Math.round(totalBytes / 1024)} KB`;
	}

	private calculateTotalDuration(): string {
		const firstStep = this.steps[0];
		const lastStep = this.steps[this.steps.length - 1];
		const startTime = new Date(firstStep.timestamp).getTime();
		const endTime = new Date(lastStep.timestamp).getTime();
		const durationMs = endTime - startTime;
		return `${Math.round(durationMs / 1000)}s`;
	}

	/**
	 * Consolidates technologies from all chapters
	 */
	private consolidateTechnologies(chapters: WriteChapterOutput[]): string[] {
		const allTechnologies = new Set<string>();

		chapters.forEach((chapter) => {
			chapter.technologies.forEach((tech) => {
				// Normalize technology names
				const normalizedTech = tech.trim();
				if (normalizedTech.length > 0) {
					allTechnologies.add(normalizedTech);
				}
			});
		});

		// Ensure we always have some technologies
		if (allTechnologies.size === 0) {
			allTechnologies.add("Development");
		}

		return Array.from(allTechnologies).sort();
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	getSteps(): PipelineStep[] {
		return [...this.steps];
	}
}
