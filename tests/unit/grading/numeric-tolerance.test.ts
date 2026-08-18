import { TOLERANCE, isWithinTolerance, roundSig } from '../../../src/lib/grading/numeric-tolerance';

/**
 * Zahlenvergleich mit Toleranz (Layer 1)
 * 🔢⚖️
 *
 * Diese Datei entscheidet, ob eine Schuelerantwort als getroffen gilt. Sie ist
 * damit die letzte Instanz vor der Punktevergabe — und hatte bis zum 18.08.2026
 * KEINEN eigenen Test. Sie wurde nur nebenbei ueber `units` und `CalcTrace`
 * beruehrt: die Zeilen liefen durch, ihr Vertrag war ungeprueft.
 *
 * Aufgefallen ist das dem MUTATIONSTEST, nicht der Abdeckungsmessung. Die sagte
 * 76 % — der Mutationstest 59 %, mit vier ueberlebenden Fehlern und fuenf
 * Mutanten, die kein Test je beruehrt hat. Das ist der Unterschied zwischen
 * „die Zeile lief" und „jemand hat hingesehen".
 *
 * Die Faelle unten sind entlang genau dieser Ueberlebenden geschnitten.
 */

describe('isWithinTolerance', () => {
    /**
     * DIE GRENZE SELBST — der erste ueberlebende Mutant (`<=` zu `<`).
     *
     * Genau auf der Toleranz muss der Wert noch GELTEN. Kippt das, verliert
     * jede Schuelerin Punkte, deren Rundung exakt fuenf Prozent betraegt — und
     * das ist kein seltener Zufall, sondern der haeufigste Grenzfall
     * ueberhaupt, weil fuenf Prozent der voreingestellte Spielraum ist.
     */
    it('laesst einen Wert GENAU auf der Toleranz gelten', () => {
        expect(isWithinTolerance(105, 100, 0.05)).toBe(true);
        expect(isWithinTolerance(95, 100, 0.05)).toBe(true);
    });

    it('lehnt knapp jenseits der Toleranz ab', () => {
        expect(isWithinTolerance(105.1, 100, 0.05)).toBe(false);
        expect(isWithinTolerance(94.9, 100, 0.05)).toBe(false);
    });

    it('nimmt Werte innerhalb der Toleranz an', () => {
        expect(isWithinTolerance(102, 100, 0.05)).toBe(true);
        expect(isWithinTolerance(100, 100, 0.05)).toBe(true);
    });

    /**
     * Die Toleranz ist RELATIV zum Erwartungswert. Fuenf Prozent von 1000 sind
     * 50 — dieselbe absolute Abweichung waere bei einem Erwartungswert von 10
     * weit daneben. Waere sie absolut, bestuende jede grosse Zahl jede Pruefung.
     */
    it('misst relativ zum Erwartungswert, nicht absolut', () => {
        expect(isWithinTolerance(1040, 1000, 0.05)).toBe(true);
        expect(isWithinTolerance(50, 10, 0.05)).toBe(false);
    });

    /**
     * NUR bei einer erwarteten Null gilt sie absolut — sonst muesste durch null
     * geteilt werden. Der Sonderfall ist kein Schoenheitsfehler, sondern die
     * einzige Stelle, an der die Toleranz ihre Bedeutung wechselt.
     */
    it('misst bei erwarteter Null absolut', () => {
        expect(isWithinTolerance(0.05, 0, 0.05)).toBe(true);
        expect(isWithinTolerance(-0.05, 0, 0.05)).toBe(true);
        expect(isWithinTolerance(0.06, 0, 0.05)).toBe(false);
        expect(isWithinTolerance(0, 0, 0.05)).toBe(true);
    });

    /** Die Abweichung zaehlt in beide Richtungen gleich. */
    it('behandelt Abweichung nach oben und unten gleich', () => {
        expect(isWithinTolerance(103, 100, 0.05)).toBe(isWithinTolerance(97, 100, 0.05));
    });

    /** Negative Erwartungswerte kommen vor — etwa bei Differenzen. */
    it('kommt mit negativen Werten zurecht', () => {
        expect(isWithinTolerance(-105, -100, 0.05)).toBe(true);
        expect(isWithinTolerance(-120, -100, 0.05)).toBe(false);
    });

    /** Eine Toleranz von null heisst: exakt oder gar nicht. */
    it('verlangt bei Toleranz null den exakten Wert', () => {
        expect(isWithinTolerance(100, 100, 0)).toBe(true);
        expect(isWithinTolerance(100.0001, 100, 0)).toBe(false);
    });

    /** Der voreingestellte Spielraum ist dokumentiert — fuenf Prozent. */
    it('haelt den voreingestellten Spielraum bei 5 Prozent', () => {
        expect(TOLERANCE).toBe(0.05);
        expect(isWithinTolerance(105, 100, TOLERANCE)).toBe(true);
    });
});

