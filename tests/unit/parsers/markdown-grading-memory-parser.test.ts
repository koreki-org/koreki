import { 
    exportGradingMemoryToMarkdown, 
    parseMarkdownGradingMemory 
} from '../../../src/lib/parsers/markdown-grading-memory-parser';
import { GradingMemoryCase } from '../../../src/types';

describe('Markdown GradingMemory Parser (KEP-MD-2) - Unit Verification', () => {
    const sampleCases: GradingMemoryCase[] = [
        {
            id: 'case-1',
            studentText: 'Der Strom beträgt I = U / R = 12V / 4 Ohm = 3A.',
            expectedCorrection: {
                pointsObtained: 10,
                maxPoints: 10,
                correctionNotes: 'Formel korrekt angewendet und richtig berechnet.',
                feedback: 'Sehr gut gelöst!'
            }
        },
        {
            id: 'case-2',
            studentText: 'P = U * I = 230V * 2A = 460W.',
            expectedCorrection: {
                pointsObtained: 5,
                maxPoints: 5,
                correctionNotes: 'Leistung korrekt berechnet.'
            }
        }
    ];

    it('should export GradingMemoryCase array into a clean valid Markdown string', () => {
        const md = exportGradingMemoryToMarkdown('Elektrotechnik Basics', sampleCases);

        expect(md).toContain('---');
        expect(md).toContain('name: "Elektrotechnik Basics"');
        expect(md).toContain('# Erfahrungsschatz: Elektrotechnik Basics');
        expect(md).toContain('[CASE_START]');
        expect(md).toContain('Der Strom beträgt I = U / R = 12V / 4 Ohm = 3A.');
        expect(md).toContain('- Punkte: 10');
        expect(md).toContain('- Begründung: Formel korrekt angewendet und richtig berechnet.');
        expect(md).toContain('- Feedback: Sehr gut gelöst!');
        expect(md).toContain('[CASE_END]');
    });

    it('should parse valid Markdown content back into structured GradingMemory', () => {
        const markdownInput = `---
name: "Physik Formelsammlung"
type: "grading_memory"
version: "1.0.0"
---

# Erfahrungsschatz: Physik Formelsammlung

[CASE_START]
## Fallbeispiel 1

### Schülerantwort:
W = F * s = 100N * 5m = 500J.

### Erwartete Korrektur:
- Punkte: 8
- Begründung: Einheiten und Zahlenwert sind exakt.
- Feedback: Exzellent.
[CASE_END]
`;

        const parsed = parseMarkdownGradingMemory(markdownInput);

        expect(parsed.name).toBe('Physik Formelsammlung');
        expect(parsed.cases.length).toBe(1);
        expect(parsed.cases[0].studentText).toBe('W = F * s = 100N * 5m = 500J.');
        expect(parsed.cases[0].expectedCorrection.pointsObtained).toBe(8);
        expect(parsed.cases[0].expectedCorrection.correctionNotes).toBe('Einheiten und Zahlenwert sind exakt.');
        expect(parsed.cases[0].expectedCorrection.feedback).toBe('Exzellent.');
    });

    it('should handle fallback defaults when frontmatter or feedback is missing', () => {
        const plainInput = `
[CASE_START]
### Schülerantwort:
Testantwort ohne Frontmatter.

### Erwartete Korrektur:
- Punkte: 3
- Begründung: Ausreichend.
[CASE_END]
`;

        const parsed = parseMarkdownGradingMemory(plainInput);

        expect(parsed.name).toBe('Importierter Erfahrungsschatz');
        expect(parsed.cases.length).toBe(1);
        expect(parsed.cases[0].studentText).toBe('Testantwort ohne Frontmatter.');
        expect(parsed.cases[0].expectedCorrection.pointsObtained).toBe(3);
        expect(parsed.cases[0].expectedCorrection.correctionNotes).toBe('Ausreichend.');
        expect(parsed.cases[0].expectedCorrection.feedback).toBeUndefined();
    });
});
