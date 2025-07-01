// AI Service using Vercel AI SDK with structured JSON outputs
// Replaces YAML-based approach with structured AI SDK responses

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type {
	AnalyzeRelationshipsOutput,
	FetchedFile,
	IdentifyAbstractionsOutput,
	OrderChaptersOutput,
	WriteChapterOutput,
} from "../types/tutorial";

// Zod schemas for structured outputs
const abstractionSchema = z.object({
	name: z.string().describe("Name of the code abstraction or concept"),
	description: z
		.string()
		.describe("Detailed description of what this abstraction does"),
	files: z
		.array(z.string())
		.describe("List of file paths that contain this abstraction"),
	importance: z.number().min(1).max(10).describe("Importance score from 1-10"),
	codeExamples: z
		.array(z.string())
		.describe("Key code snippets that demonstrate this abstraction"),
});

const relationshipSchema = z.object({
	from: z.string().describe("Source abstraction name"),
	to: z.string().describe("Target abstraction name"),
	type: z
		.enum(["uses", "extends", "implements", "contains", "depends_on"])
		.describe("Type of relationship"),
	description: z.string().describe("Description of how they relate"),
	strength: z
		.number()
		.min(1)
		.max(10)
		.describe("Relationship strength from 1-10"),
});

const analyzeRelationshipsSchema = z.object({
	projectSummary: z.string().describe("Comprehensive project analysis summary"),
	relationships: z
		.array(relationshipSchema)
		.describe("Relationships between abstractions"),
	keyInsights: z
		.array(z.string())
		.describe("Key architectural insights and patterns"),
});

const chapterOrderSchema = z.object({
	abstraction: z.string().describe("Name of the abstraction"),
	order: z.number().describe("Order in tutorial (1-based)"),
	reasoning: z
		.string()
		.describe("Why this abstraction should be taught at this point"),
});

const orderChaptersSchema = z.object({
	orderedChapters: z
		.array(chapterOrderSchema)
		.describe("Abstractions ordered for optimal learning"),
	pedagogicalFlow: z
		.string()
		.describe("Explanation of the learning progression logic"),
});

const sectionSchema = z.object({
	heading: z.string().describe("Section heading"),
	content: z.string().describe("Section content in markdown format"),
	codeExamples: z.array(z.string()).describe("Code examples for this section"),
});

const writeChapterSchema = z.object({
	title: z.string().describe("Chapter title"),
	description: z.string().describe("Brief chapter description"),
	introduction: z.string().describe("Chapter introduction in markdown"),
	sections: z.array(sectionSchema).describe("Chapter sections with content"),
	conclusion: z.string().describe("Chapter conclusion in markdown"),
	relatedConcepts: z
		.array(z.string())
		.describe("Related concepts to explore further"),
	technologies: z
		.array(z.string())
		.describe(
			"Technologies, frameworks, libraries, and tools used in this chapter",
		),
});

export class AIService {
	private model;

	constructor() {
		// Might add apiKey?: string as a parameter
		this.model = google("gemini-2.5-pro");
	}

	async identifyAbstractions(
		files: FetchedFile[],
		projectName: string,
		maxAbstractions: number = 8,
	): Promise<IdentifyAbstractionsOutput> {
		const filesContext = files
			.map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
			.join("\n\n");

		const prompt = `You are a code analysis expert. Analyze this ${projectName} project and identify the key code abstractions, patterns, and concepts that would be important to teach in a tutorial.

Project Files:
${filesContext}

Focus on:
- Design patterns and architectural concepts
- Reusable components and utilities
- Important algorithms or business logic
- Testing patterns and strategies
- Type definitions and interfaces

Identify up to ${maxAbstractions} most important abstractions that a developer should understand to work with this codebase effectively.`;

		const dynamicAbstractionsSchema = z.object({
			abstractions: z
				.array(abstractionSchema)
				.max(maxAbstractions)
				.describe("List of identified code abstractions"),
			summary: z
				.string()
				.describe("Overall project summary and architectural insights"),
		});

		const result = await generateObject({
			model: this.model,
			schema: dynamicAbstractionsSchema,
			prompt,
			temperature: 0.3,
		});

		return result.object;
	}

