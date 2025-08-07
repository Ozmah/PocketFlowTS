import { describe, it, expect, beforeEach } from "bun:test";
import { MermaidValidator } from '../mermaid-validator';

describe('MermaidValidator', () => {
    let validator: MermaidValidator;

    beforeEach(() => {
        validator = new MermaidValidator();
    });

    it('should instantiate correctly', () => {
        expect(validator).toBeInstanceOf(MermaidValidator);
    });

    it('should return valid for a simple flowchart', () => {
        const code = 'graph TD;\nA-->B;';
        const result = validator.validateDiagramSyntax(code, 'flowchart');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    // The plan specifies placeholder implementations for the validation logic,
    // so we won't test for actual validation errors yet.
    // These tests can be expanded when the validation logic is fully implemented.
    it('should run without throwing errors for different diagram types', () => {
        const code = 'sequenceDiagram;\nAlice->>John: Hello John, how are you?';
        expect(() => validator.validateDiagramSyntax(code, 'sequence')).not.toThrow();

        const classCode = 'classDiagram\nclass Car\nCar : +String brand';
        expect(() => validator.validateDiagramSyntax(classCode, 'class')).not.toThrow();
    });
});
