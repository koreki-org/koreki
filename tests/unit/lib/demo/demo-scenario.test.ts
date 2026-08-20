import { buildDemoScenario } from '@/lib/demo/demoScenario';
import { evaluateCalcTrace } from '@/lib/grading/CalcTrace';
import { resolveEngineVerdict } from '@/lib/grading/criterion-source';
import type { StudentASTStep } from '@/lib/grading/calc-trace-types';

jest.mock('@/lib/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

/**
 * Das Demo-Szenario ist Aussendarstellung: Es laeuft bei Interessenten auf dem Schirm.
 * Kippt eine der zugesagten Punktzahlen, faellt das erst im Gespraech auf.
 *
 * Geprueft wird deshalb die Zusage, die im Kopf von demoScenario.ts steht — vor allem
 * die 2 von 3 Punkten bei Schueler #2. Sie haengt an einer Feinheit: Der Schueler darf
 * sich NICHT verrechnen, sondern muss einen Eingangswert falsch ablesen. Verrechnet er
 * sich, meldet die Sandbox einen Rechenfehler und beide deterministischen Punkte fallen.
 *
 * Die AST-Extraktion selbst ist KI-gestuetzt und hier nicht Gegenstand — der Test setzt
 * den Rechenweg so an, wie er im Demo-Text steht, und prueft die Engine-Urteile darauf.
 */
describe('Demo-Szenario: zugesagte Punktzahlen', () => {
    const scenario = buildDemoScenario();
    const aufgabe1 = scenario.tasksLayout[0];
    const target = aufgabe1.targetGoal!;

    const urteile = (ast: StudentASTStep[]) => {
        const result = evaluateCalcTrace(ast, target);
        return {
            rechenweg: resolveEngineVerdict('proofA', 0, result).erfuellt,
            ergebnis: resolveEngineVerdict('proofB', 0, result).erfuellt,
            sandboxErrors: result.sandboxErrors
        };
    };

    it('enthaelt zwei Schueler — sonst zeigt der Stapel keine Stapelverarbeitung', () => {
        expect(scenario.studentBatchFiles).toHaveLength(2);
        expect(scenario.studentBatchFiles.map(f => f.name)).toEqual(['Schüler #1', 'Schüler #2']);
    });

    it('haelt die Kriterien-Aufteilung 1 P Formel / 1 P Rechenweg / 1 P Ergebnis', () => {
        const sources = (target.criteria || []).map(c => c.source);
        expect(sources).toEqual(['llm', 'proofA', 'proofB']);
        expect((target.criteria || []).every(c => c.punktwert === 1)).toBe(true);
    });

    describe('Schueler #1 — vollstaendig richtig', () => {
        it('erreicht beide deterministischen Punkte', () => {
            const { rechenweg, ergebnis, sandboxErrors } = urteile([
                { id: 'step_1', formula: '40 m² * 0.2 * 1200 kWh/m²', result: 9600, unit: 'kWh' }
            ]);

            expect(sandboxErrors).toEqual([]);
            expect(rechenweg).toBe(true);
            expect(ergebnis).toBe(true);
        });
    });

    describe('Schueler #2 — falsch abgelesener Eingangswert', () => {
        const ast: StudentASTStep[] = [
            { id: 'step_1', formula: '40 m² * 0.2 * 1000 kWh/m²', result: 8000, unit: 'kWh' }
        ];

        it('behaelt den Rechenweg-Punkt, weil er sich nicht verrechnet hat', () => {
            expect(urteile(ast).rechenweg).toBe(true);
        });

        it('verliert den Ergebnis-Punkt, weil 8000 nicht der Zielwert ist', () => {
            expect(urteile(ast).ergebnis).toBe(false);
        });

        it('loest dabei keinen Rechenfehler aus', () => {
            expect(urteile(ast).sandboxErrors).toEqual([]);
        });

        it('nutzt im Demo-Text tatsaechlich 1000 statt 1200 — sonst traegt die Zusage nicht', () => {
            const text = scenario.studentBatchFiles[1].fileText || '';
            const aufgabe1Teil = text.split('=== TASK: Aufgabe 2 ===')[0];

            expect(aufgabe1Teil).toContain('1000');
            expect(aufgabe1Teil).not.toContain('1200');
        });
    });

    describe('Gegenprobe: ein echter Verrechner waere KEINE 2 von 3', () => {
        it('kostet beide deterministischen Punkte', () => {
            // Richtige Werte, aber falsch ausgerechnet — genau der Fall, der fuer die
            // Demo NICHT taugt.
            const { rechenweg, ergebnis } = urteile([
                { id: 'step_1', formula: '40 m² * 0.2 * 1200 kWh/m²', result: 8600, unit: 'kWh' }
            ]);

            expect(rechenweg).toBe(false);
            expect(ergebnis).toBe(false);
        });
    });

    describe('Aufgabe 3 bei Schueler #2', () => {
        it('ist unbeantwortet, damit der Stapel auch den Nullfall zeigt', () => {
            const text = scenario.studentBatchFiles[1].fileText || '';
            const aufgabe3Teil = text.split('=== TASK: Aufgabe 3 ===')[1] || '';

            expect(aufgabe3Teil.trim().length).toBeLessThan(60);
            expect(aufgabe3Teil.toLowerCase()).toContain('weiß ich');
        });
    });
});
