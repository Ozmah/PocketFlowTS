import { describe, it, expect, beforeEach } from "bun:test";
import { DiagramService } from '../diagram-service';
import type { Abstraction, Relationship } from '../../types/tutorial';

describe('DiagramService', () => {
    let diagramService: DiagramService;

    beforeEach(() => {
        diagramService = new DiagramService();
    });

    describe('sanitizeForMermaid', () => {
        it('should handle empty, null, or undefined input', () => {
            expect(diagramService.sanitizeForMermaid('')).toBe('');
            // @ts-ignore
            expect(diagramService.sanitizeForMermaid(null)).toBe('');
            // @ts-ignore
            expect(diagramService.sanitizeForMermaid(undefined)).toBe('');
        });

        it('should sanitize special Mermaid characters', () => {
            const input = `This has "quotes" and (parentheses) and {braces} and [brackets] and < and > and ; and : and =`;
            const expected = `This has #quot;quotes#quot; and #lpar;parentheses#rpar; and #lbrace;braces#rbrace; and #91;brackets#93; and #60; and #62; and #59; and #58; and #61;`;
            expect(diagramService.sanitizeForMermaid(input)).toBe(expected);
        });

        it('should not affect text without special characters', () => {
            const input = 'This is a simple text';
            expect(diagramService.sanitizeForMermaid(input)).toBe(input);
        });

        it('should handle multi-line text', () => {
            const input = `Line 1: some text;\nLine 2 "more" text.`;
            const expected = `Line 1#58; some text#59;\nLine 2 #quot;more#quot; text.`;
            expect(diagramService.sanitizeForMermaid(input)).toBe(expected);
        });

        it('should handle non-English characters', () => {
            const input = '你好世界 and (你好)';
            const expected = '你好世界 and #lpar;你好#rpar;';
            expect(diagramService.sanitizeForMermaid(input)).toBe(expected);
        });
    });

    describe('generateProjectArchitectureDiagram', () => {
        it('should generate a basic flowchart diagram', () => {
            const abstractions: Abstraction[] = [
                { name: 'ServiceA', description: 'A service', files: [], codeExamples: [] },
                { name: 'ServiceB', description: 'B service', files: [], codeExamples: [] },
            ];
            const relationships: Relationship[] = [
                { from: 'ServiceA', to: 'ServiceB', type: 'uses', description: 'uses' },
            ];

            const diagram = diagramService.generateProjectArchitectureDiagram(abstractions, relationships);
            expect(diagram).toContain('graph TD');
            expect(diagram).toContain('ServiceA["ServiceA"]');
            expect(diagram).toContain('ServiceB["ServiceB"]');
            expect(diagram).toContain('ServiceA -->|uses| ServiceB');
        });

        it('should handle empty inputs gracefully', () => {
            const diagram = diagramService.generateProjectArchitectureDiagram([], []);
            expect(diagram).toBe('graph TD;\n    subgraph "Project Architecture"\n    end');
        });
    });

    describe('validateDiagram', () => {
        it('should return valid for a correct diagram', () => {
            const code = 'graph TD;\nA-->B;';
            const result = diagramService.validateDiagram(code);
            expect(result.isValid).toBe(true);
        });
    });
});
