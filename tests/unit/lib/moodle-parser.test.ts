/**
 * `xlsx` ist in jest.setup.js global durch eine Attrappe ersetzt — sie kennt
 * nur die Schreib-Funktionen, die der Excel-EXPORT braucht. Zum Pruefen des
 * LESERS braucht es das echte Modul, sonst pruefte der Test die Attrappe.
 */
jest.mock('xlsx', () => jest.requireActual('xlsx'));

import * as XLSX from 'xlsx';
import { parseMoodleExcel } from '../../../src/lib/excel/parser';

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
        const [s] = await parseMoodleExcel(alsDatei([
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
        const [s] = await parseMoodleExcel(alsDatei([
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
        const alle = await parseMoodleExcel(alsDatei([
            { Nachname: 'Muster', Vorname: 'Alex', Antwort: 'Eine ausreichend lange Antwort.' },
            { Nachname: 'Beispiel', Vorname: 'Kim', Antwort: 'Noch eine lange Antwort dazu.' }
        ]));

        expect(alle[0].name).toBe('Schüler #1');
        expect(alle[1].name).toBe('Schüler #2');
    });

    it('kommt ohne Namensspalten zurecht', async () => {
        const [s] = await parseMoodleExcel(alsDatei([
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
            const [s] = await parseMoodleExcel(alsDatei([
                { Nachname: 'M', [spalte]: 'Der Inhalt dieser Antwort.' }
            ]));

            expect(s.fileText).toContain('Der Inhalt dieser Antwort.');
            expect(s.fileText).toContain(spalte);
        }
    );

    /** Verwaltungsspalten gehoeren nicht in den Bewertungstext. */
    it('uebergeht Spalten, die keine Antwort sind', async () => {
        const [s] = await parseMoodleExcel(alsDatei([
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
        const [s] = await parseMoodleExcel(alsDatei([
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
        const alle = await parseMoodleExcel(alsDatei([
            { Nachname: 'M', 'Antwort 1': '42', 'Antwort 2': 'Eine ausreichend lange Antwort.' }
        ]));

        expect(alle[0].fileText).not.toContain('42');
        expect(alle[0].fileText).toContain('Eine ausreichend lange Antwort.');
    });

    it('behaelt laengere Zahlen', async () => {
        const [s] = await parseMoodleExcel(alsDatei([
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
        const alle = await parseMoodleExcel(alsDatei([
            { Nachname: 'MitAntwort', Antwort: 'Eine ausreichend lange Antwort.' },
            { Nachname: 'OhneAntwort', Status: 'Nicht bearbeitet' }
        ]));

        expect(alle).toHaveLength(1);
        expect(alle[0].studentLastName).toBe('MitAntwort');
    });

    it('liefert bei einer leeren Tabelle eine leere Liste', async () => {
        expect(await parseMoodleExcel(alsDatei([]))).toEqual([]);
    });
});

describe('Der eingelesene Stapel', () => {
    it('markiert jede Arbeit als offen und ausgewaehlt', async () => {
        const [s] = await parseMoodleExcel(alsDatei([
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
        const [s] = await parseMoodleExcel(alsDatei([
            { Nachname: 'M', Antwort: 'Eine ausreichend lange Antwort.' }
        ]));

        expect(s.documentType).toBe('typed');
        expect(s.ocrDone).toBe(false);
        expect(s.pageCount).toBe(1);
    });

    /**
     * BEFUND, 18.08.2026 — festgehalten, NICHT behoben.
     *
     * Eine Datei, die kein Moodle-Export ist, ergibt eine leere Liste statt
     * eines Fehlers: `XLSX.read` wirft nicht, es liefert eine leere Mappe.
     * Wer die falsche Datei erwischt, sieht also nichts passieren und bekommt
     * keinen Hinweis, warum.
     *
     * Das ist dieselbe Klasse wie der Erfahrungsschatz-Import vom selben Tag:
     * ein leeres Ergebnis, das aussieht wie „nichts zu tun". Die Entscheidung,
     * ob der Parser das melden soll, gehoert dem Aufrufer — dieser Test haelt
     * bis dahin fest, was tatsaechlich geschieht, damit es niemand fuer
     * geprueft haelt.
     */
    it.each([
        ['eine Textdatei', new File(['kein XLSX, nur Text'], 'kaputt.xlsx')],
        ['ein PDF', new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'arbeit.pdf')]
    ])('liefert fuer %s stillschweigend eine leere Liste', async (_name, datei) => {
        await expect(parseMoodleExcel(datei)).resolves.toEqual([]);
    });
});
