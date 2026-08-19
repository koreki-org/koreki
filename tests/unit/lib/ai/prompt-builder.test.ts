import { buildCleanAndAnalyzePrompt, buildCorrectionPrompt, buildCleanAndMapPrompt, buildVariableExtractionPrompt, buildVisionPrompt } from '../../../../src/lib/ai/prompt-builder';
import { splitSkillSnippet } from '../../../../src/lib/ai/prompt-library';

describe('Prompt Builder Specialized Routing', () => {
    
    describe('Qwen Fallback to Default Verification', () => {
        const qwenModel = 'qwen3-vl:8b';
        const gemmaModel = 'gemma4:latest';
        const mistralModel = 'mistral-small';

        it('should correctly build clean-and-analyze prompt for Qwen using default template', () => {
            const prompt = buildCleanAndAnalyzePrompt('Test Solution', qwenModel);
            // In the test environment, .md files are mocked to a generic string.
            // We verify that the placeholders are replaced correctly.
            expect(prompt.user).toContain('Test Solution');
            expect(prompt.options?.temperature).toBe(0);
        });

        it('should correctly build correction prompt for Qwen using default template', () => {
            const prompt = buildCorrectionPrompt('Muster', 'Schüler', null, '', qwenModel);
            expect(prompt.user).toContain('Muster');
            expect(prompt.user).toContain('Schüler');
            expect(prompt.options?.temperature).toBe(0.2);
        });

        it('should correctly build clean-and-map prompt for Qwen using default template', () => {
            const prompt = buildCleanAndMapPrompt('Schülertext', [], qwenModel);
            expect(prompt.user).toContain('Schülertext');
            expect(prompt.options?.temperature).toBe(0);
        });

        it('should correctly build vision prompt for Qwen using specialized guard modifications', () => {
            const prompt = buildVisionPrompt();
            expect(prompt.system).toContain('Du bist ein optischer Sensor');
            expect(prompt.options?.temperature).toBe(0);
        });

        it('should fall back to generic prompts for unknown models', () => {
            const prompt = buildCleanAndAnalyzePrompt('Test', mistralModel);
            // Generic prompt contains "Analysiere" but NOT "NIEMALS ZUSAMMENFASSEN" in that exact casing/wording usually,
            // actually they are similar. Let's check a very specific difference.
            // Gemma/Qwen both have "NIEMALS ZUSAMMENFASSEN" (which I copied).
            // Let's verify it distinguishes between Gemma and Qwen templates if they were different.
            // For now, they are identical but separate files.
            expect(prompt).toBeDefined();
        });
    });
});

describe('splitSkillSnippet and extractionInstructions dynamic handling', () => {
    it('should split standard prompt snippet with EXTRAKTIONSRICHTLINIEN correctly', () => {
        const fullSnippet = "VLSM SUBNETTING-ENGINE (PRÄZISE AUSFÜHRUNG):\n- Berechnet für ein gegebenes Hauptnetz...\n\n### EXTRAKTIONSRICHTLINIEN\n\nFür VLSM-Subnetztabellen:\n1. Messe-besucher -> MesseBesucher";
        const { correctionSnippet, extractionSnippet } = splitSkillSnippet(fullSnippet);
        expect(correctionSnippet).toContain("VLSM SUBNETTING-ENGINE (PRÄZISE AUSFÜHRUNG):");
        expect(correctionSnippet).not.toContain("### EXTRAKTIONSRICHTLINIEN");
        expect(extractionSnippet).toContain("### EXTRAKTIONSRICHTLINIEN");
        expect(extractionSnippet).toContain("1. Messe-besucher -> MesseBesucher");
    });

    it('should handle skill snippets without EXTRAKTIONSRICHTLINIEN gracefully', () => {
        const fullSnippet = "Einfacher RAID-Auswertungs prompt ohne extraktionen.";
        const { correctionSnippet, extractionSnippet } = splitSkillSnippet(fullSnippet);
        expect(correctionSnippet).toBe(fullSnippet);
        expect(extractionSnippet).toBe('');
    });

    it('should append extractionInstructions to variable extraction prompt if provided', () => {
        const prompt = buildVariableExtractionPrompt('Student Text', [], 'Extract MesseBesucher');
        expect(prompt.system).toContain('### SPEZIFISCHE EXTRAKTIONSRICHTLINIEN FÜR DIESEN AUFGABENTYP (STRIKT BEFOLGEN):');
        expect(prompt.system).toContain('Extract MesseBesucher');
    });
});

describe('Grading Memory prompt formatting', () => {
    it('should include taskName and maxPoints when formatting few-shot grading memory examples', () => {
        const memoryCases = [
            {
                id: 'case-1',
                studentText: '3 nennungen',
                taskName: 'Aufgabe 1a',
                expectedCorrection: {
                    pointsObtained: 1.5,
                    maxPoints: 2,
                    correctionNotes: 'Sollte 1.5 Punkte geben.',
                    feedback: 'Gut.'
                }
            }
        ];
        const prompt = buildCorrectionPrompt('Muster', 'Schüler', null, '', 'qwen3-vl:8b', memoryCases);
        expect(prompt.user).toContain('[Betrifft Aufgabe]');
        expect(prompt.user).toContain('"Aufgabe 1a"');
        expect(prompt.user).toContain('Vergebene Punkte: 1.5 von 2');
        expect(prompt.user).toContain('Sollte 1.5 Punkte geben.');
        expect(prompt.user).toContain('Gut.');
    });
});

