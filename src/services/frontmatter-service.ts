// src/services/frontmatter-service.ts
import { z } from "zod";

// Schemas para validación de datos
export const TutorialMetadataSchema = z.object({
	id: z.string(),
	title: z.string(),
	totalChapters: z.number(),
	estimatedTime: z.string(),
	generatedDate: z.string(),
	technologies: z.array(z.string()),
	description: z.string(),
	primaryCategory: z.string(),
});

export const ChapterMetadataSchema = z.object({
	number: z.number(),
	title: z.string(),
	description: z.string(),
	primaryConcepts: z.array(z.string()),
	relatedConcepts: z.array(z.string()),
	chapterSpecificTags: z.array(z.string()),
	prevChapter: z.object({
		file: z.string().nullable(),
		title: z.string().nullable(),
	}),
	nextChapter: z.object({
		file: z.string().nullable(),
		title: z.string().nullable(),
	}),
});

export type TutorialMetadata = z.infer<typeof TutorialMetadataSchema>;
export type ChapterMetadata = z.infer<typeof ChapterMetadataSchema>;

/**
 * Service for generating front matter dynamically
 * for Jekyll tutorials
 */
export class FrontMatterService {
	/**
	 * Generates front matter for tutorial index page
	 */
	generateIndexFrontMatter(metadata: TutorialMetadata): string {
		const frontMatter = `---
layout: default
title: "${metadata.title}"
nav_order: 1
has_children: true
description: "${metadata.description}"

tutorial:
  id: "${metadata.id}"
  title: "${metadata.title}"
  total_chapters: ${metadata.totalChapters}
  estimated_time: "${metadata.estimatedTime}"
  generated_date: "${metadata.generatedDate}"
  technologies: ${JSON.stringify(metadata.technologies)}

categories: [tutorials, ${metadata.primaryCategory}]
tags: ${JSON.stringify(this.generateIndexTags(metadata))}

toc: true
featured: true
---`;

		return frontMatter;
	}

	/**
	 * Generates front matter for a specific chapter
	 */
	generateChapterFrontMatter(
		chapterData: ChapterMetadata,
		tutorialMetadata: TutorialMetadata,
	): string {
		const frontMatter = `---
layout: default
title: "${chapterData.title}"
parent: "${tutorialMetadata.title}"
nav_order: ${chapterData.number}
description: "${chapterData.description}"

chapter:
  number: ${chapterData.number}
  title: "${chapterData.title}"

tutorial:
  id: "${tutorialMetadata.id}"
  total_chapters: ${tutorialMetadata.totalChapters}

categories: [tutorials, ${tutorialMetadata.primaryCategory}]
tags: ${JSON.stringify(chapterData.chapterSpecificTags)}

navigation:
  prev_chapter: ${chapterData.prevChapter.file ? `"${chapterData.prevChapter.file}"` : "null"}
  prev_title: ${chapterData.prevChapter.title ? `"${chapterData.prevChapter.title}"` : "null"}
  next_chapter: ${chapterData.nextChapter.file ? `"${chapterData.nextChapter.file}"` : "null"}
  next_title: ${chapterData.nextChapter.title ? `"${chapterData.nextChapter.title}"` : "null"}
  tutorial_home: "/tutorials/${tutorialMetadata.id}/"

concepts:
  primary: ${JSON.stringify(chapterData.primaryConcepts)}
  related: ${JSON.stringify(chapterData.relatedConcepts)}

toc: true
---`;

		return frontMatter;
	}

	/**
	 * Generates base tags for tutorial index
	 */
	private generateIndexTags(metadata: TutorialMetadata): string[] {
		const baseTags = [
			metadata.id.replace("-", ""),
			"tutorial",
			metadata.primaryCategory,
		];

		// Add technologies as tags (lowercase)
		const techTags = metadata.technologies.map((tech) =>
			tech.toLowerCase().replace(/[^a-z0-9]/g, ""),
		);

		return [...baseTags, ...techTags];
	}

	/**
	 * Generates complete tutorial metadata based on generated files
	 */
	generateTutorialMetadata(
		tutorialFiles: Array<{ path: string; content: string }>,
		options: {
			tutorialId: string;
			technologies: string[];
		},
	): TutorialMetadata {
		const totalChapters = tutorialFiles.length;
		const currentDate = new Date().toISOString().split("T")[0];

		const primaryCategory = this.detectPrimaryCategory(
			tutorialFiles,
			options.technologies,
		);

		return {
			id: options.tutorialId,
			title: `${options.tutorialId} - Tutorial Guide`,
			totalChapters,
			estimatedTime: this.calculateEstimatedTime(totalChapters),
			generatedDate: currentDate,
			technologies: options.technologies,
			description: this.generateTutorialDescription(options, primaryCategory),
			primaryCategory,
		};
	}

