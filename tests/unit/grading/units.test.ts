import {
    compareWithUnit,
    convertBetweenUnits,
    normalizeExpressionFormula,
    normalizeUnitString,
    parseTargetValues,
    parseUnitsPerValue
} from '../../../src/lib/grading/units';

/**
 * Einheiten in der Bewertung (Layer 1)
 * 📏
 *
 * Hier entsteht der Streit. Ein Schueler schreibt "0,5 A", die Musterloesung
 * nennt "500 mA" — fachlich dasselbe. Wer das nicht erkennt, zieht Punkte fuer
 * eine richtige Antwort ab, und das faellt niemandem auf, weil die Zahl im
 * Bericht ja verschieden aussieht.
 *
 * Die Gegenrichtung ist genauso wichtig: 6,5 Ω sind NICHT 6,5 kΩ. Ein Modul,
 * das grosszuegig genug ist, um Praefixe zu verzeihen, verschenkt Punkte fuer
 * eine um Faktor 1000 falsche Antwort.
 *
 * Das Modul stand bis 17.08.2026 in CalcTrace.ts und war dort ungeprueft.
 */
describe('compareWithUnit', () => {
    const TOL = 0.05;

    /**
     * Der Kernfall: gleiche physikalische Groesse, andere Schreibweise. Beides
     * sind 0,001846 A. Faellt das durch, kostet jede Praefix-Wahl Punkte.
     */
    it('erkennt dieselbe Groesse in verschiedenen Praefixen als Treffer', () => {
        const r = compareWithUnit(1846, 'µA', 1.846, 'mA', TOL);
        expect(r.isValueMatch).toBe(true);
        expect(r.isExactMatch).toBe(true);
    });

    it('erkennt die nackte SI-Zahl mit passender Einheit als Treffer', () => {
        const r = compareWithUnit(0.001846, 'A', 1.846, 'mA', TOL);
        expect(r.isExactMatch).toBe(true);
    });

    it('nimmt identische Angaben an', () => {
        expect(compareWithUnit(6.5, 'kohm', 6.5, 'kohm', TOL).isExactMatch).toBe(true);
    });

    /**
     * DIE GEGENRICHTUNG. Gleiche Zahl, Praefix um Faktor 1000 daneben. Der Wert
     * gilt als "getroffen", die Angabe aber ausdruecklich NICHT als exakt —
     * sonst waere ein Widerstand von 6,5 Ohm eine richtige Antwort auf 6,5
     * Kiloohm.
     */
    it('wertet einen Praefix-Fehler nicht als exakten Treffer', () => {
        const r = compareWithUnit(6.5, 'ohm', 6.5, 'kohm', TOL);
        expect(r.isExactMatch).toBe(false);
        expect(r.isPrefixError).toBe(true);
        expect(r.isUnitMismatch).toBe(true);
    });

    /**
     * Gleiche Zahl, voellig andere Groesse: 230 mA ist keine Antwort auf 230 V.
     * Hier gilt nicht einmal der Zahlenwert als getroffen.
     */
    it('lehnt die gleiche Zahl in einer fremden Dimension ab', () => {
        const r = compareWithUnit(230, 'mA', 230, 'V', TOL);
        expect(r.isValueMatch).toBe(false);
        expect(r.isExactMatch).toBe(false);
    });

    /**
     * Eine fehlende Einheit ist eine unvollstaendige Antwort. Sie wird als
     * solche GEMELDET (`isMissingUnit`), damit die Lehrkraft entscheiden kann —
     * stillschweigend durchgehen darf sie nicht.
     */
    it('meldet eine fehlende Einheit gesondert', () => {
        const r = compareWithUnit(1.846, undefined, 1.846, 'mA', TOL);
        expect(r.isValueMatch).toBe(true);
        expect(r.isExactMatch).toBe(false);
        expect(r.isMissingUnit).toBe(true);
    });

    /** Die Toleranz gilt auch mit Einheiten — 5 % Rundung sind kein Fehler. */
    it('laesst Rundung innerhalb der Toleranz zu', () => {
        expect(compareWithUnit(1.85, 'mA', 1.846, 'mA', TOL).isExactMatch).toBe(true);
        expect(compareWithUnit(1.2, 'mA', 1.846, 'mA', TOL).isValueMatch).toBe(false);
    });

    /** Eine Einheit, die mathjs nicht kennt, darf nicht zum Absturz fuehren. */
    it('faellt bei unbekannter Einheit auf "kein Treffer" zurueck', () => {
        const r = compareWithUnit(5, 'Bananen', 5, 'Kisten', TOL);
        expect(r.isExactMatch).toBe(false);
    });
});

