import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test";
import { z } from "zod";
import { AIService } from "../ai-service";
import { CacheService } from "../cache-service";

// Mock the 'ai' library to avoid actual LLM calls
let generateObjectCallCount = 0;
mock.module("ai", () => {
	return {
		generateObject: (args: { schema: any; prompt: string }) => {
			generateObjectCallCount++;
			if (args.prompt.includes("abstractions")) {
				return {
					object: {
						abstractions: [{ name: "mocked abstraction", files: [], importance: 5, codeExamples: [], description: "" }],
						summary: "mocked summary",
					},
					usage: { totalTokens: 100 },
				};
			}
			return {
				object: { mocked: true, prompt: args.prompt },
				usage: { totalTokens: 50 },
			};
		},
		generateText: () => {
			// Not used in these tests, but good to have a mock
			return { text: "mocked text", usage: { totalTokens: 20 } };
		},
	};
});


describe("AIService Cache Integration", () => {
	let aiService: AIService;
	let cacheService: CacheService;

	beforeAll(() => {
		aiService = new AIService();
		cacheService = CacheService.getInstance();
	});

	afterEach(async () => {
		await cacheService.clear();
		generateObjectCallCount = 0; // Reset mock call counter
	});

	describe("generateObjectWithCache", () => {
		const prompt = "test prompt for generateObjectWithCache";
		const schema = z.object({ mocked: z.boolean(), prompt: z.string() });

		it("should call the AI model on cache miss and store the result", async () => {
			// First call (miss)
			const result1 = await aiService.generateObjectWithCache(prompt, schema, {});
			expect(result1.cached).toBe(false);
			expect(result1.object.mocked).toBe(true);
			expect(generateObjectCallCount).toBe(1);

			// Check if it's in the cache now
			const cachedResponse = await cacheService.get(prompt, "gemini", { schema });
			expect(cachedResponse).toBeDefined();
			expect(JSON.parse(cachedResponse!)).toEqual({ mocked: true, prompt });
		});

		it("should return from cache on a cache hit and not call the AI model", async () => {
			// First call (miss)
			await aiService.generateObjectWithCache(prompt, schema, {});
			expect(generateObjectCallCount).toBe(1);

			// Second call (hit)
			const result2 = await aiService.generateObjectWithCache(prompt, schema, {});
			expect(result2.cached).toBe(true);
			expect(result2.object.mocked).toBe(true);
			expect(generateObjectCallCount).toBe(1); // Should not have increased
		});

		it("should bypass cache and call AI model if useCache is false", async () => {
			// First call (miss, but stores in cache)
			await aiService.generateObjectWithCache(prompt, schema, {});
			expect(generateObjectCallCount).toBe(1);

			// Second call (should be hit, but cache is disabled)
			const result2 = await aiService.generateObjectWithCache(prompt, schema, { useCache: false });
			expect(result2.cached).toBe(false); // Reports as not cached because we bypassed it
			expect(generateObjectCallCount).toBe(2); // Should have increased
		});

		it("should treat a schema change as a cache miss", async () => {
			const schema1 = z.object({ mocked: z.boolean(), prompt: z.string() });
			const schema2 = z.object({ different: z.boolean() });

			// First call with schema1
			await aiService.generateObjectWithCache(prompt, schema1, {});
			expect(generateObjectCallCount).toBe(1);

			// Second call with schema2 should be a miss
			await aiService.generateObjectWithCache(prompt, schema2, {});
			expect(generateObjectCallCount).toBe(2);
		});
	});

	describe("High-level method integration (identifyAbstractions)", () => {
		it("should use cache on subsequent calls to identifyAbstractions", async () => {
			const files = [{ path: "test.ts", content: "const a = 1;", size: 12 }];
			const projectName = "test-project";

			// First call
			const result1 = await aiService.identifyAbstractions(files, projectName, 8, {});
			expect(generateObjectCallCount).toBe(1);
			expect(result1.object.abstractions[0].name).toBe("mocked abstraction");

			// Second call
			const result2 = await aiService.identifyAbstractions(files, projectName, 8, {});
			expect(generateObjectCallCount).toBe(1); // Should not have increased
			expect(result2.object.abstractions[0].name).toBe("mocked abstraction");
		});
	});
});
