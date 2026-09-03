/**
 * Folgefehler ueber Aufgabengrenzen: Kulanz nur dort, wo sie hingehoert.
 *
 * ANLASS (02.09.2026). Gemessen an sechs Rechenaufgaben verschlechterte die
 * hinterlegte Rechenkette die Uebereinstimmung mit der Lehrkraft (1,00 P mittlere
 * Abweichung) gegenueber der rein sprachlichen Bewertung (0,17 P) — vier Faelle
 * schlechter, keiner besser. Ursache: Wer sich in Teilaufgabe a) verrechnet und in b)
 * mit dem eigenen Wert fehlerfrei weiterrechnet, verfehlt den Musterzielwert
 * zwangslaeufig und verliert den Punkt ein zweites Mal.
 *
 * DIE REGEL (Anbieter-Entscheidung, 02.09.2026). Werte, die in der AUFGABE GEGEBEN
 * sind, muessen korrekt eingesetzt werden — Fehler dort kosten Punkte. Werte, die aus
 * einer FRUEHEREN Teilaufgabe uebernommen wurden, sind Folgefehler und duerfen keinen
 * zweiten Abzug erzeugen.
 *
 * DIE ABGRENZUNG, auf die es ankommt. Die Kulanz gilt AUSSCHLIESSLICH fuer den
 * Ergebnis-Punkt (`proofB`). Sie gilt NICHT fuer `proofValues`: Wer zusaetzlich einen
 * gegebenen Wert falsch einsetzt, macht einen zweiten, eigenen Fehler. Wuerde die
 * Kulanz auch dort greifen, bliebe genau der straffrei — und die Regel waere ins
 * Gegenteil verkehrt. Dieser Fall steht unten als eigener Test.
 */
import { falscheWerteAus, findeUebernahme } from '../../../src/lib/grading/consecutive-values';
import { resolveEngineVerdict } from '../../../src/lib/grading/criterion-source';
import type { CalcTraceResult, StudentASTStep } from '../../../src/lib/grading/calc-trace-types';
import type { EngineEvidence } from '../../../src/lib/grading/criterion-source';

const schritt = (id: string, formula: string, result: number): StudentASTStep =>
    ({ id, original_text: formula, formula, result } as StudentASTStep);

const ergebnis = (verfehlt: boolean, ast: StudentASTStep[]): CalcTraceResult =>
    ({ isGoalReached: !verfehlt, sandboxErrors: [], reachedTargets: [], missedTargets: [], ast } as CalcTraceResult);

describe('Welche Werte eine Aufgabe weitergibt', () => {
    it('gibt die Ergebnisse einer verfehlten Aufgabe weiter', () => {
        const werte = falscheWerteAus('Aufgabe a)', ergebnis(true, [schritt('step_1', '100 / 8', 20)]));

        expect(werte).toEqual([{ aufgabe: 'Aufgabe a)', wert: 20 }]);
    });

    /** Wer sein Ziel getroffen hat, gibt keinen Fehler weiter. */
    it('gibt nichts weiter, wenn das Ziel erreicht wurde', () => {
        expect(falscheWerteAus('Aufgabe a)', ergebnis(false, [schritt('step_1', '100 / 8', 12.5)]))).toEqual([]);
    });

    it('gibt nichts weiter, wenn gar kein Ergebnis vorliegt', () => {
        expect(falscheWerteAus('Aufgabe a)', undefined)).toEqual([]);
    });

    /**
     * Trivialwerte stehen in fast jeder Rechnung. Wuerde man sie mitzaehlen, faende
     * sich beinahe immer eine "Uebernahme" — und die Kulanz griffe ueberall.
     */
    it('gibt Trivialwerte nicht weiter', () => {
        const werte = falscheWerteAus('Aufgabe a)', ergebnis(true, [
            schritt('step_1', '2 - 1', 1),
            schritt('step_2', '4 / 2', 2),
            schritt('step_3', '5 * 2', 10),
            schritt('step_4', '100 / 8', 20)
        ]));

        expect(werte).toEqual([{ aufgabe: 'Aufgabe a)', wert: 20 }]);
    });
});

describe('Erkennung einer Uebernahme', () => {
    const frueher = [{ aufgabe: 'Aufgabe a)', wert: 20 }];

    it('findet den uebernommenen Wert in der Formel', () => {
        const treffer = findeUebernahme([schritt('step_2', '0.5 * 50 * 20^2', 10000)], frueher);

        expect(treffer?.aufgabe).toBe('Aufgabe a)');
    });

    it('findet nichts, wenn der Wert nicht vorkommt', () => {
        expect(findeUebernahme([schritt('step_2', '0.5 * 50 * 12.5^2', 3906.25)], frueher)).toBeUndefined();
    });

    it('findet nichts ohne fruehere Werte', () => {
        expect(findeUebernahme([schritt('step_2', '0.5 * 50 * 20^2', 10000)], [])).toBeUndefined();
    });
});

describe('Punktevergabe bei Folgefehler', () => {
    /** Ziel verfehlt, aber als Folgefehler gekennzeichnet. */
    const mitFolgefehler: EngineEvidence = {
        ast: [],
        sandboxErrors: [],
        perTargetResult: [{
            targetIndex: 0,
            reached: false,
            hasCorrectValues: false,
            hasCalculationError: false,
            associatedStepIds: [],
            folgefehlerAus: 'Aufgabe a)'
        }]
    };

    it('gibt den Ergebnispunkt trotz verfehltem Zielwert', () => {
        const urteil = resolveEngineVerdict('proofB', 0, mitFolgefehler);

        expect(urteil.erfuellt).toBe(true);
        expect(urteil.begruendung).toContain('Folgefehler aus Aufgabe a)');
    });

    /**
     * DER ENTSCHEIDENDE FALL. Der Schueler uebernimmt v aus a) UND schreibt die
     * gegebene Masse falsch ab. Der Ergebnispunkt wird verziehen, die
     * Werteeinsetzung NICHT — sonst bliebe der zweite, eigene Fehler straffrei.
     */
    it('verzeiht den Einsetzungspunkt NICHT', () => {
        expect(resolveEngineVerdict('proofValues', 0, mitFolgefehler).erfuellt).toBe(false);
    });

    /** Ein eigener Rechenfehler bleibt ein eigener Rechenfehler. */
    it('gibt keinen Punkt, wenn kein Folgefehler vermerkt ist', () => {
        const ohne: EngineEvidence = {
            ast: [],
            sandboxErrors: [],
            perTargetResult: [{
                targetIndex: 0, reached: false, hasCorrectValues: false,
                hasCalculationError: false, associatedStepIds: []
            }]
        };

        expect(resolveEngineVerdict('proofB', 0, ohne).erfuellt).toBe(false);
    });

    /** Das erreichte Ziel bleibt erreicht — der neue Zweig darf davor nicht greifen. */
    it('laesst das erreichte Ziel unberuehrt', () => {
        const erreicht: EngineEvidence = {
            ast: [],
            sandboxErrors: [],
            perTargetResult: [{
                targetIndex: 0, reached: true, hasCorrectValues: true,
                hasCalculationError: false, associatedStepIds: []
            }]
        };

        const urteil = resolveEngineVerdict('proofB', 0, erreicht);
        expect(urteil.erfuellt).toBe(true);
        expect(urteil.begruendung).toContain('Zielwert erreicht');
    });
});
