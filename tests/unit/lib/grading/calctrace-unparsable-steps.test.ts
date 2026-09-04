import { evaluateCalcTrace } from '@/lib/grading/CalcTrace';
import { formatCalcTraceFeedback } from '@/lib/grading/calc-trace-feedback';
import { resolveEngineVerdict } from '@/lib/grading/criterion-source';
import type { StudentASTStep, TargetGoal } from '@/lib/grading/calc-trace-types';

jest.mock('@/lib/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

/**
 * Realer Fehlerfall (Energieertrag einer Solaranlage, 3 Punkte):
 * Der Schueler rechnete fehlerfrei und notierte das richtige Ergebnis mit Einheit, verlor
 * den Rechenweg-Punkt aber trotzdem. Zwei Ursachen lagen uebereinander:
 *
 *   1. "40 m² * 0,2 * 1200 kWh/m²" war fuer mathjs unparsierbar — es kennt nur "m^2".
 *   2. Die reine Formelzeile "A * η * H" enthaelt keine Zahlen und ist deshalb ebenfalls
 *      nicht auswertbar. Beide Faelle wurden als Rechenfehler DES SCHUELERS gemeldet.
 *
 * Geprueft wird die strukturelle Regel, nicht dieser eine Fall: Was die Sandbox nicht
 * nachrechnen kann, darf niemanden belasten — nur ein widerlegtes Ergebnis tut das.
 */
describe('CalcTrace: nicht auswertbare Schritte', () => {
    const target: TargetGoal = {
        targetValue: '9600',
        maxPoints: 3,
        unit: 'kWh',
        gradingRubric: '1 P Formel, 1 P Rechenweg, 1 P Ergebnis'
    };

    describe('Hochgestellte Ziffern', () => {
        it('rechnet eine Flaecheneinheit mit hochgestellter Ziffer nach', () => {
            const ast: StudentASTStep[] = [
                { id: 'step_1', formula: '40 m² * 0.2 * 1200 kWh/m²', result: 9600, unit: 'kWh' }
            ];

            const result = evaluateCalcTrace(ast, target);

            expect(result.sandboxErrors).toEqual([]);
            expect(result.isGoalReached).toBe(true);
        });

        it('kommt auch mit mehrstelligen Exponenten zurecht', () => {
            const ast: StudentASTStep[] = [
                { id: 'step_1', formula: '2 m³ * 4', result: 8, unit: 'm³' }
            ];

            expect(evaluateCalcTrace(ast, { targetValue: 8, maxPoints: 1, unit: 'm³' }).sandboxErrors).toEqual([]);
        });
    });

    describe('Symbolische Formelzeilen', () => {
        const astMitFormelzeile: StudentASTStep[] = [
            { id: 'step_1', formula: 'A * η * H', result: 9600, unit: 'kWh' },
            { id: 'step_2', formula: '40 m² * 0.2 * 1200 kWh/m²', result: 9600, unit: 'kWh' }
        ];

        it('wertet den Rechenweg als erfuellt, obwohl ein Schritt nicht parsierbar war', () => {
            const result = evaluateCalcTrace(astMitFormelzeile, target);
            const verdict = resolveEngineVerdict('proofA', 0, result);

            expect(verdict.erfuellt).toBe(true);
        });

        it('meldet den nicht auswertbaren Schritt nicht als Verrechner des Schuelers', () => {
            const result = evaluateCalcTrace(astMitFormelzeile, target);
            const prompt = formatCalcTraceFeedback(result, target);

            // Die AUSSAGE, nicht der Wortlaut: Der Text muss den Schritt ausdruecklich
            // NICHT der Schuelerin anlasten. Stand bis zum 04.09.2026 als "KEIN
            // Schülerfehler" da — Maschinensprache, die beim Umbau auf einen Text fuer
            // die Lehrkraft zu "kein Fehler der Schülerin" wurde.
            expect(prompt).toMatch(/kein.{0,4}Fehler der Schülerin/i);
            expect(prompt).not.toMatch(/Verrechner im Weg des Schülers[\s\S]*Syntax-Fehler in step_1/);
        });

        it('belastet einen echten Rechenfehler weiterhin', () => {
            // Gegenprobe: 40 * 0,2 * 1200 ergibt 9600, nicht 8000.
            const ast: StudentASTStep[] = [
                { id: 'step_1', formula: '40 m² * 0.2 * 1200 kWh/m²', result: 8000, unit: 'kWh' }
            ];

            const result = evaluateCalcTrace(ast, target);

            expect(result.sandboxErrors.some(e => e.startsWith('Rechenfehler'))).toBe(true);
            expect(resolveEngineVerdict('proofA', 0, result).erfuellt).toBe(false);
        });
    });
});