describe('normalizeUnitString', () => {
    /**
     * Ohm und Waehrungen kommen in Schuelertexten in jeder erdenklichen
     * Schreibweise vor. mathjs kennt nur eine davon.
     */
    it.each([
        ['Ω', 'ohm'],
        ['kΩ', 'kohm'],
        ['MOhm', 'Mohm'],
        ['€', 'EUR'],
        ['$', 'USD']
    ])('fuehrt "%s" auf "%s" zurueck', (eingabe, erwartet) => {
        expect(normalizeUnitString(eingabe)).toBe(erwartet);
    });

    it('schreibt Hochzahlen als Potenz aus', () => {
        expect(normalizeUnitString('m²')).toBe('m^2');
        expect(normalizeUnitString('cm³')).toBe('cm^3');
    });

    /**
     * REGRESSION, 17.08.2026 beim Herausloesen des Moduls gefunden.
     *
     * mathjs versteht als Mikro-Praefix ausschliesslich `u`. Das Mikro-Zeichen
     * (U+00B5) kommt von der Tastatur, das griechische My (U+03BC) aus
     * Formeleditoren und OCR — beide waren fuer die Engine keine Einheit. Die
     * Umrechnung scheiterte still, "1846 µA" galt als falsche Antwort auf
     * "1,846 mA".
     */
    it.each([['µA', 'Mikro-Zeichen'], ['μA', 'griechisches My']])(
        'fuehrt das %s (%s) auf "uA" zurueck',
        (eingabe) => {
            expect(normalizeUnitString(eingabe)).toBe('uA');
        }
    );
});

describe('normalizeExpressionFormula', () => {
    /**
     * Formeln und Einheiten muenden in DENSELBEN Parser. Wird nur einer der
     * beiden Wege umgeschrieben, scheitert stattdessen die Umrechnung — mit
     * derselben Folge: ein fehlerfreier Rechenweg wird als Fehler gemeldet.
     */
    it('schreibt Hochzahlen auch innerhalb einer Formel aus', () => {
        expect(normalizeExpressionFormula('2 * m²')).toBe('2 * m^2');
    });

    /** Symmetrie zu `normalizeUnitString`: dasselbe Zeichen, derselbe Parser. */
    it('ersetzt das Mikro-Zeichen auch in der Formel', () => {
        expect(normalizeExpressionFormula('1846 µA')).toBe('1846 uA');
        expect(normalizeExpressionFormula('1846 μA')).toBe('1846 uA');
    });

    it('ersetzt Ohm- und Waehrungszeichen in der Formel', () => {
        expect(normalizeExpressionFormula('230 V / 6.5 kΩ')).toContain('kohm');
        expect(normalizeExpressionFormula('12 € + 3 $')).toBe('12 EUR + 3 USD');
    });
});

describe('convertBetweenUnits', () => {
    it('rechnet zwischen Praefixen um', () => {
        expect(convertBetweenUnits(1, 'A', 'mA')).toBeCloseTo(1000, 6);
    });

    /** Waehrungen sind auf der GETEILTEN mathjs-Instanz registriert. */
    it('kennt die selbst registrierten Waehrungen', () => {
        expect(convertBetweenUnits(5, 'EUR', 'EUR')).toBeCloseTo(5, 6);
    });

    it('liefert null statt zu werfen, wenn die Dimension nicht passt', () => {
        expect(convertBetweenUnits(1, 'A', 'V')).toBeNull();
    });
});

describe('parseTargetValues', () => {
    it('nimmt Zahl, Liste und Text entgegen', () => {
        expect(parseTargetValues(42)).toEqual([42]);
        expect(parseTargetValues([1, 2])).toEqual([1, 2]);
        expect(parseTargetValues('1.5 und 2.5')).toEqual([1.5, 2.5]);
    });

    /** Deutsche Dezimalkommas sind der Normalfall in Schuelerarbeiten. */
    it('liest das deutsche Dezimalkomma', () => {
        expect(parseTargetValues('1,846')).toEqual([1.846]);
    });

    it('liest die wissenschaftliche Schreibweise', () => {
        expect(parseTargetValues('1.846e-3')).toEqual([1.846e-3]);
    });
});

describe('parseUnitsPerValue', () => {
    /**
     * EINE Einheit bei mehreren Zwischenwerten gehoert ans ENDERGEBNIS, nicht
     * an den ersten Wert. Andersherum wuerde die Einheit gegen einen
     * Zwischenschritt geprueft — und das Endergebnis bliebe ungeprueft.
     */
    it('haengt eine einzelne Einheit an den letzten Wert', () => {
        expect(parseUnitsPerValue('mA', 3)).toEqual([undefined, undefined, 'mA']);
    });

    it('ordnet mehrere Einheiten der Reihe nach zu', () => {
        expect(parseUnitsPerValue('kΩ, mA', 2)).toEqual(['kΩ', 'mA']);
        expect(parseUnitsPerValue('kΩ; mA', 2)).toEqual(['kΩ', 'mA']);
    });

    it('liefert ohne Einheit lauter Leerstellen', () => {
        expect(parseUnitsPerValue(undefined, 2)).toEqual([undefined, undefined]);
    });
});
