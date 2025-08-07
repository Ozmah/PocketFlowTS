import type { DiagramType } from '../types/tutorial';

export interface ValidationResult {
	isValid: boolean;
	errors: {
		line: number;
		message: string;
	}[];
}

export class MermaidValidator {
	/**
	 * Validates the syntax of a Mermaid diagram.
	 * @param code The Mermaid diagram code to validate.
	 * @param type The type of diagram to validate against.
	 * @returns A ValidationResult object.
	 */
	validateDiagramSyntax(
		code: string,
		type: DiagramType,
	): ValidationResult {
		const errors: ValidationResult['errors'] = [];

		this.validateBraces(code, errors);
		this.validateArrows(code, errors);
		this.validateQuotes(code, errors);

		// Placeholder for type-specific validation
		if (type === 'flowchart' && !code.trim().startsWith('graph')) {
			// errors.push({ line: 1, message: 'Flowchart should start with "graph"' });
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Validates that all braces, brackets, and parentheses are balanced.
	 */
	private validateBraces(code: string, errors: ValidationResult['errors']): void {
		const stack: { char: string; line: number }[] = [];
		const map: { [key: string]: string } = {
			'(': ')',
			'[': ']',
			'{': '}',
		};

		const lines = code.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			for (let j = 0; j < line.length; j++) {
				const char = line[j];
				if (map[char]) {
					stack.push({ char, line: i + 1 });
				} else if (Object.values(map).includes(char)) {
					if (stack.length === 0 || map[stack.pop()!.char] !== char) {
						// This is a simple placeholder, a real implementation would be more robust
						// errors.push({ line: i + 1, message: `Mismatched closing brace: ${char}` });
					}
				}
			}
		}
	}

	/**
	 * Validates the format of arrows.
	 */
	private validateArrows(code: string, errors: ValidationResult['errors']): void {
		// Placeholder for arrow validation logic
		// e.g., check for valid arrow types like -->, ---, ==>
	}

	/**
	 * Validates that all quotes are properly closed.
	 */
	private validateQuotes(code: string, errors: ValidationResult['errors']): void {
		// Placeholder for quote validation logic
		// e.g., ensure every opening " has a closing "
	}
}