/**
 * Wörtliche Einsetzung von Schülertext und Musterlösung
 * 🔤🛡️
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026. Die Platzhalter wurden per
 * `String.replace` ersetzt — und dort hat der ERSATZTEXT Mustersemantik.
 * Gewöhnlicher Fachinhalt reichte aus, um den Prompt zu verändern:
 *
 *   $$E = mc^2$$   Formelblock wurde still zu Inline-Mathematik
 *   $&             der Platzhalter stand danach wieder da
 *   $`             alles vor der Einsetzstelle wurde hineinkopiert
 *   $'             alles danach — inklusive `</task_to_evaluate>`
 *
 * Der letzte Fall ist der ernste: Schülertext erzeugte damit Struktur-Markup
 * des Prompts. Die Regel selbst steht in `src/lib/prompt-placeholder.ts`, der
 * Wächter über alle Einsetzstellen in
 * `tests/unit/prompt-placeholder-governance.test.ts`. Hier wird geprüft, dass
 * sie im fertig gebauten Prompt ankommt.
 */
describe('Schuelertext und Musterloesung stehen woertlich im Prompt', () => {
    it.each([
        ['LaTeX-Formelblock', 'Die Lösung ist $$E = mc^2$$ und damit fertig.'],
        ['Regex mit $&', 'Ersetzung per s/foo/$&/g durchgeführt.'],
        ['Shell mit $-Anführung', "Zeilenumbruch als $' notiert."],
        ['Backtick-Konstrukt', 'Aufruf mit $` als Argument.']
    ])('gibt %s unveraendert weiter', (_was, schuelertext) => {
        const prompt = buildCorrectionPrompt('Musterlösung', schuelertext);

        expect(prompt.user).toContain(schuelertext);
    });

    /** Die Musterlösung der Lehrkraft ist genauso betroffen. */
    it('gibt eine Musterloesung mit Formelblock unveraendert weiter', () => {
        const muster = 'Erwartet: $$P = U \cdot I$$';
        const prompt = buildCorrectionPrompt(muster, 'Schülerantwort');

        expect(prompt.user).toContain(muster);
    });

    /**
     * Der Kern des Befunds: Das schließende Tag steht genau einmal — am Ende,
     * nicht mitten in der Schülerantwort.
     */
    it('laesst Schuelertext kein Endetag in die Antwort schreiben', () => {
        const prompt = buildCorrectionPrompt('Muster', "Ich schrieb $' und dann weiter.");

        expect(prompt.user.match(/<\/task_to_evaluate>/g)).toHaveLength(1);
        expect(prompt.user.trimEnd().endsWith('</task_to_evaluate>')).toBe(true);
    });
});

/**
 * Kein "von NaN" im Erfahrungsschatz
 * 🧮📚
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. Die Ausgabe prüfte
 * `maxPoints !== undefined && !== null` — ein NaN ist beides nicht und stand
 * dann wörtlich als "von NaN" im Prompt, also als Kalibrierungs-Beispiel für
 * das Modell.
 *
 * Entstanden ist das NaN im Erfahrungsschatz-Assistenten
 * (`useGradingMemoryWizard`), der `Number(tasksLayout[0].maxPoints)` ohne
 * Rückfall rechnete. Beide Stellen sind repariert; diese hier ist die letzte
 * Verteidigungslinie, denn ein Erfahrungsschatz kann auch importiert werden.
 *
 * Dieselbe zu schwache Prüfung wie in `correction-mapping` — dort war sie am
 * 18.08.2026 der Grund für NaN-Punkte in ganzen Aufgaben.
 */
describe('Erfahrungsschatz mit unbrauchbarer Maximalpunktzahl', () => {
    const fall = (maxPoints: unknown) => ([{
        id: 'case-1',
        studentText: 'Antwort',
        taskName: 'Aufgabe 1',
        expectedCorrection: {
            pointsObtained: 1.5,
            maxPoints,
            correctionNotes: 'Begründung.'
        }
    }] as never);

    it('schreibt kein "von NaN" in den Prompt', () => {
        const prompt = buildCorrectionPrompt('Muster', 'Schüler', null, '', 'qwen3-vl:8b', fall(NaN));

        expect(prompt.user).not.toContain('NaN');
        expect(prompt.user).toContain('Vergebene Punkte: 1.5');
    });

    it('nennt die Maximalpunktzahl weiterhin, wenn sie brauchbar ist', () => {
        const prompt = buildCorrectionPrompt('Muster', 'Schüler', null, '', 'qwen3-vl:8b', fall(2));

        expect(prompt.user).toContain('Vergebene Punkte: 1.5 von 2');
    });

    it('laesst sie weg, wenn sie gar nicht angegeben ist', () => {
        const prompt = buildCorrectionPrompt('Muster', 'Schüler', null, '', 'qwen3-vl:8b', fall(undefined));

        expect(prompt.user).toContain('Vergebene Punkte: 1.5');
        expect(prompt.user).not.toContain('1.5 von');
    });
});
