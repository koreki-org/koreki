/**
 * `xlsx` ist in jest.setup.js global durch eine Attrappe ersetzt — sie kennt
 * nur die Schreib-Funktionen, die der Excel-EXPORT braucht. Zum Pruefen des
 * LESERS braucht es das echte Modul, sonst pruefte der Test die Attrappe.
 */
jest.mock('xlsx', () => jest.requireActual('xlsx'));

import * as XLSX from 'xlsx';
import { parseMoodleExcel, erklaereMoodleBefund } from '../../../src/lib/excel/parser';

/**
 * Moodle-Export einlesen (Layer 1)
 * 📥🎓
 *
 * Hier kommen Schuelerantworten ins System — der Anfang der ganzen Kette. Was
 * dieser Parser weglaesst, existiert fuer die Bewertung nicht mehr, und der
 * Lehrkraft faellt es nur auf, wenn sie die Liste von Hand nachzaehlt.
 *
 * Der Baustein war ungeprueft (0 % Zweigabdeckung). Zwei seiner Regeln
 * entscheiden ueber Vollstaendigkeit, nicht ueber Bequemlichkeit — sie stehen
 * unten ausdruecklich als solche beschrieben.
 */

/** Nur die Arbeiten — der Befund wird eigens geprueft. */
const arbeiten = async (datei: File) => (await parseMoodleExcel(datei)).arbeiten;

/** Baut eine echte XLSX-Datei aus Zeilen, wie Moodle sie exportiert. */
const alsDatei = (zeilen: Record<string, string | number>[]): File => {
    const blatt = XLSX.utils.json_to_sheet(zeilen);
    const mappe = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(mappe, blatt, 'Sheet1');
    const bytes = XLSX.write(mappe, { bookType: 'xlsx', type: 'array' });
    return new File([bytes], 'moodle.xlsx');
};

describe('Namen aus dem Export', () => {
    it('liest die deutschen Spaltenueberschriften', async () => {
        const [s] = await arbeiten(alsDatei([
            { Nachname: 'Muster', Vorname: 'Alex', Antwort: 'Eine ausreichend lange Antwort.' }
        ]));

        expect(s.studentLastName).toBe('Muster');
        expect(s.studentFirstName).toBe('Alex');
        expect(s.originalName).toBe('Alex Muster');
    });

    /** Moodle exportiert je nach Spracheinstellung anders. */
    it.each([
        ['Last name', 'First name'],
        ['Surname', 'First name']
    ])('liest auch die englische Fassung (%s)', async (nachSpalte, vorSpalte) => {
        const [s] = await arbeiten(alsDatei([
            { [nachSpalte]: 'Muster', [vorSpalte]: 'Alex', Response: 'Eine ausreichend lange Antwort.' }
        ]));

        expect(s.studentLastName).toBe('Muster');
        expect(s.originalName).toBe('Alex Muster');
    });

    /**
     * Der ANZEIGENAME ist von Anfang an pseudonym. Der Klarname steht getrennt
     * in `originalName` — so ist die Zuordnung fuer die Lehrkraft moeglich, ohne
     * dass der Name durch die gesamte Verarbeitung wandert.
     */
    it('vergibt einen pseudonymen Anzeigenamen', async () => {
        const alle = await arbeiten(alsDatei([
            { Nachname: 'Muster', Vorname: 'Alex', Antwort: 'Eine ausreichend lange Antwort.' },
            { Nachname: 'Beispiel', Vorname: 'Kim', Antwort: 'Noch eine lange Antwort dazu.' }
        ]));

        expect(alle[0].name).toBe('Schüler #1');
        expect(alle[1].name).toBe('Schüler #2');
    });

    it('kommt ohne Namensspalten zurecht', async () => {
        const [s] = await arbeiten(alsDatei([
            { Antwort: 'Eine ausreichend lange Antwort.' }
        ]));

        expect(s.originalName).toBe('Moodle-Schüler #1');
        expect(s.studentFirstName).toBeUndefined();
    });
});

