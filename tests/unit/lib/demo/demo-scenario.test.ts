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
 * die 2 von 3 Punkten bei Schueler #2: Formel 1, Einsetzen 0 (1000 statt 1200 abgelesen),
 * Rechnung und Ergebnis 1 (folgerichtig, von der Sandbox belegt).
 *
 * Bis zum 18.11.2026 pruefte dieser Test fuer Schueler #2 nur "Ergebnis-Kriterium nicht
 * erfuellt" — das gilt auch fuer den Zustand `unentschieden`, in dem die Sandbox den
 * Punkt gar nicht entscheidet, sondern dem Modell ueberlaesst. Seit dem 04.09.2026 war
 * genau das der Fall, und die Demo vergab 3 statt 2 Punkte, ohne dass hier etwas fiel.
 * Deshalb wird jetzt jedes Engine-Urteil der Demo auf `unentschieden` geprueft.
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
        const rechnung = resolveEngineVerdict('proofA', 0, result);
        return {
            rechnung: rechnung.erfuellt,
            unentschieden: !!rechnung.unentschieden,
            sandboxErrors: result.sandboxErrors
        };
    };

    it('enthaelt zwei Schueler — sonst zeigt der Stapel keine Stapelverarbeitung', () => {
        expect(scenario.studentBatchFiles).toHaveLength(2);
        expect(scenario.studentBatchFiles.map(f => f.name)).toEqual(['Schüler #1', 'Schüler #2']);
    });

    it('haelt das Schema 1 P Formel / 1 P Einsetzen / 1 P Rechnung und Ergebnis', () => {
        expect((target.criteria || []).map(c => [c.id, c.source])).toEqual([
            ['formel', 'llm'], ['einsetzen', 'llm'], ['rechnung', 'proofA']
        ]);
        expect((target.criteria || []).every(c => c.punktwert === 1)).toBe(true);
    });

    it('hat kein Ergebnis-Kriterium gegen die Musterloesung (proofB) — es ginge beim Folgefehler ans Modell', () => {
        expect((target.criteria || []).some(c => c.source === 'proofB')).toBe(false);
    });

    describe('Schueler #1 — vollstaendig richtig', () => {
        it('erhaelt den Punkt fuer Rechnung und Ergebnis von der Sandbox', () => {
            const { rechnung, unentschieden, sandboxErrors } = urteile([
                { id: 'step_1', formula: '40 m² * 0.2 * 1200 kWh/m²', result: 9600, unit: 'kWh' }
            ]);

            expect(sandboxErrors).toEqual([]);
            expect(rechnung).toBe(true);
            expect(unentschieden).toBe(false);
        });
    });

    describe('Schueler #2 — falsch abgelesener Eingangswert', () => {
        const ast: StudentASTStep[] = [
            { id: 'step_1', formula: '40 m² * 0.2 * 1000 kWh/m²', result: 8000, unit: 'kWh' }
        ];

        it('behaelt den Punkt fuer Rechnung und Ergebnis, weil er folgerichtig gerechnet hat', () => {
            expect(urteile(ast).rechnung).toBe(true);
        });

        it('wird dabei von der Sandbox entschieden, nicht ans Modell abgegeben', () => {
            expect(urteile(ast).unentschieden).toBe(false);
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

    describe('Gegenprobe: ein echter Verrechner', () => {
        it('verliert Rechnung und Ergebnis — bindend, ohne Rueckfrage ans Modell', () => {
            const { rechnung, unentschieden } = urteile([
                { id: 'step_1', formula: '40 m² * 0.2 * 1200 kWh/m²', result: 8600, unit: 'kWh' }
            ]);

            expect(rechnung).toBe(false);
            expect(unentschieden).toBe(false);
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