	/**
	 * Generates chapter metadata from AI-generated chapter data
	 */
	generateChapterMetadata(
		chapterTitle: string,
		chapterDescription: string,
		chapterNumber: number,
		totalChapters: number,
		tutorialId: string,
		allChapterTitles?: string[],
		relatedConcepts?: string[],
		technologies?: string[],
	): ChapterMetadata {
		// Use data directly from AI without parsing
		const primaryConcepts = technologies?.slice(0, 3) || [];
		const relatedConceptsList = relatedConcepts?.slice(0, 3) || [];

		// Generate tags from title and technologies
		const baseTags = [tutorialId.replace("-", ""), "chapter"];
		const techTags =
			technologies
				?.slice(0, 2)
				.map((tech) => tech.toLowerCase().replace(/[^a-z0-9]/g, "")) || [];

		return {
			number: chapterNumber,
			title: chapterTitle,
			description:
				chapterDescription.length > 150
					? `${chapterDescription.substring(0, 150)}...`
					: chapterDescription,
			primaryConcepts,
			relatedConcepts: relatedConceptsList,
			chapterSpecificTags: [...baseTags, ...techTags],
			prevChapter: this.generatePrevChapterNav(chapterNumber, allChapterTitles),
			nextChapter: this.generateNextChapterNav(
				chapterNumber,
				totalChapters,
				allChapterTitles,
			),
		};
	}

	/**
	 * Calcula el tiempo estimado total del tutorial
	 */
	private calculateEstimatedTime(totalChapters: number): string {
		const avgTimePerChapter = 45; // minutos
		const totalMinutes = totalChapters * avgTimePerChapter;
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;

		if (hours > 0) {
			return `${hours}-${hours + 1} hours`;
		}
		return `${minutes} minutes`;
	}

	/**
	 * Detects the primary category based on content and technologies
	 */
	private detectPrimaryCategory(
		tutorialFiles: Array<{ path: string; content: string }>,
		technologies: string[],
	): string {
		const allContent = tutorialFiles
			.map((f) => f.content.toLowerCase())
			.join(" ");
		const techLower = technologies.map((t) => t.toLowerCase()).join(" ");

		// Patterns to detect categories
		const categoryPatterns = {
			"api-development": [
				"api",
				"endpoint",
				"rest",
				"graphql",
				"elysia",
				"express",
				"fastify",
				"server",
			],
			"web-development": [
				"frontend",
				"react",
				"vue",
				"angular",
				"html",
				"css",
				"javascript",
				"web",
			],
			"mobile-development": [
				"android",
				"ios",
				"react-native",
				"flutter",
				"mobile",
				"app",
			],
			"data-science": [
				"data",
				"analytics",
				"machine-learning",
				"ai",
				"pandas",
				"numpy",
				"analysis",
			],
			devops: [
				"docker",
				"kubernetes",
				"ci/cd",
				"deployment",
				"infrastructure",
				"aws",
				"azure",
			],
			database: [
				"database",
				"sql",
				"mongodb",
				"postgres",
				"mysql",
				"orm",
				"prisma",
				"drizzle",
			],
			security: [
				"security",
				"auth",
				"authentication",
				"authorization",
				"encryption",
				"jwt",
			],
			testing: [
				"test",
				"testing",
				"unit",
				"integration",
				"jest",
				"vitest",
				"cypress",
			],
			cloud: ["cloud", "aws", "azure", "gcp", "serverless", "lambda", "vercel"],
		};

		// Calculate scores for each category
		const scores: Record<string, number> = {};

		for (const [category, keywords] of Object.entries(categoryPatterns)) {
			scores[category] = keywords.reduce((score, keyword) => {
				const contentMatches = (
					allContent.match(new RegExp(keyword, "g")) || []
				).length;
				const techMatches = (techLower.match(new RegExp(keyword, "g")) || [])
					.length;
				return score + contentMatches + techMatches * 2; // Give more weight to technologies
			}, 0);
		}

		// Find category with highest score
		const topCategory = Object.entries(scores).reduce(
			(max, [category, score]) =>
				score > max.score ? { category, score } : max,
			{ category: "development", score: 0 },
		);

		return topCategory.category;
	}

	/**
	 * Generates tutorial description
	 */
	private generateTutorialDescription(
		options: {
			tutorialId: string;
			technologies: string[];
		},
		primaryCategory: string,
	): string {
		const techList = options.technologies.join(", ");
		return `Complete tutorial on ${primaryCategory} using ${techList}. Learn architecture, best practices and step-by-step implementation.`;
	}

