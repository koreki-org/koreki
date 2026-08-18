import { GradingMemoryCase } from '../../types';

/**
 * Industrial Markdown Parser & Exporter for GradingMemory (KEP-MD-2)
 * 🏮🛡️🏛️
 * 
 * Provides dependency-free, robust parsing and serialisation
 * of custom pedagogical experience chests (few-shot calibrations).
 */

/**
 * Schützt die Blockmarken im freien Text.
 *
 * Schreibt eine Lehrkraft `[CASE_END]` in eine Beispielantwort — etwa beim
 * Erläutern genau dieses Formats —, endete der Block beim Einlesen an der
 * falschen Stelle, und das Fallbeispiel verschwand ersatzlos. Das eingefügte
 * Zeichen ist breitenlos: es ist unsichtbar, wenn jemand die Datei liest.
 */
const schuetzeMarken = (text: string): string =>
    text.replace(/\[CASE_(START|END)\]/g, '[CASE_$1​]');

const entschuetzeMarken = (text: string): string =>
    text.replace(/\[CASE_(START|END)​\]/g, '[CASE_$1]');

export function exportGradingMemoryToMarkdown(name: string, cases: GradingMemoryCase[]): string {
    let md = `---\nname: "${name.replace(/"/g, '\\"')}"\ntype: "grading_memory"\nversion: "1.0.0"\n---\n\n`;
    md += `# Erfahrungsschatz: ${name}\n\n`;
    md += `Hier sind die kalibrierten fiktiven Fallbeispiele (Few-Shot), die verwendet werden, um der KI pädagogische Korrekturrichtlinien zu geben:\n\n`;

    cases.forEach((c, idx) => {
        md += `[CASE_START]\n`;
        md += `## Fallbeispiel ${idx + 1}\n\n`;
        // Die Aufgabenzuordnung entscheidet, WELCHER Aufgabe das Beispiel die
        // Messlatte vorgibt. Ohne sie kam der Erfahrungsschatz fachlich
        // entkoppelt zurück — die Oberfläche zeigt sie an ("Fallbeispiel 1
        // (Aufgabe 1)"), der Export ließ sie bis 18.08.2026 weg.
        if (c.taskName) {
            md += `### Aufgabe:\n${c.taskName.trim()}\n\n`;
        }
        md += `### Schülerantwort:\n${schuetzeMarken(c.studentText.trim())}\n\n`;
        md += `### Erwartete Korrektur:\n`;
        md += `- Punkte: ${c.expectedCorrection.pointsObtained}\n`;
        // Ohne die Maximalpunkte ist "3" bedeutungslos: 3 von 3 ist eine
        // Musterlösung, 3 von 10 ein Beispiel für eine schwache Antwort.
        if (c.expectedCorrection.maxPoints !== undefined) {
            md += `- Maximalpunkte: ${c.expectedCorrection.maxPoints}\n`;
        }
        md += `- Begründung: ${schuetzeMarken(c.expectedCorrection.correctionNotes.trim())}\n`;
        if (c.expectedCorrection.feedback) {
            md += `- Feedback: ${schuetzeMarken(c.expectedCorrection.feedback.trim())}\n`;
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

        // Optional und nur in Dateien ab dem 18.08.2026 vorhanden. Ältere
        // Erfahrungsschätze bleiben lesbar — sie haben dann keine Zuordnung,
        // genau wie vorher.
        const taskHeader = "### Aufgabe:";
        const taskIdx = caseBlock.indexOf(taskHeader);
        const taskName = (taskIdx > -1 && (studentTextIdx === -1 || taskIdx < studentTextIdx))
            ? caseBlock.slice(taskIdx + taskHeader.length, studentTextIdx > -1 ? studentTextIdx : undefined).trim()
            : undefined;

        if (studentTextIdx > -1 && expectedCorrectionIdx > studentTextIdx) {
            const studentText = caseBlock.slice(studentTextIdx + studentTextHeader.length, expectedCorrectionIdx).trim();
            const correctionPart = caseBlock.slice(expectedCorrectionIdx + expectedCorrectionHeader.length).trim();
            
            // Extract points, notes, feedback from list items:
            // - Punkte: X
            // - Begründung: Y
            // - Feedback: Z
            let pointsObtained = 0;
            let maxPoints: number | undefined = undefined;
            let correctionNotes = "Gute Lösung.";
            let feedback: string | undefined = undefined;

            /**
             * Ein Wert reicht bis zum nächsten bekannten Schlüssel.
             *
             * Vorher zählte nur die ERSTE Zeile: eine mehrzeilige Begründung —
             * der Normalfall, sie ist ein Absatz — verlor beim Export/Import
             * alles ab Zeile zwei. Die Datei war weiterhin gültig, der
             * Erfahrungsschatz danach aber inhaltlich verstümmelt.
             */
            const SCHLUESSEL = ['- Punkte:', '- Maximalpunkte:', '- Begründung:', '- Feedback:'];
            let offen: string | null = null;
            const gesammelt: Record<string, string[]> = {};

            correctionPart.split(/\r?\n/).forEach(line => {
                const trimmed = line.trim();
                const treffer = SCHLUESSEL.find(k => trimmed.startsWith(k));
                if (treffer) {
                    offen = treffer;
                    gesammelt[treffer] = [trimmed.slice(treffer.length).trim()];
                } else if (offen) {
                    gesammelt[offen].push(line);
                }
            });

            const wert = (k: string): string | undefined =>
                gesammelt[k] ? gesammelt[k].join('\n').trim() : undefined;

            const punkteRoh = wert('- Punkte:');
            if (punkteRoh !== undefined && punkteRoh !== '' && !isNaN(Number(punkteRoh))) {
                pointsObtained = Number(punkteRoh);
            }
            const maxRoh = wert('- Maximalpunkte:');
            if (maxRoh !== undefined && maxRoh !== '' && !isNaN(Number(maxRoh))) {
                maxPoints = Number(maxRoh);
            }
            const begruendung = wert('- Begründung:');
            if (begruendung) correctionNotes = entschuetzeMarken(begruendung);
            const rueckmeldung = wert('- Feedback:');
            if (rueckmeldung) feedback = entschuetzeMarken(rueckmeldung);

            cases.push({
                id: `imported-case-${Date.now()}-${caseIdx++}`,
                studentText: entschuetzeMarken(studentText),
                ...(taskName ? { taskName } : {}),
                expectedCorrection: {
                    pointsObtained,
                    ...(maxPoints !== undefined ? { maxPoints } : {}),
                    correctionNotes,
                    feedback
                }
            });
        }
    }

    return { name, cases };
}
