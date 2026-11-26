import { reiterNachWechsel } from '../../src/lib/aufgaben-reiter';

const namen = ['Aufgabe 1', 'Aufgabe 2', 'Aufgabe 3'];

describe('reiterNachWechsel', () => {
    it('neue Arbeit ohne Stecknadel: zurueck zum ersten Reiter', () => {
        expect(reiterNachWechsel({ aktiv: 'Aufgabe 3', namen, arbeitGewechselt: true, behalten: false })).toBe('Aufgabe 1');
    });

    it('neue Arbeit mit Stecknadel: Reiter bleibt (aufgabenweise pruefen)', () => {
        expect(reiterNachWechsel({ aktiv: 'Aufgabe 3', namen, arbeitGewechselt: true, behalten: true })).toBe('Aufgabe 3');
    });

    it('gleiche Arbeit: Reiter bleibt, auch ohne Stecknadel', () => {
        expect(reiterNachWechsel({ aktiv: 'Aufgabe 2', namen, arbeitGewechselt: false, behalten: false })).toBe('Aufgabe 2');
    });

    it('Reiter gibt es nicht mehr oder noch keiner gewaehlt: erster Reiter', () => {
        expect(reiterNachWechsel({ aktiv: 'Aufgabe 9', namen, arbeitGewechselt: false, behalten: true })).toBe('Aufgabe 1');
        expect(reiterNachWechsel({ aktiv: '', namen, arbeitGewechselt: false, behalten: false })).toBe('Aufgabe 1');
    });

    it('ohne Aufgaben bleibt alles, wie es ist', () => {
        expect(reiterNachWechsel({ aktiv: '', namen: [], arbeitGewechselt: true, behalten: false })).toBe('');
    });
});
