import { parseCorrectionResult } from '@/lib/ai/ai-orchestrator';
import { buildCorrectionPrompt } from '@/lib/ai/prompt-builder';
import type { AIAnalysisResult, Task } from '@/types';
import type { GradingCriterion } from '@/lib/grading/calc-trace-types';

/**
 * Zustaendigkeit von Kriterien (P3).
 *
 * Frueher entschied eine Wortsuche ueber id/label, wer ein Kriterium bewertet — an zwei
 * Stellen mit unterschiedlichen Suchbegriffen. Ein Kriterium konnte deshalb im Prompt zur
 * Beurteilung ausgeschrieben werden, waehrend die Punktevergabe die Antwort des Modells
 * verwarf. Jetzt entscheidet ausschliesslich das Feld `source`.
 */

const layout = (criteria: GradingCriterion[]): Task[] => ([{
    name: 'Aufgabe 1',
    maxPoints: criteria.reduce((sum, c) => sum + c.punktwert, 0),
    calcTraceResult: {
        ast: [{ id: 'step_1', formula: '12 / 6500', result: 1.846, unit: 'mA' }],
        sandboxErrors: [],
        perTargetResult: [{
            targetIndex: 0,
            reached: true,
            hasCorrectValues: true,
            hasCalculationError: false,
            associatedStepIds: ['step_1'],
        }],
    },
    targetGoal: {
        targetValue: 1.846,
        unit: 'mA',
        maxPoints: criteria.reduce((sum, c) => sum + c.punktwert, 0),
        criteria,
    },
} as unknown as Task]);

const analysis = (criteriaScores: { id: string; points: number }[], pointsObtained: number): AIAnalysisResult => ({
    overallMatchPercentage: 0,
    overallFeedback: '',
    confidence: 95,
    tasks: [{
        name: 'Aufgabe 1',
        maxPoints: 2,
        pointsObtained,
        correctionNotes: '',
        criteriaScores,
        feedback: 'ok',
        confidence: 95,
    }],
} as unknown as AIAnalysisResult);

describe('CalcTrace-Kriterien: Zustaendigkeit richtet sich nach `source`', () => {
    describe('Punktevergabe', () => {
        it('entscheidet proofValues ueber die Sandbox, nicht ueber das Modell', () => {
            const criteria: GradingCriterion[] = [
                { id: 'einsetzen', label: 'Werte eingesetzt', punktwert: 1, source: 'proofValues', targetIndex: 0 },
            ];

            // Das Modell vergibt 0 — die Sandbox hat die Einsetzung aber bestaetigt.
            const task = parseCorrectionResult(analysis([{ id: 'einsetzen', points: 0 }], 0), layout(criteria)).tasks[0];

            expect(task.pointsObtained).toBe(1);
        });

        it('ueberlaesst ein llm-Kriterium dem Modell, auch wenn die Bezeichnung nach Einsetzung klingt', () => {
            // Genau der Fall, der frueher auseinanderlief: Das Modell wurde befragt, seine
            // Antwort danach von der Wortsuche ueberschrieben.
            const criteria: GradingCriterion[] = [
                { id: 'q1_einsetzung', label: 'Werte sinnvoll eingesetzt', punktwert: 1, source: 'llm', targetIndex: 0 },
            ];

            const task = parseCorrectionResult(analysis([{ id: 'q1_einsetzung', points: 0 }], 0), layout(criteria)).tasks[0];

            expect(task.pointsObtained).toBe(0);
        });

        it('mischt Engine- und Modell-Kriterien korrekt', () => {
            const criteria: GradingCriterion[] = [
                { id: 'formel', label: 'Formel fachlich korrekt', punktwert: 1, source: 'llm', targetIndex: 0 },
                { id: 'einsetzen', label: 'Werte eingesetzt', punktwert: 1, source: 'proofValues', targetIndex: 0 },
                { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 },
            ];

            const task = parseCorrectionResult(analysis([{ id: 'formel', points: 1 }], 3), layout(criteria)).tasks[0];

            expect(task.pointsObtained).toBe(3);
        });

        it('haelt die Begruendung der Engine in den Korrekturnotizen fest', () => {
            const criteria: GradingCriterion[] = [
                { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 },
            ];

            const task = parseCorrectionResult(analysis([], 1), layout(criteria)).tasks[0];
            const notes = (task as unknown as { correctionNotes: string }).correctionNotes;

            expect(notes).toContain('ergebnis: 1 / 1');
            expect(notes).toContain('Sandbox-bestätigt');
        });
    });

    describe('Prompt-Aufbau', () => {
        const promptFor = (criteria: GradingCriterion[]) =>
            buildCorrectionPrompt('Musterlösung', 'Schülertext', layout(criteria)).system;

        it('fordert nur fuer Modell-Kriterien eine Punktzahl an', () => {
            const criteria: GradingCriterion[] = [
                { id: 'formel', label: 'Formel fachlich korrekt', punktwert: 1, source: 'llm', targetIndex: 0 },
                { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 },
            ];

            const system = promptFor(criteria);
            // Nur den Anforderungssatz betrachten — "criteriaScores" kommt auch im JSON-Schema vor.
            const anforderung = system.split('Gib im Feld "criteriaScores" ausschliesslich')[1]?.split('\n')[0] ?? '';

            expect(anforderung).toContain('"formel"');
            expect(anforderung).not.toContain('"ergebnis"');
        });

        it('weist Engine-Kriterien als bereits entschieden aus', () => {
            const criteria: GradingCriterion[] = [
                { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 },
            ];

            expect(promptFor(criteria)).toContain('bereits von der Sandbox entschieden');
        });

        it('verlangt keine criteriaScores, wenn alles bereits entschieden ist', () => {
            const criteria: GradingCriterion[] = [
                { id: 'einsetzen', label: 'Werte eingesetzt', punktwert: 1, source: 'proofValues', targetIndex: 0 },
                { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 },
            ];

            expect(promptFor(criteria)).toContain('Gib keine "criteriaScores" zurueck');
        });

        it('kuendigt genau das an, was die Punktevergabe spaeter zaehlt', () => {
            // Anti-Drift: Prompt und Punktevergabe leiten ihr Urteil aus derselben Funktion ab.
            const criteria: GradingCriterion[] = [
                { id: 'ergebnis', label: 'Endergebnis erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 },
            ];

            const system = promptFor(criteria);
            const task = parseCorrectionResult(analysis([], 1), layout(criteria)).tasks[0];

            expect(system).toContain('✓ ERFÜLLT');
            expect(task.pointsObtained).toBe(1);
        });
    });
});
