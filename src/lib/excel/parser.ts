import * as XLSX from 'xlsx';
import { logger } from '../logger';
import { BatchFile } from '../../types';

/**
 * Warum aus einer Datei keine Arbeiten wurden.
 *
 * BEFUND 18.08.2026: Vorher gab es hier nur eine leere Liste. Wer die falsche
 * Datei erwischte, sah nichts passieren und erfuhr nicht warum — `XLSX.read`
 * wirft bei einer Textdatei nicht, es liefert eine leere Mappe. Jede der drei
 * Ursachen verlangt aber etwas anderes von der Lehrkraft, und ohne diese
 * Unterscheidung war keine davon erkennbar.
 */
export type MoodleBefund =
    /** Arbeiten gefunden. */
    | { art: 'ok' }
    /** Die Datei liess sich gar nicht als Tabelle lesen. */
    | { art: 'keine-tabelle' }
    /** Tabelle gelesen, aber keine Spalte sieht nach einer Antwort aus. */
    | { art: 'keine-antwortspalten'; spalten: string[] }
    /** Antwortspalten vorhanden, aber in keiner Zeile steht etwas darin. */
    | { art: 'alle-leer'; zeilen: number };

export interface MoodleErgebnis {
    arbeiten: Partial<BatchFile>[];
    befund: MoodleBefund;
}

/**
 * Sagt der Lehrkraft, was zu tun ist — nicht, was technisch geschah.
 *
 * Jede der drei Ursachen verlangt einen anderen nächsten Schritt: eine andere
 * Datei wählen, den Export in Moodle anders einstellen, oder nichts (weil
 * niemand etwas geschrieben hat).
 */
export function erklaereMoodleBefund(befund: MoodleBefund): string {
    switch (befund.art) {
        case 'ok':
            return '';
        case 'keine-tabelle':
            return 'Die Datei liess sich nicht als Tabelle lesen. Stammt sie wirklich aus dem '
                + 'Moodle-Export, oder wurde eine andere Datei umbenannt?';
        case 'keine-antwortspalten':
            return 'Die Tabelle enthält keine Antwortspalten. Erwartet werden Spalten, deren '
                + 'Name mit „Antwort", „Response", „Frage" oder „F1" beginnt.\n\n'
                + `Gefunden wurden: ${befund.spalten.join(', ') || '(keine Spalten)'}\n\n`
                + 'Beim Moodle-Export muss „Antworten einbeziehen" aktiviert sein.';
        case 'alle-leer':
            return `Die Tabelle hat ${befund.zeilen} Zeile(n) mit Antwortspalten, aber in keiner `
                + 'steht eine Antwort. Vermutlich hat niemand abgegeben — oder der Export enthält '
                + 'nur die Bewertungsspalten.';
    }
}

/**
 * Industrial Moodle Parser (@principal_architect)
 * Analyzes Moodle Quiz Exports (XLSX/CSV) and extracts student responses.
 */
export const parseMoodleExcel = async (file: File): Promise<MoodleErgebnis> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = (worksheet ? XLSX.utils.sheet_to_json(worksheet) : []) as any[];

                if (rows.length === 0) {
                    resolve({ arbeiten: [], befund: { art: 'keine-tabelle' } });
                    return;
                }

                const responsePattern = /^(Response|Antwort|Frage|F\s*\d+)/i;

                // Welche Spalten kommen ueberhaupt als Antwort in Frage? Fehlt
                // hier alles, ist es kein Moodle-Export — und genau das muss die
                // Lehrkraft erfahren, statt eine leere Liste zu sehen.
                const alleSpalten = Array.from(
                    new Set(rows.flatMap(row => Object.keys(row)))
                );
                const antwortSpalten = alleSpalten.filter(s => responsePattern.test(s));

                if (antwortSpalten.length === 0) {
                    resolve({
                        arbeiten: [],
                        befund: { art: 'keine-antwortspalten', spalten: alleSpalten.slice(0, 8) }
                    });
                    return;
                }

                const results: Partial<BatchFile>[] = rows.map((row, idx) => {
                    const lastName = row['Nachname'] || row['Last name'] || row['Surname'] || '';
                    const firstName = row['Vorname'] || row['First name'] || '';
                    const fullName = `${firstName} ${lastName}`.trim();

                    const responseParts: string[] = [];
                    
                    Object.entries(row).forEach(([key, value]) => {
                        if (responsePattern.test(key) && value != null) {
                            const valStr = String(value).trim();
                            const isNumeric = /^-?\d+([.,]\d+)?$/.test(valStr);
                            if (isNumeric && valStr.length < 5) return; 

                            if (valStr.length > 0) {
                                responseParts.push(`=== MOODLE: ${key} ===\n${valStr}`);
                            }
                        }
                    });

                    const consolidatedText = responseParts.join('\n\n');

                    return {
                        name: `Schüler #${idx + 1}`,
                        originalName: fullName || `Moodle-Schüler #${idx + 1}`,
                        studentFirstName: firstName || undefined,
                        studentLastName: lastName || undefined,
                        status: 'pending',
                        fileText: consolidatedText,
                        ocrDone: false,
                        documentType: 'typed',
                        pageCount: 1,
                        selected: true,
                        result: null,
                        error: null
                    };
                });

                const arbeiten = results.filter(r => r.fileText && r.fileText.length > 0);

                resolve({
                    arbeiten,
                    befund: arbeiten.length > 0
                        ? { art: 'ok' }
                        : { art: 'alle-leer', zeilen: rows.length }
                });
            } catch (err) {
                logger.error("Moodle parsing failed", { message: String(err) });
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};