describe('Welche Spalten als Antwort gelten', () => {
    it.each(['Response 1', 'Antwort 2', 'Frage 3', 'F 4'])(
        'nimmt die Spalte "%s"',
        async (spalte) => {
            const [s] = await arbeiten(alsDatei([
                { Nachname: 'M', [spalte]: 'Der Inhalt dieser Antwort.' }
            ]));

            expect(s.fileText).toContain('Der Inhalt dieser Antwort.');
            expect(s.fileText).toContain(spalte);
        }
    );

    /** Verwaltungsspalten gehoeren nicht in den Bewertungstext. */
    it('uebergeht Spalten, die keine Antwort sind', async () => {
        const [s] = await arbeiten(alsDatei([
            {
                Nachname: 'M',
                'E-Mail': 'niemand@example.org',
                Status: 'Beendet',
                Antwort: 'Die eigentliche Antwort hier.'
            }
        ]));

        expect(s.fileText).toContain('Die eigentliche Antwort hier.');
        expect(s.fileText).not.toContain('niemand@example.org');
        expect(s.fileText).not.toContain('Beendet');
    });

    it('setzt mehrere Antwortspalten getrennt zusammen', async () => {
        const [s] = await arbeiten(alsDatei([
            { Nachname: 'M', 'Antwort 1': 'Erste Antwort dazu.', 'Antwort 2': 'Zweite Antwort dazu.' }
        ]));

        expect(s.fileText).toContain('Erste Antwort dazu.');
        expect(s.fileText).toContain('Zweite Antwort dazu.');
        expect(s.fileText).toContain('=== MOODLE: Antwort 1 ===');
    });
});

describe('Was verlorengeht — bewusst und unbewusst', () => {
    /**
     * KURZE ZAHLEN WERDEN VERWORFEN.
     *
     * Gedacht ist das gegen Punkte- und Notenspalten, die Moodle mitliefert und
     * die nicht als Schuelerantwort zaehlen duerfen.
     *
     * Der Preis: eine echte NUMERISCHE Antwort unter fuenf Zeichen faellt
     * genauso weg — bei einer Rechenaufgabe also der Normalfall. Der Schueler
     * erscheint dann als unbeantwortet.
     *
     * Dieser Test haelt das Verhalten fest, damit die Abwaegung sichtbar ist
     * und nicht versehentlich in die eine oder andere Richtung kippt.
     */
    it('verwirft kurze Zahlen in Antwortspalten', async () => {
        const alle = await arbeiten(alsDatei([
            { Nachname: 'M', 'Antwort 1': '42', 'Antwort 2': 'Eine ausreichend lange Antwort.' }
        ]));

        expect(alle[0].fileText).not.toContain('42');
        expect(alle[0].fileText).toContain('Eine ausreichend lange Antwort.');
    });

    it('behaelt laengere Zahlen', async () => {
        const [s] = await arbeiten(alsDatei([
            { Nachname: 'M', Antwort: '1234567' }
        ]));

        expect(s.fileText).toContain('1234567');
    });

    /**
     * WER NICHTS GESCHRIEBEN HAT, TAUCHT NICHT AUF.
     *
     * Die Zeile wird vollstaendig verworfen. Fuer die Lehrkraft heisst das:
     * die Zahl der eingelesenen Arbeiten kann kleiner sein als die Zahl der
     * Zeilen im Export, ohne dass irgendwo etwas gemeldet wird.
     */
    it('laesst Zeilen ohne jede Antwort weg', async () => {
        const alle = await arbeiten(alsDatei([
            { Nachname: 'MitAntwort', Antwort: 'Eine ausreichend lange Antwort.' },
            { Nachname: 'OhneAntwort', Status: 'Nicht bearbeitet' }
        ]));

        expect(alle).toHaveLength(1);
        expect(alle[0].studentLastName).toBe('MitAntwort');
    });

    it('liefert bei einer leeren Tabelle eine leere Liste', async () => {
        expect(await arbeiten(alsDatei([]))).toEqual([]);
    });
});

describe('Der eingelesene Stapel', () => {
    it('markiert jede Arbeit als offen und ausgewaehlt', async () => {
        const [s] = await arbeiten(alsDatei([
            { Nachname: 'M', Antwort: 'Eine ausreichend lange Antwort.' }
        ]));

        expect(s.status).toBe('pending');
        expect(s.selected).toBe(true);
        expect(s.result).toBeNull();
        expect(s.error).toBeNull();
    });

    /**
     * Moodle-Text ist getippt, nicht gescannt. Waere `ocrDone` falsch gesetzt,
     * liefe eine Texterkennung ueber Text, der bereits vorliegt — das kostet
     * Credits und kann ihn verschlechtern.
     */
    it('kennzeichnet den Text als getippt und ohne Texterkennungsbedarf', async () => {
        const [s] = await arbeiten(alsDatei([
            { Nachname: 'M', Antwort: 'Eine ausreichend lange Antwort.' }
        ]));

        expect(s.documentType).toBe('typed');
        expect(s.ocrDone).toBe(false);
        expect(s.pageCount).toBe(1);
    });

    it.each([
        ['eine Textdatei', new File(['kein XLSX, nur Text'], 'kaputt.xlsx')],
        ['ein PDF', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'arbeit.pdf')]
    ])('liefert fuer %s keine Arbeiten', async (_name, datei) => {
        await expect(arbeiten(datei)).resolves.toEqual([]);
    });
});

