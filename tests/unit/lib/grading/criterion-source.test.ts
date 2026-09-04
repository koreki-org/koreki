import {
    isEngineOwned,
    isValidCriterionSource,
    normalizeCriterionSource,
    resolveEngineVerdict,
    stepHasSandboxError,
    type EngineEvidence,
} from '@/lib/grading/criterion-source';
import type { PerTargetResult, StudentASTStep } from '@/lib/grading/calc-trace-types';

const pt = (over: Partial<PerTargetResult> = {}): PerTargetResult => ({
    targetIndex: 0,
    reached: true,
    hasCalculationError: false,
    associatedStepIds: ['step_1'],
    ...over,
});

const step = (id: string, formula: string, result = 1): StudentASTStep => ({ id, formula, result });

/** Standardfall: ein gerechneter Schritt, der den Zielwert trifft. */
const evidence = (over: Partial<EngineEvidence> = {}): EngineEvidence => ({
    ast: [step('step_1', '12 / 6500', 1.846)],
    sandboxErrors: [],
    perTargetResult: [pt()],
    ...over,
});

describe('criterion-source: Zustaendigkeit', () => {
    it('erkennt Engine-Kriterien und Ermessens-Kriterien', () => {
        expect(isEngineOwned('proofA')).toBe(true);
        expect(isEngineOwned('proofB')).toBe(true);
        expect(isEngineOwned('llm')).toBe(false);
    });

    it('akzeptiert nur die drei bekannten Werte', () => {
        expect(isValidCriterionSource('proofValues')).toBe(false);
        expect(isValidCriterionSource('proofC')).toBe(false);
        expect(isValidCriterionSource(undefined)).toBe(false);
    });

    describe('normalizeCriterionSource', () => {
        it('respektiert ein ausdruecklich gesetztes gueltiges source', () => {
            // Auch wenn die Bezeichnung nach Einsetzung klingt: Das Feld gewinnt.
            const crit = { id: 'volumen_werte', label: 'Werte eingesetzt', source: 'llm' as const };

            expect(normalizeCriterionSource(crit)).toBe('llm');
        });

        /**
         * WAECHTER, 03.09.2026. `proofValues` ist entfallen: Es versprach "Werte
         * korrekt eingesetzt", stuetzte sich aber auf `hasCorrectValues` — und das
         * war `!!targetStepId`, also dieselbe Messung wie `proofB`, nur schwaecher.
         * Weil Engine-Urteile bindend sind, war das eine unumstoessliche Null auf
         * einer Messung, die etwas anderes misst als ihr Name sagt.
         *
         * Gespeicherte Skills von Lehrkraeften koennen den Wert weiter enthalten.
         * Sie muessen lesbar bleiben und beim Einlesen dem Modell zufallen —
         * NICHT einem Engine-Urteil und nicht einem Absturz. Wer den Eintrag in
         * `VERALTETE_QUELLEN` entfernt, macht diese Skills stillschweigend kaputt.
         */
        it('bildet das entfallene proofValues auf das Modell ab', () => {
            const crit = { id: 'q1_einsetzung', label: 'Werte eingesetzt', source: 'proofValues' } as never;

            expect(normalizeCriterionSource(crit)).toBe('llm');
        });

        /**
         * Die Wortsuche ueber id/label ist mit `proofValues` entfallen. Ein
         * Kriterium ohne `source` darf NICHT mehr wegen seiner Bezeichnung bei der
         * Engine landen: Wo die Engine nichts beweisen kann, ist die Rueckfrage ans
         * Modell die richtige Vorgabe.
         */
        it('weist ein Kriterium nicht mehr wegen seiner Bezeichnung der Engine zu', () => {
            const crit = { id: 'q1_einsetzung', label: 'Werte eingesetzt' } as never;

            expect(normalizeCriterionSource(crit)).toBe('llm');
        });

        it('faellt bei fehlendem source auf das Modell zurueck, wenn nichts darauf hindeutet', () => {
            const crit = { id: 'formel', label: 'Formel fachlich korrekt' } as never;

            expect(normalizeCriterionSource(crit)).toBe('llm');
        });

        it('repariert auch einen unbekannten Wert', () => {
            const crit = { id: 'ergebnis', label: 'Ergebnis', source: 'sandbox' } as never;

            expect(normalizeCriterionSource(crit)).toBe('llm');
        });
    });

    describe('stepHasSandboxError', () => {
        it('verwechselt step_1 nicht mit step_10', () => {
            const errors = ['Rechenfehler in step_10: Formel ergibt 5, aber Schüler notierte 7'];

            expect(stepHasSandboxError('step_10', errors)).toBe(true);
            expect(stepHasSandboxError('step_1', errors)).toBe(false);
        });
    });

    describe('proofB — Ergebnis gegen die Musterloesung', () => {
        it('bestaetigt ein erreichtes Ziel ohne Rechenfehler', () => {
            expect(resolveEngineVerdict('proofB', 0, evidence()).erfuellt).toBe(true);
        });

        it('verweigert den Punkt bei einem Rechenfehler in der Kette', () => {
            const verdict = resolveEngineVerdict('proofB', 0, evidence({
                perTargetResult: [pt({ hasCalculationError: true })],
                sandboxErrors: ['Rechenfehler in step_1: Formel ergibt 5, aber Schüler notierte 7'],
            }));

            expect(verdict.erfuellt).toBe(false);
            expect(verdict.begruendung).toContain('step_1');
        });

        it('verweigert den Punkt, wenn das Ziel gar nicht erreicht wurde', () => {
            const verdict = resolveEngineVerdict('proofB', 0, evidence({
                perTargetResult: [pt({ reached: false, associatedStepIds: [] })],
            }));

            expect(verdict.erfuellt).toBe(false);
            expect(verdict.begruendung).toContain('nicht erreicht');
        });
    });

    describe('proofA — eigener Rechenweg gegen sich selbst', () => {
        it('vergibt den Punkt, wenn der Schueler seinen eigenen Weg korrekt gerechnet hat', () => {
            // Der Kernfall: falsche Ausgangszahl (4000 statt 6500), aber korrekt dividiert.
            // Zielwert verfehlt -> keine Zuordnung -> frueher fiel der Rechenweg-Punkt weg.
            const verdict = resolveEngineVerdict('proofA', 0, {
                ast: [step('step_1', '12 / 4000', 0.003)],
                sandboxErrors: [],
                perTargetResult: [pt({ reached: false, associatedStepIds: [] })],
            });

            expect(verdict.erfuellt).toBe(true);
        });

        it('verweigert den Punkt, wenn sich der Schueler verrechnet hat', () => {
            const verdict = resolveEngineVerdict('proofA', 0, {
                ast: [step('step_1', '12 * 4', 50)],
                sandboxErrors: ['Rechenfehler in step_1: Formel ergibt 48, aber Schüler notierte 50'],
                perTargetResult: [pt({ reached: false, associatedStepIds: [] })],
            });

            expect(verdict.erfuellt).toBe(false);
            expect(verdict.begruendung).toContain('step_1');
        });

        it('verweigert den Punkt bei einem nackten Ergebnis ohne Rechnung', () => {
            const verdict = resolveEngineVerdict('proofA', 0, {
                ast: [step('step_1', '2.5', 2.5)],
                sandboxErrors: [],
                perTargetResult: [pt({ reached: false, associatedStepIds: [] })],
            });

            expect(verdict.erfuellt).toBe(false);
            expect(verdict.begruendung).toContain('Kein nachvollziehbarer Rechenweg');
        });

        it('laesst einen Fehler bei einem ANDEREN Zielwert nicht durchschlagen', () => {
            // Zielgroessen-Isolation: step_2 gehoert zu Ziel 1 und ist fehlerhaft.
            // Ziel 0 hat keine Zuordnung und darf davon nicht belastet werden.
            const verdict = resolveEngineVerdict('proofA', 0, {
                ast: [step('step_1', '12 / 4000', 0.003), step('step_2', '5 * 5', 30)],
                sandboxErrors: ['Rechenfehler in step_2: Formel ergibt 25, aber Schüler notierte 30'],
                perTargetResult: [
                    pt({ targetIndex: 0, reached: false, associatedStepIds: [] }),
                    pt({ targetIndex: 1, reached: true, associatedStepIds: ['step_2'], hasCalculationError: true }),
                ],
            });

            expect(verdict.erfuellt).toBe(true);
            expect(verdict.stepIds).toEqual(['step_1']);
        });

        it('prueft die zugeordneten Schritte, wenn es welche gibt', () => {
            const verdict = resolveEngineVerdict('proofA', 0, evidence());

            expect(verdict.erfuellt).toBe(true);
            expect(verdict.stepIds).toEqual(['step_1']);
        });

        it('behandelt einen leeren Rechenweg als nicht erfuellt', () => {
            const verdict = resolveEngineVerdict('proofA', 0, { ast: [], sandboxErrors: [], perTargetResult: [] });

            expect(verdict.erfuellt).toBe(false);
        });
    });
});
