import { parseCorrectionResult } from '@/lib/ai/ai-orchestrator';
import type { AIAnalysisResult, Task } from '@/types';

/**
 * Punktevergabe bei CalcTrace-Aufgaben mit strukturierten Kriterien.
 *
 * Sandbox-belegte Kriterien (proofA/proofB, Werte-Einsetzung) entscheidet die Engine.
 * Qualitative Kriterien beurteilt das LLM — seine Punktzahl steht aber nur in den
 * correctionNotes und muss dort herausgeparst werden.
 *
 * Realer Fehlerfall: Die aktiven Skills verlangen Korrekturzeichen in den Notizen
 * ("[r] - Rechenweg: korrekt"), der Parser erwartet "- rechnen_weg: 1 / 1". Er fand die
 * ID nicht und setzte das Kriterium stillschweigend auf 0 — eine vollständig korrekte
 * Lösung bekam reproduzierbar 1 von 2 Punkten.
 */

const layout = (): Task[] => ([{
    name: 'Aufgabe 4a',
    maxPoints: 2,
    calcTraceResult: {
        ast: [{ id: 'step_3', formula: '750000 / 1024', result: 732.42, unit: 'MiB' }],
        sandboxErrors: [],
        perTargetResult: [{ targetIndex: 0, reached: true, hasCalculationError: false, associatedStepIds: ['step_3'] }]
    },
    targetGoal: {
        targetValue: 732.422,
        unit: 'MiB',
        maxPoints: 2,
        criteria: [
            { id: 'rechnen_weg', label: 'Rechenweg korrekt (Ansatz und Umrechnung)', punktwert: 1, source: 'llm' },
            { id: 'ergebnis_erreicht', label: 'Ergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 }
        ]
    }
} as unknown as Task]);

const analysis = (
    correctionNotes: string,
    pointsObtained: number,
    criteriaScores?: { id: string; points: number }[]
): AIAnalysisResult => ({
    overallMatchPercentage: 0,
    overallFeedback: '',
    confidence: 95,
    tasks: [{ name: 'Aufgabe 4a', maxPoints: 2, pointsObtained, correctionNotes, criteriaScores, feedback: 'ok', confidence: 95 }]
} as unknown as AIAnalysisResult);

const grade = (notes: string, points: number, criteriaScores?: { id: string; points: number }[]) =>
    parseCorrectionResult(analysis(notes, points, criteriaScores), layout()).tasks[0];

describe('CalcTrace-Kriterien: Punktevergabe', () => {
    it('takes the score from the structured field, whatever the notes look like', () => {
        // Der vorgesehene Weg: strukturiertes Feld statt Prosa-Parsing.
        const task = grade('[r] - Rechenweg nachvollziehbar. [r] - Ergebnis stimmt.', 2, [
            { id: 'rechnen_weg', points: 1 },
            { id: 'ergebnis_erreicht', points: 1 }
        ]);

        expect(task.pointsObtained).toBe(2);
        expect((task as unknown as { correctionNotes: string }).correctionNotes).toContain('rechnen_weg: 1 / 1');
        expect((task as unknown as { correctionNotes: string }).correctionNotes).not.toContain('ohne lesbare Einzelwertung');
    });

    it('lets the structured field win over a contradicting note', () => {
        const task = grade('[Kriterien-Bewertung]\n- rechnen_weg: 0 / 1 (Prosa-Altlast)', 2, [
            { id: 'rechnen_weg', points: 1 }
        ]);

        expect(task.pointsObtained).toBe(2);
    });

    it('still honours the sandbox over the structured field', () => {
        // Die Sandbox hat das Ergebnis bestaetigt — das Modell darf es nicht wegnehmen.
        const task = grade('egal', 0, [
            { id: 'rechnen_weg', points: 0 },
            { id: 'ergebnis_erreicht', points: 0 }
        ]);

        expect(task.pointsObtained).toBe(1);
    });

    it('uses the per-criterion scores when the notes carry the expected format', () => {
        const task = grade('[Kriterien-Bewertung]\n- rechnen_weg: 1 / 1 (nachvollziehbar)\n- ergebnis_erreicht: 1 / 1', 2);

        expect(task.pointsObtained).toBe(2);
    });

    it('falls back to the model total when a criterion score is unreadable', () => {
        // Notizen im Skill-Format: Korrekturzeichen statt "id: x / y".
        const task = grade('[r] - Rechenweg: Umrechnung über KiB nachvollziehbar. [r] - Ergebnis stimmt. Gesamtsumme: 2 Punkte', 2);

        expect(task.pointsObtained).toBe(2);
    });

    it('records why the fallback was used', () => {
        const task = grade('[r] - Rechenweg nachvollziehbar. [r] - Ergebnis stimmt.', 2);

        expect((task as unknown as { correctionNotes: string }).correctionNotes).toContain('ohne lesbare Einzelwertung');
        expect((task as unknown as { correctionNotes: string }).correctionNotes).toContain('Gesamtsumme: 2 Punkte');
    });

    it('never falls below the sandbox-confirmed criteria', () => {
        // Das Modell vergibt 0, obwohl die Sandbox das Ergebnis-Kriterium bestaetigt hat.
        const task = grade('[f] - Alles falsch.', 0);

        expect(task.pointsObtained).toBe(1);
    });

    it('never exceeds the task maximum', () => {
        const task = grade('[r] - Sehr gut.', 99);

        expect(task.pointsObtained).toBe(2);
    });

    it('keeps a readable low score instead of inflating it', () => {
        // Lesbare Einzelwertung: Das Urteil des Modells bleibt stehen, kein Rueckfall.
        const task = grade('[Kriterien-Bewertung]\n- rechnen_weg: 0 / 1 (kein Zwischenschritt notiert)\n- ergebnis_erreicht: 1 / 1', 1);

        expect(task.pointsObtained).toBe(1);
    });
});
