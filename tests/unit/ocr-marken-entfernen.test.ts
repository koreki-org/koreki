import { entferneOcrMarken, zaehleOcrMarken, aufgabenOhneOcrMarken } from '../../src/lib/ocr-marken-entfernen';

describe('entferneOcrMarken', () => {
    it('laesst das Wort vor der Marke stehen', () => {
        expect(entferneOcrMarken('Es darf nur eine Festpult (?) ausfüllen (?)')).toBe('Es darf nur eine Festpult ausfüllen');
    });

    it('Marke am Satzende: kein Leerzeichen vor dem Punkt', () => {
        expect(entferneOcrMarken('Das ist richtig (?).')).toBe('Das ist richtig.');
        expect(entferneOcrMarken('Stimmt das (?)? Ja.')).toBe('Stimmt das? Ja.');
    });

    it('mehrere Marken hintereinander', () => {
        expect(entferneOcrMarken('Wort (?) (?) weiter')).toBe('Wort weiter');
        expect(entferneOcrMarken('Wort (?)(?) weiter')).toBe('Wort weiter');
        expect(entferneOcrMarken('a (?) b (?) c (?)')).toBe('a b c');
    });

    it('mit und ohne Leerzeichen davor, auch mit Leerzeichen in der Klammer', () => {
        expect(entferneOcrMarken('Wort(?) weiter')).toBe('Wort weiter');
        expect(entferneOcrMarken('Fest- platten ( ? ) gehen')).toBe('Fest- platten gehen');
        expect(entferneOcrMarken('Wort (?)weiter')).toBe('Wort weiter');
    });

    it('Zeilenumbrueche bleiben, am Zeilenende bleibt kein Leerzeichen', () => {
        expect(entferneOcrMarken('erste (?)\nzweite (?)\n')).toBe('erste\nzweite\n');
        expect(entferneOcrMarken('erste (?)\r\nzweite')).toBe('erste\r\nzweite');
        expect(entferneOcrMarken('(?) Anfang')).toBe('Anfang');
    });

    it('Text ohne Marke bleibt unveraendert', () => {
        const text = 'Ganz normaler Text (mit Klammer) und Frage?';
        expect(entferneOcrMarken(text)).toBe(text);
        expect(entferneOcrMarken('')).toBe('');
    });

    it('andere Marken bleiben unberuehrt', () => {
        expect(entferneOcrMarken('[GESTRICHEN] Wert (?) [EINTRAGUNG: Linie] [UNLESERLICH]'))
            .toBe('[GESTRICHEN] Wert [EINTRAGUNG: Linie] [UNLESERLICH]');
    });
});

describe('zaehleOcrMarken', () => {
    it('zaehlt jede Marke, auch mit Leerzeichen in der Klammer', () => {
        expect(zaehleOcrMarken('a (?) b ( ? ) c (?)(?)')).toBe(4);
        expect(zaehleOcrMarken('ohne')).toBe(0);
    });
});

describe('aufgabenOhneOcrMarken', () => {
    const layout = [{ name: '1a', maxPoints: 2 }, { name: '1b', maxPoints: 3 }, { name: '2', maxPoints: 4 }];

    it('bereinigt vorhandene Eintraege und legt fehlende aus dem gezeigten Text an', () => {
        const aufgaben = [{ name: '1a', content: 'alt (?)', pointsObtained: 1 }];
        const { anzahl, aufgaben: neu } = aufgabenOhneOcrMarken(aufgaben, layout, ['alt (?)', 'roh (?) (?)', 'sauber']);

        expect(anzahl).toBe(3);
        expect(neu).toEqual([
            { name: '1a', content: 'alt', pointsObtained: 1 },
            { name: '1b', content: 'roh', maxPoints: 3 },
        ]);
        // Die Eingabe bleibt unangetastet.
        expect(aufgaben[0].content).toBe('alt (?)');
    });

    it('bereinigt auch Aufgaben, die das Layout nicht kennt', () => {
        const { anzahl, aufgaben } = aufgabenOhneOcrMarken([{ name: 'X', content: 'fremd (?)' }], layout, []);
        expect(anzahl).toBe(1);
        expect(aufgaben).toEqual([{ name: 'X', content: 'fremd' }]);
    });

    it('ohne Marken: Anzahl 0, Aufgaben unveraendert', () => {
        const aufgaben = [{ name: '1a', content: 'gut' }];
        const ergebnis = aufgabenOhneOcrMarken(aufgaben, layout, ['gut', '', '']);
        expect(ergebnis.anzahl).toBe(0);
        expect(ergebnis.aufgaben).toEqual(aufgaben);
    });
});
