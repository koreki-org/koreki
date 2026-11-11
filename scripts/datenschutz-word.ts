/**
 * Erzeugt die Word-Fassung der Datenschutz-Unterlagen für Schulen aus der
 * Markdown-Quelle. Aufruf: `npm run docs:datenschutz-word`.
 *
 * Nach jeder Änderung an der Quelle laufen lassen und beide Dateien zusammen
 * committen — sonst schlägt `datenschutz-word-aktuell.test.ts` fehl.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { DATENSCHUTZ_QUELLE, DATENSCHUTZ_WORD, erzeugeDatenschutzWord } from '../src/lib/word/datenschutz-paket';

async function main(): Promise<void> {
    const bytes = await erzeugeDatenschutzWord(readFileSync(DATENSCHUTZ_QUELLE, 'utf-8'));
    mkdirSync(dirname(DATENSCHUTZ_WORD), { recursive: true });
    writeFileSync(DATENSCHUTZ_WORD, bytes);
    process.stdout.write(`${DATENSCHUTZ_WORD} geschrieben (${bytes.length} Bytes)\n`);
}

void main();