	async analyzeRelationships(
		abstractions: IdentifyAbstractionsOutput["abstractions"],
		files: FetchedFile[],
	): Promise<AnalyzeRelationshipsOutput> {
		const abstractionsContext = abstractions
			.map((a) => `- ${a.name}: ${a.description}`)
			.join("\n");

		const filesContext = files
			.slice(0, 5)
			.map(
				(f) =>
					`File: ${f.path}\n\`\`\`\n${f.content.slice(0, 1000)}...\n\`\`\``,
			)
			.join("\n\n");

		const prompt = `You are a software architecture expert. Analyze the relationships between these identified abstractions in the codebase.

Identified Abstractions:
${abstractionsContext}

Code Context:
${filesContext}

Analyze how these abstractions relate to each other:
- Which abstractions use or depend on others?
- What are the inheritance or composition relationships?
- How do they work together to form the overall architecture?
- What are the key architectural insights and patterns?

Provide a comprehensive analysis of the project's architecture and the relationships between its key concepts.`;

		const result = await generateObject({
			model: this.model,
			schema: analyzeRelationshipsSchema,
			prompt,
			temperature: 0.2,
		});

		return result.object;
	}

	async orderChapters(
		abstractions: IdentifyAbstractionsOutput["abstractions"],
		relationships: AnalyzeRelationshipsOutput["relationships"],
	): Promise<OrderChaptersOutput> {
		const abstractionsContext = abstractions
			.map((a) => `- ${a.name}: ${a.description} (importance: ${a.importance})`)
			.join("\n");

		const relationshipsContext = relationships
			.map((r) => `- ${r.from} ${r.type} ${r.to}: ${r.description}`)
			.join("\n");

		const prompt = `You are an educational content expert. Given these code abstractions and their relationships, determine the optimal order for teaching them in a tutorial.

Abstractions:
${abstractionsContext}

Relationships:
${relationshipsContext}

Consider these pedagogical principles:
- Start with foundational concepts before building on them
- Teach dependencies before dependent concepts
- Progress from simple to complex
- Ensure each chapter builds logically on previous ones
- Consider the natural learning progression for developers

Order the abstractions from 1 (first to teach) to ${abstractions.length} (last to teach) and explain your pedagogical reasoning.`;

		const result = await generateObject({
			model: this.model,
			schema: orderChaptersSchema,
			prompt,
			temperature: 0.2,
		});

		return result.object;
	}

	async writeChapter(
		abstraction: IdentifyAbstractionsOutput["abstractions"][0],
		files: FetchedFile[],
		relatedAbstractions: string[],
		chapterNumber: number,
		language: string = "english",
	): Promise<WriteChapterOutput> {
		const relevantFiles = files.filter((f) =>
			abstraction.files.includes(f.path),
		);

		const filesContext = relevantFiles
			.map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
			.join("\n\n");

		const relatedContext =
			relatedAbstractions.length > 0
				? `\n\nRelated concepts to reference: ${relatedAbstractions.join(", ")}`
				: "";

		const prompt = `You are a technical writing expert. Write a tutorial chapter about "${abstraction.name}" in ${language}. This will be chapter ${chapterNumber} of the tutorial.

Abstraction Details:
- Name: ${abstraction.name}
- Description: ${abstraction.description}
- Importance: ${abstraction.importance}/10

Relevant Code Files:
${filesContext}${relatedContext}

Write a comprehensive tutorial chapter that:
- Explains the concept clearly with practical examples
- Shows how to implement and use this abstraction
- Includes real code examples from the provided files
- Explains best practices and common patterns
- Connects to related concepts when relevant
- Is educational and easy to follow

Structure the chapter with:
- A clear introduction explaining what will be learned
- Multiple sections with detailed explanations and code examples  
- A conclusion that reinforces key takeaways
- References to related concepts for further exploration

Additionally, identify and list all technologies used in this chapter:
- Programming languages (TypeScript, JavaScript, etc.)
- Frameworks and libraries (Elysia.js, React, Express, etc.)
- Tools and utilities (npm, Docker, Git, etc.)
- Databases and services (PostgreSQL, Redis, AWS, etc.)
- Testing frameworks (Jest, Vitest, etc.)
- Any other technical tools or platforms mentioned or demonstrated

IMPORTANT: For the title field, provide ONLY the descriptive title without any "Chapter X:" prefix. The chapter numbering will be handled separately.

Write in a clear, educational tone suitable for developers learning this codebase.`;

		const result = await generateObject({
			model: this.model,
			schema: writeChapterSchema,
			prompt,
			temperature: 0.4,
		});

		return result.object;
	}

	async getUsageStats(): Promise<{ totalTokens: number; model: string }> {
		// Note: In a real implementation, you would track usage stats
		// The AI SDK provides usage information in the response
		return {
			totalTokens: 0, // This would be tracked across calls
			model: "gemini-2.5-pro",
		};
	}
}