/**
 * WARUM keine Arbeiten herauskamen (behoben am 18.08.2026)
 * ---------------------------------------------------------
 * Vorher gab es nur eine leere Liste. Wer die falsche Datei erwischte, sah
 * nichts passieren und erfuhr nicht warum — `XLSX.read` wirft bei einer
 * Textdatei nicht, es liefert eine leere Mappe. Dieselbe Klasse wie der
 * Erfahrungsschatz-Import vom selben Tag.
 *
 * Jede der drei Ursachen verlangt etwas anderes von der Lehrkraft: eine andere
 * Datei waehlen, den Moodle-Export anders einstellen, oder nichts tun (weil
 * niemand abgegeben hat). Deshalb werden sie unterschieden.
 */
describe('Der Befund', () => {
    it('meldet "ok", wenn Arbeiten herauskamen', async () => {
        const { befund } = await parseMoodleExcel(alsDatei([
            { Nachname: 'M', Antwort: 'Eine ausreichend lange Antwort.' }
        ]));

        expect(befund.art).toBe('ok');
        expect(erklaereMoodleBefund(befund)).toBe('');
    });

    it.each([
        ['eine Textdatei', new File(['kein XLSX, nur Text'], 'kaputt.xlsx')],
        ['ein PDF', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'arbeit.pdf')],
        ['eine leere Tabelle', alsDatei([])]
    ])('meldet fuer %s "keine-tabelle"', async (_name, datei) => {
        const { befund } = await parseMoodleExcel(datei);

        expect(befund.art).toBe('keine-tabelle');
        expect(erklaereMoodleBefund(befund)).toMatch(/nicht als Tabelle lesen/);
    });

    /**
     * DER HAEUFIGSTE FALL IN DER PRAXIS: eine echte Moodle-Tabelle, aber ohne
     * die Antwortspalten — beim Export war „Antworten einbeziehen" nicht
     * gesetzt. Die Meldung sagt genau das, statt „Format nicht erkannt".
     */
    it('meldet fehlende Antwortspalten und nennt die gefundenen', async () => {
        const { befund } = await parseMoodleExcel(alsDatei([
            { Nachname: 'Muster', Vorname: 'Alex', 'E-Mail': 'a@b.c', Bewertung: '12,0' }
        ]));

        expect(befund.art).toBe('keine-antwortspalten');
        const text = erklaereMoodleBefund(befund);
        expect(text).toContain('Nachname');
        expect(text).toContain('Bewertung');
        expect(text).toMatch(/Antworten einbeziehen/);
    });

    /** Antwortspalten da, aber niemand hat etwas hineingeschrieben. */
    it('meldet leere Antwortspalten samt Zeilenzahl', async () => {
        const { befund } = await parseMoodleExcel(alsDatei([
            { Nachname: 'A', Antwort: '' },
            { Nachname: 'B', Antwort: '' }
        ]));

        expect(befund.art).toBe('alle-leer');
        expect(erklaereMoodleBefund(befund)).toContain('2 Zeile');
    });

    /**
     * Die Unterscheidung muss TRAGEN: „keine Antwortspalten" und „alle leer"
     * verlangen verschiedene Schritte und duerfen nicht denselben Text ergeben.
     */
    it('erklaert die drei Ursachen verschieden', () => {
        const texte = [
            erklaereMoodleBefund({ art: 'keine-tabelle' }),
            erklaereMoodleBefund({ art: 'keine-antwortspalten', spalten: ['Nachname'] }),
            erklaereMoodleBefund({ art: 'alle-leer', zeilen: 3 })
        ];

        expect(new Set(texte).size).toBe(3);
        texte.forEach(t => expect(t.length).toBeGreaterThan(40));
    });
});