	/**
	 * Extracts chapter title from content
	 */
	private extractChapterTitle(content: string): string {
		const titleMatch = content.match(/^#\s+(.+)$/m);
		if (titleMatch) {
			let title = titleMatch[1].trim();
			// Remove "Chapter X:" prefix if present
			title = title.replace(/^Chapter\s+\d+:\s*/i, "");
			return title;
		}
		return "Untitled Chapter";
	}

	/**
	 * Extracts chapter description from content
	 */
	private extractChapterDescription(content: string): string {
		// Find first paragraph after the title
		const paragraphMatch = content.match(/^#\s+.+\n\n(.+?)(?:\n\n|\n#|$)/s);
		if (paragraphMatch) {
			return `${paragraphMatch[1].trim().substring(0, 150)}...`;
		}
		return "Chapter description";
	}

	/**
	 * Extracts concepts from content
	 */
	private extractConcepts(content: string): {
		primary: string[];
		related: string[];
	} {
		// Basic logic to extract concepts
		// This can be improved with NLP or more sophisticated patterns
		const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
		const concepts = new Set<string>();

		// Extract keywords from code blocks
		codeBlocks.forEach((block) => {
			const keywords = block.match(
				/\b(class|function|interface|type|const|let|var|async|await|import|export)\b/g,
			);
			if (keywords) {
				keywords.forEach((keyword) => concepts.add(keyword));
			}
		});

		const allConcepts = Array.from(concepts);
		return {
			primary: allConcepts.slice(0, 3),
			related: allConcepts.slice(3, 6),
		};
	}

	/**
	 * Generates chapter specific tags
	 */
	private generateChapterTags(content: string, tutorialId: string): string[] {
		const baseTags = [tutorialId.replace("-", ""), "chapter"];
		const concepts = this.extractConcepts(content);

		return [...baseTags, ...concepts.primary.map((c) => c.toLowerCase())];
	}

	/**
	 * Generates navigation to previous chapter
	 */
	private generatePrevChapterNav(
		chapterNumber: number,
		allChapterTitles?: string[],
	): {
		file: string | null;
		title: string | null;
	} {
		if (chapterNumber <= 1) {
			return { file: null, title: null };
		}

		const prevNumber = chapterNumber - 1;
		const prevChapterTitle = allChapterTitles?.[prevNumber - 1];

		if (prevChapterTitle) {
			const filename = `${String(prevNumber).padStart(2, "0")}_${this.slugify(prevChapterTitle)}.html`;
			return {
				file: filename,
				title: prevChapterTitle,
			};
		}

		return {
			file: `${String(prevNumber).padStart(2, "0")}_chapter-${prevNumber}.html`,
			title: `Chapter ${prevNumber}`,
		};
	}

	/**
	 * Generates navigation to next chapter
	 */
	private generateNextChapterNav(
		chapterNumber: number,
		totalChapters: number,
		allChapterTitles?: string[],
	): {
		file: string | null;
		title: string | null;
	} {
		if (chapterNumber >= totalChapters) {
			return { file: null, title: null };
		}

		const nextNumber = chapterNumber + 1;
		const nextChapterTitle = allChapterTitles?.[nextNumber - 1];

		if (nextChapterTitle) {
			const filename = `${String(nextNumber).padStart(2, "0")}_${this.slugify(nextChapterTitle)}.html`;
			return {
				file: filename,
				title: nextChapterTitle,
			};
		}

		return {
			file: `${String(nextNumber).padStart(2, "0")}_chapter-${nextNumber}.html`,
			title: `Chapter ${nextNumber}`,
		};
	}

	/**
	 * Helper function to slugify text for filenames
	 */
	private slugify(text: string): string {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, "")
			.replace(/[\s_-]+/g, "-")
			.replace(/^-+|-+$/g, "");
	}

	/**
	 * Adds front matter to content file
	 */
	addFrontMatterToContent(frontMatter: string, content: string): string {
		return `${frontMatter}\n\n${content}`;
	}

	/**
	 * Validates that generated front matter is valid YAML
	 */
	validateFrontMatter(frontMatter: string): {
		isValid: boolean;
		error?: string;
	} {
		// Extract only YAML part (between ---)
		const yamlMatch = frontMatter.match(/^---\n([\s\S]*?)\n---/);
		if (!yamlMatch) {
			return { isValid: false, error: "Valid YAML delimiters not found" };
		}

		// Basic YAML syntax validation
		const yamlContent = yamlMatch[1];
		if (!yamlContent.trim()) {
			return { isValid: false, error: "Empty YAML content" };
		}

		// Check for problematic characters
		if (yamlContent.includes("\t")) {
			return { isValid: false, error: "YAML contains tabs (use spaces)" };
		}

		return { isValid: true };
	}
}

// Export default instance
export const frontMatterService = new FrontMatterService();
