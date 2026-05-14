import { parseMarkdownProfile } from '../../../src/lib/parsers/markdown-profile-parser';

describe('Markdown Profile Parser (Layer 1 Unit) 🧪🏮🛡️', () => {
    it('should correctly parse valid markdown with YAML frontmatter', () => {
        const md = `---
id: "test-id"
name: "Test Name"
isSystem: true
---
This is the prompt content.
It has multiple lines.`;

        const result = parseMarkdownProfile(md);
        expect(result.metadata.id).toBe('test-id');
        expect(result.metadata.name).toBe('Test Name');
        expect(result.metadata.isSystem).toBe(true);
        expect(result.correctionPrompt).toBe('This is the prompt content.\nIt has multiple lines.');
    });

    it('should handle optional metadata fields like category', () => {
        const md = `---
id: "skill-id"
name: "Skill Name"
category: "math-science"
---
Skill content`;

        const result = parseMarkdownProfile(md);
        expect(result.metadata.id).toBe('skill-id');
        expect(result.metadata.category).toBe('math-science');
    });

    it('should fall back to raw content if frontmatter is missing (resilience check)', () => {
        const md = `Just raw content without frontmatter`;
        const result = parseMarkdownProfile(md);
        
        expect(result.correctionPrompt).toBe('Just raw content without frontmatter');
        expect(result.metadata.name).toBe('Importierter Prompt');
    });
});
