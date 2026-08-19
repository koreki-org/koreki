import { calculateGrade, calculatePercentageFromTasks } from '../../src/lib/logic';
import type { Task } from '../../src/lib/logic';

/**
 * Note und Prozentsatz nach manueller Punktekorrektur (Layer 1)
 * 🎓🔢
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. Zwei Befunde auf dem letzten Meter — dort,
 * wo aus allem vorher Berechneten die Note wird, die auf dem Zeugnis landet.
 *
 * 1. `calculateGrade` war als `(matchPercentage: number)` deklariert, die
 *    Aufrufstelle liest den Wert aber aus einer `any`-Antwort — der Compiler
 *    sah davon nichts. Und die Rechnung gab dann Auskunft, wo keine war:
 *
 *        calculateGrade(undefined) -> "NaN"   (stand so im Notenfeld)
 *        calculateGrade(null)      -> "6,0"   (die SCHLECHTESTE Note)
 *
 *    Der zweite Fall ist der gefährliche: `Math.min(100, null)` ist 0, und aus
 *    "keine Angabe" wird lautlos "durchgefallen" — eine plausibel aussehende
 *    Falschaussage über die Arbeit eines Schülers.
 *
 * 2. `calculatePercentageFromTasks` addierte Punkte und Maxima mit je einem
 *    ungeprüften `Number(...)`. Eine untippbare Maximalpunktzahl machte den
 *    Nenner zu NaN, die Bedingung `max > 0` falsch, und der Rückgabewert 0
 *    wurde über `calculateGrade` zur Note 6,0 — während die Lehrkraft gerade
 *    Punkte korrigierte.
 *
 * Dieselbe Regel galt seit dem 18.08.2026 in `parseCorrectionResult`. Dass sie
 * hier fehlte, ist die wiederkehrende Fehlerklasse dieses Projekts; deshalb
 * wohnt sie jetzt in `lib/zahlen` statt in der KI-Abbildung.
 */

const aufgabe = (punkte: unknown, maximum: unknown): Task =>
    ({ pointsObtained: punkte, maxPoints: maximum }) as unknown as Task;

describe('calculateGrade', () => {
    it('rechnet eine brauchbare Prozentzahl wie bisher um', () => {
        expect(calculateGrade(100)).toBe('1,0');
        expect(calculateGrade(90)).toBe('1,5');
        expect(calculateGrade(0)).toBe('6,0');
    });

    /** DER BEFUND: keine Angabe ist keine Note — und erst recht keine 6. */
    it.each([
        ['undefined', undefined],
        ['null', null],
        ['NaN', NaN]
    ])('gibt bei %s keine Note aus', (_was, wert) => {
        expect(calculateGrade(wert as number)).toBe('-');
    });

    /**
     * Der Platzhalter ist bewusst `'-'`: `analytics-logic` kennt ihn schon und
     * schliesst ihn per `isNaN` aus dem Notenschnitt aus, der Excel-Export
     * schreibt ihn als Strich.
     */
    it('liefert den Platzhalter, den die Auswertung bereits kennt', () => {
        expect(Number.isNaN(parseFloat(calculateGrade(undefined as unknown as number)))).toBe(true);
    });

    it('deckelt Werte ausserhalb von 0 bis 100', () => {
        expect(calculateGrade(150)).toBe('1,0');
        expect(calculateGrade(-20)).toBe('6,0');
    });
});

describe('calculatePercentageFromTasks', () => {
    it('rechnet den ueblichen Fall unveraendert', () => {
        expect(calculatePercentageFromTasks([aufgabe(4, 5), aufgabe(3, 5)])).toBe(70);
    });

    /** DER BEFUND: vorher ergab das 0 — und damit die Note 6,0. */
    it('reisst nicht alles auf 0, wenn ein Maximum untippbar ist', () => {
        const prozent = calculatePercentageFromTasks([
            aufgabe(5, 5),
            aufgabe(8, '10 Punkte'),
            aufgabe(4, 5)
        ]);

        // 9 von 10 Punkten der beiden auswertbaren Aufgaben.
        expect(prozent).toBe(90);
    });

    /**
     * Die Falle, in die die naheliegende Reparatur laeuft: Wer das unbrauchbare
     * Maximum als 0 zaehlt, ihre Punkte aber stehen laesst, kommt ueber 100 %.
     */
    it('zaehlt die Punkte einer uebersprungenen Aufgabe nicht mit', () => {
        const prozent = calculatePercentageFromTasks([aufgabe(5, 5), aufgabe(8, 'zehn')]);

        expect(prozent).toBe(100);
        expect(prozent).toBeLessThanOrEqual(100);
    });

    it('liefert 0, wenn gar kein Maximum deutbar ist', () => {
        expect(calculatePercentageFromTasks([aufgabe(5, 'zehn')])).toBe(0);
    });

    it('behandelt eine leere Liste als 0', () => {
        expect(calculatePercentageFromTasks([])).toBe(0);
    });

    /** Getippte Zahlen aus der Eingabemaske bleiben brauchbar. */
    it('nimmt Zahlen auch als Zeichenkette', () => {
        expect(calculatePercentageFromTasks([aufgabe('4', '5')])).toBe(80);
    });
});
