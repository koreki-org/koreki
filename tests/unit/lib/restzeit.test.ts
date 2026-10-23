import { schaetzeRestzeit, formatiereRestzeit } from '../../../src/lib/restzeit';

/**
 * Restzeit eines Stapellaufs (Layer 1)
 * ⏱️
 *
 * Die Anzeige verspricht der Lehrkraft eine Wartezeit. Geprueft wird, dass sie
 * nur aus Gemessenem rechnet, sich von einem Ausreisser nicht treiben laesst und
 * keine Genauigkeit vortaeuscht.
 */
describe('schaetzeRestzeit', () => {
    it('schaetzt nichts, solange kein Blatt gemessen ist', () => {
        expect(schaetzeRestzeit([], 10)).toBeNull();
    });

    it('schaetzt nichts, wenn kein Blatt mehr offen ist', () => {
        expect(schaetzeRestzeit([30_000], 0)).toBeNull();
    });

    it('rechnet Dauer pro Blatt mal offene Blaetter', () => {
        expect(schaetzeRestzeit([30_000], 4)).toBe(120_000);
    });

    it('laesst sich von einem langsamen ersten Blatt nicht treiben', () => {
        // Ein lokales Modell laedt beim ersten Blatt — das dauert ein Vielfaches.
        expect(schaetzeRestzeit([180_000, 30_000, 30_000], 2)).toBe(60_000);
    });

    it('mittelt bei gerader Anzahl die beiden mittleren Werte', () => {
        expect(schaetzeRestzeit([20_000, 40_000], 1)).toBe(30_000);
    });
});

describe('formatiereRestzeit', () => {
    it('sagt unter einer halben Minute "weniger als 1 Min."', () => {
        expect(formatiereRestzeit(20_000)).toBe('noch weniger als 1 Min.');
    });

    it('rundet auf volle Minuten', () => {
        expect(formatiereRestzeit(3 * 60_000 + 40_000)).toBe('noch ca. 4 Min.');
    });

    it('nennt ab einer Stunde Stunden und Minuten', () => {
        expect(formatiereRestzeit(75 * 60_000)).toBe('noch ca. 1 Std. 15 Min.');
        expect(formatiereRestzeit(120 * 60_000)).toBe('noch ca. 2 Std.');
    });
});