/**
 * `roundSig` formt die Zahlen, die im Bericht der Lehrkraft stehen (erreichte
 * und verfehlte Ziele in `CalcTrace`). Ein Fehler hier zeigt ihr falsche Werte,
 * ohne dass die Bewertung selbst betroffen waere — deshalb faellt er nicht auf.
 *
 * Fuenf Mutanten dieser Funktion hatte VOR diesen Tests kein einziger Test je
 * beruehrt.
 */
describe('roundSig', () => {
    /**
     * DIE NULL — der zweite ueberlebende Mutant (`if (v === 0)` zu `if (false)`).
     *
     * Ohne die Abkuerzung rechnet die Funktion `log10(0)`, das ist minus
     * unendlich, und heraus kommt `NaN`. Im Bericht stuende dann „NaN" statt
     * „0" — und null ist bei einer Rechenaufgabe ein voellig normales Ergebnis.
     */
    it('gibt fuer null die null zurueck, nicht NaN', () => {
        expect(roundSig(0)).toBe(0);
        expect(Number.isNaN(roundSig(0))).toBe(false);
    });

    /**
     * SIGNIFIKANTE STELLEN, nicht Nachkommastellen — der dritte ueberlebende
     * Mutant (`sig - d` zu `sig + d`). Mit der Addition wuerde ueberhaupt nicht
     * mehr gerundet, die Zahl liefe unveraendert durch.
     */
    it('rundet auf die angegebene Zahl signifikanter Stellen', () => {
        expect(roundSig(1234.5678, 4)).toBe(1235);
        expect(roundSig(1234.5678, 2)).toBe(1200);
        expect(roundSig(0.00123456, 3)).toBeCloseTo(0.00123, 10);
    });

    /**
     * Der eigentliche Zweck: das Rauschen der Gleitkomma-Arithmetik entfernen.
     * `0.1 + 0.2` ergibt `0.30000000000000004` — im Bericht saehe das aus wie
     * ein Rechenfehler der Schuelerin.
     */
    it('entfernt das Rauschen der Gleitkomma-Arithmetik', () => {
        expect(roundSig(0.1 + 0.2)).toBe(0.3);
        expect(roundSig(1.005 * 100)).toBe(100.5);
    });

    it('nutzt voreingestellt acht signifikante Stellen', () => {
        expect(roundSig(1 / 3)).toBe(0.33333333);
    });

    it('behaelt das Vorzeichen', () => {
        expect(roundSig(-1234.5678, 4)).toBe(-1235);
        expect(roundSig(-0.1 - 0.2)).toBe(-0.3);
    });

    /** Ganze Zahlen duerfen sich nicht veraendern. */
    it('laesst ganze Zahlen unangetastet', () => {
        expect(roundSig(42)).toBe(42);
        expect(roundSig(1000000)).toBe(1000000);
    });

    /** Sehr grosse und sehr kleine Betraege kommen in der Physik vor. */
    it('kommt mit sehr grossen und sehr kleinen Betraegen zurecht', () => {
        expect(roundSig(1.23456789e12, 3)).toBe(1.23e12);
        expect(roundSig(1.23456789e-9, 3)).toBeCloseTo(1.23e-9, 20);
    });
});
