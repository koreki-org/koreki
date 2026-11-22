/**
 * Baut das ZIP des Claude-Skills „Koreki-Check für Klassenarbeiten“.
 *
 * Quelle ist allein `handbuch/public/downloads/koreki-klassenarbeit-check/SKILL.md`.
 * Claude nimmt eigene Skills nur als ZIP an, dessen oberste Ebene der Ordner des
 * Skills ist (Hilfe-Seite „How to create custom skills“, 21.11.2026). Das ZIP liegt
 * daneben, damit hilfe.koreki.org es ausliefert.
 *
 * Wer die SKILL.md ändert, baut das ZIP neu: `npm run handbuch:skill`.
 * Dass beide übereinstimmen, prüft `tests/unit/klassenarbeit-check-skill.test.ts`.
 */
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const ORDNER = 'koreki-klassenarbeit-check';
const basis = path.resolve('handbuch/public/downloads');
const quelle = path.join(basis, ORDNER, 'SKILL.md');
const ziel = path.join(basis, `${ORDNER}.zip`);

const zip = new JSZip();
// Zeilenenden einheitlich LF: Git wandelt sie unter Windows beim Auschecken um, sonst
// haengt der Inhalt des ZIPs davon ab, auf welchem Rechner es gebaut wurde.
const inhalt = fs.readFileSync(quelle, 'utf8').replace(/\r\n/g, '\n');
// Festes Datum: Gleicher Inhalt ergibt dasselbe ZIP, sonst aendert jeder Lauf die Datei.
zip.file(`${ORDNER}/SKILL.md`, inhalt, { date: new Date('2026-01-01T00:00:00Z') });
const daten = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(ziel, daten);
console.log(`geschrieben: ${path.relative(process.cwd(), ziel)} (${daten.length} Bytes)`);
