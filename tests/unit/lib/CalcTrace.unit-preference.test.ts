/**
 * CalcTrace: Welcher Rechenschritt wird als Fundstelle des Zielwerts gemeldet?
 *
 * Rechnet ein Schüler über eine Zwischeneinheit zum Ziel, sind mehrere Schritte
 * physikalisch gleichwertig mit dem Zielwert. Gemeldet werden muss der Schritt, der
 * die ERWARTETE Einheitsbezeichnung trägt — sonst liest das Hybrid-Grading-LLM im
 * Beweis einen Zwischenschritt in fremder Einheit und verweigert den Punkt für das
 * Endergebnis.
 */

import { evaluateCalcTrace, formatCalcTraceFeedback } from '@/lib/grading/CalcTrace';
import type { StudentASTStep, TargetGoal } from '@/lib/grading/calc-trace-types';

const findDetail = (result: ReturnType<typeof evaluateCalcTrace>) => (result.unitDetails || [])[0];

describe('CalcTrace — Fundstelle bei gleichwertigen Zwischeneinheiten', () => {
    // Realer Fall: 1.500.000 Zeilen à 512 Byte, Ziel 732,422 MiB.
    // Der Schüler rechnet über KiB — 750.000 KiB sind exakt 732,42 MiB.
    const bytesToMiB: StudentASTStep[] = [
        { id: 'step_1', formula: '1500000 * 512', result: 768000000, unit: 'Byte' },
        { id: 'step_2', formula: '768000000 / 1024', result: 750000, unit: 'KiB' },
        { id: 'step_3', formula: '750000 / 1024', result: 732.42, unit: 'MiB' }
    ];
    const targetMiB: TargetGoal = { targetValue: 732.422, unit: 'MiB', maxPoints: 2 };

    it('reports the step carrying the expected unit, not the equivalent intermediate one', () => {
        const detail = findDetail(evaluateCalcTrace(bytesToMiB, targetMiB));

        expect(detail?.stepId).toBe('step_3');
        expect(detail?.studentUnit).toBe('MiB');
        expect(detail?.isExactMatch).toBe(true);
    });

    it('names that step in the proof handed to the grading model', () => {
        const result = evaluateCalcTrace(bytesToMiB, targetMiB);
        const proof = formatCalcTraceFeedback(result, targetMiB);

        expect(proof).toContain('Gefunden in step_3');
        expect(proof).not.toContain('Gefunden in step_2');
    });

    it('still reports the equivalent step when the expected unit never appears', () => {
        // Der Schüler hört nach KiB auf — dann ist step_2 die einzige Fundstelle
        // und muss weiterhin als Treffer gelten.
        const detail = findDetail(evaluateCalcTrace(bytesToMiB.slice(0, 2), targetMiB));

        expect(detail?.stepId).toBe('step_2');
        expect(detail?.isExactMatch).toBe(true);
    });

    it('generalises beyond byte units — mW intermediate, W expected', () => {
        const ast: StudentASTStep[] = [
            { id: 'step_1', formula: '1500 * 1', result: 1500, unit: 'mW' },
            { id: 'step_2', formula: '1500 / 1000', result: 1.5, unit: 'W' }
        ];
        const target: TargetGoal = { targetValue: 1.5, unit: 'W', maxPoints: 2 };

        expect(findDetail(evaluateCalcTrace(ast, target))?.stepId).toBe('step_2');
    });

    it('keeps preferring a labelled step over one without a unit', () => {
        const ast: StudentASTStep[] = [
            { id: 'step_1', formula: '3 / 2', result: 1.5 },
            { id: 'step_2', formula: '1.5 * 1', result: 1.5, unit: 'W' }
        ];
        const target: TargetGoal = { targetValue: 1.5, unit: 'W', maxPoints: 2 };
        const detail = findDetail(evaluateCalcTrace(ast, target));

        expect(detail?.stepId).toBe('step_2');
        expect(detail?.studentUnit).toBe('W');
    });

    it('takes the first step when it already carries the expected unit', () => {
        // Regression: Der bisherige Abbruch beim ersten Volltreffer bleibt erhalten.
        const ast: StudentASTStep[] = [
            { id: 'step_1', formula: '3 / 2', result: 1.5, unit: 'W' },
            { id: 'step_2', formula: '1.5 * 1000', result: 1500, unit: 'mW' }
        ];
        const target: TargetGoal = { targetValue: 1.5, unit: 'W', maxPoints: 2 };

        expect(findDetail(evaluateCalcTrace(ast, target))?.stepId).toBe('step_1');
    });

    it('leaves the goal reached in every equivalent-path case', () => {
        expect(evaluateCalcTrace(bytesToMiB, targetMiB).isGoalReached).toBe(true);
        expect(evaluateCalcTrace(bytesToMiB.slice(0, 2), targetMiB).isGoalReached).toBe(true);
    });
});
