/**
 * Wächter für den Claude-Skill „Koreki-Check für Klassenarbeiten“ (21.11.2026).
 *
 * Der Skill liegt zweimal im Handbuch: als lesbare SKILL.md und als ZIP, das
 * Claude zum Hochladen verlangt. Ein ZIP ist eine Binärdatei — wer die SKILL.md
 * ändert und das Neubauen vergisst, liefert stillschweigend die alte Fassung aus.
 * Deshalb wird hier der Inhalt des ZIPs gegen die Quelle verglichen.
 *
 * Dazu die Regeln, an denen Claude ein Hochladen ablehnt: Der Ordner im ZIP heißt
 * wie der Skill, `name` höchstens 64 Zeichen, `description` höchstens 200
 * (Hilfe-Seite „How to create custom skills“).
 *
 * Neu bauen: `npm run handbuch:skill`.
 */
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

// jest.setup.js ersetzt JSZip global durch eine Attrappe — hier muss das echte ZIP gelesen werden.
jest.unmock('jszip');

const ORDNER = 'koreki-klassenarbeit-check';
const BASIS = path.resolve(__dirname, '../../handbuch/public/downloads');
const QUELLE = path.join(BASIS, ORDNER, 'SKILL.md');
const ZIP = path.join(BASIS, `${ORDNER}.zip`);

function kopfFeld(text: string, feld: string): string {
    const kopf = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!kopf) throw new Error('SKILL.md hat keinen Kopf zwischen --- und ---');
    const zeile = kopf[1].split(/\r?\n/).find(z => z.startsWith(`${feld}:`));
    if (!zeile) throw new Error(`Feld "${feld}" fehlt im Kopf der SKILL.md`);
    return zeile.slice(feld.length + 1).trim();
}

describe('Claude-Skill „Koreki-Check für Klassenarbeiten“', () => {
    // Zeilenenden vereinheitlichen: Git wandelt sie unter Windows beim Auschecken um.
    const quelle = fs.readFileSync(QUELLE, 'utf8').replace(/\r\n/g, '\n');

    it('das ZIP enthält genau den Ordner des Skills mit der aktuellen SKILL.md', async () => {
        const zip = await JSZip.loadAsync(fs.readFileSync(ZIP));
        const dateien = Object.values(zip.files).filter(f => !f.dir).map(f => f.name);
        expect(dateien).toEqual([`${ORDNER}/SKILL.md`]);

        const imZip = await zip.file(`${ORDNER}/SKILL.md`)!.async('string');
        if (imZip !== quelle) {
            throw new Error('Das ZIP ist veraltet. Neu bauen mit `npm run handbuch:skill`.');
        }
    });

    it('der Name stimmt mit dem Ordner überein und hält Claudes Grenzen ein', () => {
        const name = kopfFeld(quelle, 'name');
        expect(name).toBe(ORDNER);
        expect(name.length).toBeLessThanOrEqual(64);
        expect(kopfFeld(quelle, 'description').length).toBeLessThanOrEqual(200);
    });
});
