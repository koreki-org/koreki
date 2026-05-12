import { GradingMemoryCase } from '../../types';

/**
 * Industrial Markdown Parser & Exporter for GradingMemory (KEP-MD-2)
 * 🏮🛡️🏛️
 * 
 * Provides dependency-free, robust parsing and serialisation
 * of custom pedagogical experience chests (few-shot calibrations).
 */

export function exportGradingMemoryToMarkdown(name: string, cases: GradingMemoryCase[]): string {
    let md = `---\nname: "${name.replace(/"/g, '\\"')}"\ntype: "grading_memory"\nversion: "1.0.0"\n---\n\n`;
    md += `# Erfahrungsschatz: ${name}\n\n`;
    md += `Hier sind die kalibrierten fiktiven Fallbeispiele (Few-Shot), die verwendet werden, um der KI pädagogische Korrekturrichtlinien zu geben:\n\n`;

    cases.forEach((c, idx) => {
        md += `[CASE_START]\n`;
        md += `## Fallbeispiel ${idx + 1}\n\n`;
        md += `### Schülerantwort:\n${c.studentText.trim()}\n\n`;
        md += `### Erwartete Korrektur:\n`;
        md += `- Punkte: ${c.expectedCorrection.pointsObtained}\n`;
        md += `- Begründung: ${c.expectedCorrection.correctionNotes.trim()}\n`;
        if (c.expectedCorrection.feedback) {
            md += `- Feedback: ${c.expectedCorrection.feedback.trim()}\n`;
        }
        md += `[CASE_END]\n\n`;
    });

    return md;
}

export function parseMarkdownGradingMemory(content: string): { name: string; cases: GradingMemoryCase[] } {
    // 1. Extract frontmatter
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    let name = "Importierter Erfahrungsschatz";
    let remainingContent = content;

    if (frontmatterMatch) {
        const yamlBlock = frontmatterMatch[1];
        remainingContent = frontmatterMatch[2];
        
        yamlBlock.split(/\r?\n/).forEach(line => {
            const colonIdx = line.indexOf(':');
            if (colonIdx > -1) {
                const key = line.slice(0, colonIdx).trim();
                const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
                if (key === 'name') {
                    name = val;
                }
            }
        });
    }

    // 2. Parse cases using [CASE_START] ... [CASE_END] regex
    const cases: GradingMemoryCase[] = [];
    const caseRegex = /\[CASE_START\]([\s\S]*?)\[CASE_END\]/g;
    let match;
    let caseIdx = 1;

    while ((match = caseRegex.exec(remainingContent)) !== null) {
        const caseBlock = match[1].trim();
        
        // Extract Schülerantwort (between "### Schülerantwort:" and "### Erwartete Korrektur:")
        const studentTextHeader = "### Schülerantwort:";
        const expectedCorrectionHeader = "### Erwartete Korrektur:";
        
        const studentTextIdx = caseBlock.indexOf(studentTextHeader);
        const expectedCorrectionIdx = caseBlock.indexOf(expectedCorrectionHeader);
        
        if (studentTextIdx > -1 && expectedCorrectionIdx > studentTextIdx) {
            const studentText = caseBlock.slice(studentTextIdx + studentTextHeader.length, expectedCorrectionIdx).trim();
            const correctionPart = caseBlock.slice(expectedCorrectionIdx + expectedCorrectionHeader.length).trim();
            
            // Extract points, notes, feedback from list items:
            // - Punkte: X
            // - Begründung: Y
            // - Feedback: Z
            let pointsObtained = 0;
            let correctionNotes = "Gute Lösung.";
            let feedback: string | undefined = undefined;
            
            correctionPart.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('- Punkte:')) {
                    pointsObtained = Number(trimmed.replace('- Punkte:', '').trim());
                } else if (trimmed.startsWith('- Begründung:')) {
                    correctionNotes = trimmed.replace('- Begründung:', '').trim();
                } else if (trimmed.startsWith('- Feedback:')) {
                    feedback = trimmed.replace('- Feedback:', '').trim();
                }
            });
            
            cases.push({
                id: `imported-case-${Date.now()}-${caseIdx++}`,
                studentText,
                expectedCorrection: {
                    pointsObtained,
                    correctionNotes,
                    feedback
                }
            });
        }
    }

    return { name, cases };
}
