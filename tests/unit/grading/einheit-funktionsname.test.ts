/**
 * Waechter: Einheitenkuerzel, die wie eine mathjs-Funktion heissen.
 *
 * ANLASS (03.09.2026). Bei der Diagnose einer Pflege-Aufgabe zur Infusionsrate
 * ("2 ml in 30 min, das sind 4 ml/h") meldete die Sandbox den Rechenschritt als nicht
 * auswertbar: "Unexpected type of argument in function multiplyScalar ... actual:
 * function".
 *
 * Die Ursache: `min` und `sec` sind mathjs zwar als Einheit bekannt — `createUnit('min')`
 * scheitert ausdruecklich mit "a unit with that name already exists" — beim Auswerten
 * eines Ausdrucks gewinnt aber die gleichnamige FUNKTION. `min()` liefert das Minimum,
 * `sec()` den Sekans. `30 min` ist damit kein Zeitraum, sondern ein Typfehler.
 *
 * Betroffen war jede Aufgabe mit Minuten oder Sekunden in Kurzschreibweise:
 * Infusionsraten, Geschwindigkeiten, Leistung ueber Zeit. Die Engine zog dafuer zwar
 * keine Punkte ab ("Werte diese Schritte fachlich selbst"), verlor aber ihren
 * deterministischen Beitrag — genau dort, wo er am meisten wert ist.
 *
 * DIE REGEL. Ein Einheitenkuerzel muss sich rechnen lassen. Ein Funktionsaufruf muss
 * ein Funktionsaufruf bleiben. Wer hier eine Einheit ergaenzt, ergaenzt beide Richtungen
 * als Testfall — die Ersetzung ist sonst leicht zu weit gefasst und frisst Funktionen.
 *
 * NICHT GEDECKT. Einheiten, die mathjs gar nicht kennt (`lx`, `lm` etwa). Die scheitern
 * mit "Undefined symbol" und sind ein anderes Problem: dort fehlt die Einheit, hier war
 * sie vorhanden und nur verdeckt.
 */
import { normalizeExpressionFormula } from '../../../src/lib/grading/units';
import { math } from '../../../src/lib/grading/mathjs-instance';

/** Wertet eine Formel so aus, wie die Sandbox es tut. */
const rechne = (formel: string): string =>
    String(math.evaluate(normalizeExpressionFormula(formel)));

describe('Einheiten, die wie eine mathjs-Funktion heissen', () => {
    describe('rechnen als Einheit', () => {
        it('Minuten in einer Infusionsrate', () => {
            expect(rechne('2 ml / 30 min * 60')).toBe('4 ml / minute');
        });

        it('Minuten allein', () => {
            expect(rechne('30 min')).toBe('30 minute');
        });

        it('Minuten im Nenner ohne Leerzeichen', () => {
            expect(rechne('2 ml/min')).toBe('2 ml / minute');
        });

        it('Sekunden in einer Geschwindigkeit', () => {
            expect(rechne('100 m / 8 sec')).toBe('12.5 m / second');
        });
    });

    /**
     * Die Gegenrichtung. Eine zu weit gefasste Ersetzung wuerde hier den
     * Funktionsaufruf zerstoeren — und das faellt beim Rechnen nicht auf, sondern
     * erst, wenn eine Musterloesung `min(a, b)` benutzt.
     */
    describe('lassen Funktionsaufrufe unberuehrt', () => {
        it('min als Minimum', () => {
            expect(rechne('min(3, 5)')).toBe('3');
        });

        it('min mit Leerzeichen vor der Klammer', () => {
            expect(rechne('min (3, 5)')).toBe('3');
        });

        it('sec als Sekans', () => {
            expect(rechne('sec(0)')).toBe('1');
        });
    });

    /** Die uebrigen Umschriften duerfen dadurch nicht verlorengehen. */
    it('laesst die bestehenden Einheiten-Umschriften in Ruhe', () => {
        expect(rechne('5 kOhm + 2 kΩ')).toBe('7 kohm');
        expect(rechne('100 m / 8 s')).toBe('12.5 m / s');
    });
});
