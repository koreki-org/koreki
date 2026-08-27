import * as fs from 'fs';
import * as path from 'path';

/**
 * Waechter: keine beweglichen Modellkennungen im Produktionscode.
 *
 * Hinter `mistral-medium-latest` kann der Anbieter jederzeit ein anderes Modell
 * legen. Fuer ein Bewertungssystem ist das doppelt untragbar:
 *
 *   1. Eine gemessene Genauigkeit gilt nur fuer das Modell, das gemessen wurde.
 *      Wandert die Kennung, ist die Zahl in der Betriebsanleitung unbelegt —
 *      ohne dass es jemandem auffaellt.
 *   2. Das Protokoll der KI-Laeufe benennt dann ein Modell, das so nie
 *      geantwortet hat.
 *
 * Am 27.08.2026 standen vier `-latest`-Kennungen im Code. Drei davon lagen
 * NICHT in constants.ts, sondern als Zeichenkette in Aufrufstellen — die erste
 * Suche hatte sie uebersehen. Genau deshalb steht hier ein Test und nicht nur
 * ein Kommentar in der Konstantendatei.
 *
 * Erlaubt bleiben Ollama-Kennungen wie `mistral-small3.2:latest`: die zieht der
 * Betreiber selbst auf seinen Rechner, sie aendern sich nicht hinter seinem
 * Ruecken.
 */

const WURZEL = path.resolve(__dirname, '../../src');

/** Gehostete Modellkennung mit beweglichem Ziel, z. B. 'mistral-medium-latest'. */
const BEWEGLICH = /['"`]mistral-[a-z0-9]+-latest['"`]/;

function sammleDateien(verzeichnis: string, treffer: string[] = []): string[] {
    for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
        const voll = path.join(verzeichnis, eintrag.name);
        if (eintrag.isDirectory()) {
            if (eintrag.name === 'prompts') continue; // Anweisungstexte, kein Code
            sammleDateien(voll, treffer);
        } else if (/\.(ts|tsx)$/.test(eintrag.name)) {
            treffer.push(voll);
        }
    }
    return treffer;
}

/** Kommentare entfernen: In der Begruendung DARF `-latest` vorkommen. */
function ohneKommentare(quelltext: string): string {
    return quelltext
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Modellkennungen sind festgeschrieben', () => {
    it('nennt nirgends im Produktionscode eine -latest-Kennung', () => {
        const verstoesse: string[] = [];

        for (const datei of sammleDateien(WURZEL)) {
            const inhalt = ohneKommentare(fs.readFileSync(datei, 'utf-8'));
            inhalt.split(/\r?\n/).forEach((zeile, idx) => {
                if (BEWEGLICH.test(zeile)) {
                    verstoesse.push(`${path.relative(WURZEL, datei)}:${idx + 1}  ${zeile.trim()}`);
                }
            });
        }

        expect(verstoesse).toEqual([]);
    });

    it('haelt die festgeschriebenen Kennungen in constants.ts beisammen', async () => {
        const konstanten = await import('@/lib/ai/constants');
        const gepinnt = [
            konstanten.MISTRAL_OCR_MODEL,
            konstanten.MISTRAL_CORE_MODEL,
            konstanten.MISTRAL_UTILS_MODEL,
            konstanten.MISTRAL_CHATS_MODEL,
            konstanten.MISTRAL_MEDIUM_MODEL
        ];

        for (const kennung of gepinnt) {
            expect(kennung).not.toMatch(/-latest$/);
            // Eine feste Version traegt eine Versions- oder Datumsangabe.
            expect(kennung).toMatch(/-\d[\d.-]*$/);
        }
    });
});
