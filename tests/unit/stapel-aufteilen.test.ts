import {
    stueckeAus, anfaengeJeSeitenzahl, setzeAnfang, entferneAnfang, vorschlagJeArbeit, teileNamen, leseKlassenliste,
    namensAusEingabe, freieNamen, baueAufteilung, anzeigeName,
    stueckIndex, naechsteArbeit, vorigeArbeit, vorschlaege
} from '../../src/lib/stapel-aufteilen';
import { generateSplitBatchItems } from '../../src/lib/logic';

describe('stapel-aufteilen', () => {
    describe('Schneiden', () => {
        it('macht aus Anfangsseiten lueckenlose Stuecke', () => {
            expect(stueckeAus([1, 3, 6], 1, 7)).toEqual([
                { start: 1, ende: 2 }, { start: 3, ende: 5 }, { start: 6, ende: 7 }
            ]);
        });

        it('setzt die erste Seite immer als Anfang und verwirft Seiten ausserhalb', () => {
            expect(stueckeAus([4, 99, 0], 1, 6)).toEqual([{ start: 1, ende: 3 }, { start: 4, ende: 6 }]);
        });

        it('rechnet mit Seiten eines bereits aufgeteilten Teils (nicht ab 1)', () => {
            expect(stueckeAus([7], 5, 8)).toEqual([{ start: 5, ende: 6 }, { start: 7, ende: 8 }]);
        });

        it('teilt gleich lang, ein Rest bleibt als kuerzeres letztes Stueck', () => {
            expect(anfaengeJeSeitenzahl(1, 7, 2)).toEqual([1, 3, 5, 7]);
            expect(anfaengeJeSeitenzahl(1, 6, 0)).toEqual([1, 2, 3, 4, 5, 6]);
        });

        it('springt von Arbeit zu Arbeit', () => {
            const stuecke = stueckeAus([1, 3, 6], 1, 7);
            expect(stueckIndex(stuecke, 4)).toBe(1);
            expect(naechsteArbeit(stuecke, 4)).toBe(6);
            expect(naechsteArbeit(stuecke, 7)).toBe(7);
            expect(vorigeArbeit(stuecke, 4)).toBe(3);
            expect(vorigeArbeit(stuecke, 3)).toBe(1);
            expect(vorigeArbeit(stuecke, 1)).toBe(1);
        });

        it('kuerzere Arbeit: der naechste Anfang wandert her, der Rest rueckt mit und wird aufgefuellt', () => {
            // 16 Seiten, je 4. Arbeit 2 hat nur 3 Seiten, Arbeit 3 beginnt auf Seite 8.
            expect(setzeAnfang([1, 5, 9, 13], 8, 1, 16, 4)).toEqual([1, 5, 8, 12, 16]);
        });

        it('laengere Arbeit: Entf nimmt den falschen Anfang weg, Enter setzt den richtigen', () => {
            const ohne = entferneAnfang([1, 5, 9, 13, 17], 9, 1);
            expect(ohne).toEqual([1, 5, 13, 17]);
            expect(setzeAnfang(ohne, 10, 1, 20, 4)).toEqual([1, 5, 10, 14, 18]);
        });

        it('ohne spaeteren Anfang wird einfach geschnitten, ohne Abstand nicht aufgefuellt', () => {
            expect(setzeAnfang([1], 4, 1, 10, null)).toEqual([1, 4]);
            expect(setzeAnfang([1, 4], 7, 1, 10, null)).toEqual([1, 4, 7]);
        });

        it('schiebt Anfaenge hinter das Ende hinaus weg', () => {
            expect(setzeAnfang([1, 3, 5], 2, 1, 5, null)).toEqual([1, 2, 4]);
            expect(entferneAnfang([1, 3], 3, 1)).toEqual([1]);
        });

        it('schlaegt aus der Klassenliste einen Abstand vor, gerundet wenn es nicht aufgeht', () => {
            expect(vorschlagJeArbeit(84, 28)).toEqual({ jeArbeit: 3, glatt: true });
            expect(vorschlagJeArbeit(83, 28)).toEqual({ jeArbeit: 3, glatt: false });
            expect(vorschlagJeArbeit(5, 28)).toEqual({ jeArbeit: 1, glatt: false });
            expect(vorschlagJeArbeit(10, 0)).toBeNull();
        });

        it('laesst die erste Seite und vorhandene Anfaenge in Ruhe', () => {
            expect(setzeAnfang([1, 5], 1, 1, 8, 4)).toEqual([1, 5]);
            expect(setzeAnfang([1, 5], 5, 1, 8, 4)).toEqual([1, 5]);
            expect(entferneAnfang([1, 5], 1, 1)).toEqual([1, 5]);
        });
    });

    describe('Namen', () => {
        it('teilt „Nachname, Vorname“ und „Vorname Nachname“', () => {
            expect(teileNamen('Meier, Anna')).toEqual({ nachname: 'Meier', vorname: 'Anna' });
            expect(teileNamen('Anna  von Meier')).toEqual({ vorname: 'Anna', nachname: 'von Meier' });
            expect(teileNamen('Meier')).toEqual({ nachname: 'Meier', vorname: '' });
        });

        it('liest die Klassenliste und ueberspringt die Kopfzeile', () => {
            const liste = leseKlassenliste([
                ['Nachname', 'Vorname'], ['Meier', 'Anna'], ['Yilmaz, Can'], [], [null, 'ohne Nachname']
            ]);
            expect(liste).toEqual([
                { nachname: 'Meier', vorname: 'Anna' }, { nachname: 'Yilmaz', vorname: 'Can' }
            ]);
        });

        it('nimmt die Schreibweise der Klassenliste, wenn die Eingabe passt', () => {
            const liste = [{ nachname: 'Müller', vorname: 'Lea' }];
            expect(namensAusEingabe('müller, lea', liste)).toEqual(liste[0]);
            expect(namensAusEingabe('Lea Müller', liste)).toEqual(liste[0]);
            expect(namensAusEingabe('Tom Neu', liste)).toEqual({ vorname: 'Tom', nachname: 'Neu' });
            expect(namensAusEingabe('  ', liste)).toBeNull();
        });

        it('bietet vergebene Namen nicht mehr an — ausser im eigenen Feld', () => {
            const liste = [{ nachname: 'A', vorname: 'x' }, { nachname: 'B', vorname: 'y' }];
            const vergeben = [anzeigeName(liste[0])];
            expect(freieNamen(liste, vergeben, '')).toEqual([liste[1]]);
            expect(freieNamen(liste, vergeben, vergeben[0])).toEqual(liste);
        });
    });

    describe('Vorschlag aus der Listenreihenfolge', () => {
        const liste = ['Aal', 'Beck', 'Cord', 'Dorn'].map(nachname => ({ nachname, vorname: '' }));
        const stuecke = stueckeAus([1, 2, 3, 4], 1, 4);
        const nachnamen = (v: ReturnType<typeof vorschlaege>) => stuecke.map(s => v[s.start]?.nachname ?? '-');

        it('schlaegt ohne Eingaben die Liste der Reihe nach vor', () => {
            expect(nachnamen(vorschlaege(stuecke, {}, liste))).toEqual(['Aal', 'Beck', 'Cord', 'Dorn']);
        });

        it('laeuft nach einer abweichenden Eingabe von dort weiter — eine fehlende Arbeit verschiebt nur einmal', () => {
            // Arbeit 2 ist in Wahrheit Cord (Beck fehlt): danach geht es mit Dorn weiter.
            expect(nachnamen(vorschlaege(stuecke, { 2: 'Cord' }, liste))).toEqual(['Aal', '-', 'Dorn', '-']);
        });

        it('schlaegt keinen Namen vor, der schon eingetragen ist', () => {
            expect(nachnamen(vorschlaege(stuecke, { 4: 'Aal' }, liste))).toEqual(['Beck', 'Cord', 'Dorn', '-']);
        });

        it('zaehlt Vorschlaege nie als Namen — nur Eingaben kommen in die Aufteilung', () => {
            expect(baueAufteilung(stuecke, {}, liste).every(a => a.lastName === undefined)).toBe(true);
        });
    });

    it('liefert Seitenzahlen und Namen in Stapelreihenfolge, unabhaengig von der Klassenliste', () => {
        const liste = [{ nachname: 'Aal', vorname: 'Ada' }, { nachname: 'Zorn', vorname: 'Zoe' }];
        const stuecke = stueckeAus([1, 3, 4], 1, 5);
        const ergebnis = baueAufteilung(stuecke, { 1: 'Zorn, Zoe', 3: 'Aal, Ada' }, liste);
        expect(ergebnis).toEqual([
            { firstName: 'Zoe', lastName: 'Zorn', pageCount: 2 },
            { firstName: 'Ada', lastName: 'Aal', pageCount: 1 },
            { firstName: undefined, lastName: undefined, pageCount: 2 }
        ]);
    });

    it('schreibt beim erneuten Aufteilen eines Teils die richtigen Dokumentseiten', () => {
        const teil = { name: 'Schüler #2', pageRange: [5, 8] as [number, number] };
        const neu = generateSplitBatchItems(teil, [{ pageCount: 2 }, { pageCount: 2 }], 1);
        expect(neu.map(n => n.pageRange)).toEqual([[5, 6], [7, 8]]);
    });
});
