import type { Abstraction, Relationship } from '../types/tutorial';
import type { DiagramConfig } from '../types/tutorial';

export class DiagramService {
	/**
	 * Generates a Mermaid diagram representing the project architecture.
	 */
	generateProjectArchitectureDiagram(
		abstractions: Abstraction[],
		relationships: Relationship[],
		config?: DiagramConfig,
	): string {
		const direction = config?.direction || 'TD';
		let diagram = `graph ${direction};\n`;

		diagram += `    subgraph "${config?.title || 'Project Architecture'}"\n`;

		if (abstractions.length === 0) {
			diagram += '    end';
			return diagram;
		}

		// Define nodes
		abstractions.forEach(abstraction => {
			const id = this.sanitizeForMermaid(abstraction.name);
			const label = this.sanitizeForMermaid(abstraction.name);
			diagram += `        ${id}["${label}"];\n`;
		});

		diagram += '\n';

		// Define relationships
		relationships.forEach(relationship => {
			const fromId = this.sanitizeForMermaid(relationship.from);
			const toId = this.sanitizeForMermaid(relationship.to);
			const sanitizedType = this.sanitizeForMermaid(relationship.type);
			diagram += `        ${fromId} -->|${sanitizedType}| ${toId};\n`;
		});

		diagram += '    end';

		return diagram;
	}

	/**
	 * Sanitizes text to be safely included in Mermaid diagram definitions.
	 * CRITICAL: This prevents rendering failures by replacing characters that can break Mermaid syntax.
	 * The replacement codes (e.g., #quot;) are understood by Mermaid.
	 */
	sanitizeForMermaid(text: string): string {
		if (!text) return '';

		const replacements: { [key: string]: string } = {
			';': '#59;',
			':': '#58;',
			'"': '#quot;',
			'(': '#lpar;',
			')': '#rpar;',
			'{': '#lbrace;',
			'}': '#rbrace;',
			'[': '#91;',
			']': '#93;',
			'<': '#60;',
			'>': '#62;',
			'=': '#61;',
		};

		// Use a single-pass regex replace to avoid replacing parts of the replacement codes themselves.
		const regex = new RegExp(
			Object.keys(replacements)
				.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
				.join('|'),
			'g'
		);

		return text.replace(regex, (match) => replacements[match]);
	}

	/**
	 * Validates the syntax of a Mermaid diagram.
	 */
	validateDiagram(diagramCode: string): { isValid: boolean; error?: string } {
		// Placeholder implementation
		return { isValid: true };
	}

	/**
	 * Determines the appropriate node shape based on abstraction type.
	 */
	determineNodeShape(abstractionType: string): string {
		// Placeholder implementation
		return 'rect';
	}

	/**
	 * Determines the appropriate arrow type based on relationship type.
	 */
	determineArrowType(relationshipType: string): string {
		// Placeholder implementation
		return '-->';
	}
}
