/**
 * Waechter der Handschrift-Demo (18.11.2026).
 *
 * Die Blaetter unter `public/demo/handschrift/` sind gezeichnete Bilder — ob
 * ihr Text noch zur getippten Demo passt, sieht man ihnen nicht an, und kein
 * Skript kann sie neu erzeugen. Die Bewertung der Demo ist aber durchgemessen
 * und haengt am Wortlaut (Schueler #2 liest bewusst 1000 statt 1200 ab).
 * Geprueft wird deshalb:
 *
 *  1. Jede getippte Arbeit hat genau ein Blatt, und es liegt im Repo.
 *  2. Das Bild ist dasselbe, das geprueft wurde (Pruefsumme). Ein neues Bild
 *     braucht einen neuen Lauf der Bilderkennung, bevor die Summe erneuert wird.
 *  3. Der getippte Text ist noch derselbe, nach dem das Blatt gezeichnet wurde.
 *     Aendert er sich, muss das Blatt neu gezeichnet werden.
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildDemoScenario } from '../../src/lib/demo/demoScenario';
import { HANDSCHRIFT_SEITEN } from '../../src/lib/demo/handschrift-seiten';

const ORDNER = join(__dirname, '..', '..', 'public', 'demo', 'handschrift');
const sha256 = (inhalt: string | Buffer) => createHash('sha256').update(inhalt).digest('hex');

describe('Handschrift-Demo', () => {
    const getippt = buildDemoScenario().studentBatchFiles;

    it('hat fuer jede getippte Arbeit genau ein Blatt', () => {
        expect(HANDSCHRIFT_SEITEN.map(s => s.originalName)).toEqual(getippt.map(a => a.originalName));
        expect(HANDSCHRIFT_SEITEN.map(s => s.name)).toEqual(getippt.map(a => a.name));
    });

    it.each(HANDSCHRIFT_SEITEN.map(s => [s.name, s] as const))('%s: Bild ist das gepruefte', (_name, seite) => {
        const pfad = join(ORDNER, seite.datei);
        expect(existsSync(pfad)).toBe(true);
        const ist = sha256(readFileSync(pfad));
        if (ist !== seite.bildSha256) {
            throw new Error(`${seite.datei} hat sich geaendert (${ist}). Erst die Bilderkennung darauf laufen lassen, `
                + 'Abweichungen in handschrift-seiten.ts eintragen, dann bildSha256 erneuern.');
        }
    });

    it.each(HANDSCHRIFT_SEITEN.map(s => [s.name, s] as const))('%s: zum aktuellen Demo-Text gezeichnet', (_name, seite) => {
        const ist = sha256(getippt.find(a => a.originalName === seite.originalName)?.fileText ?? '');
        if (ist !== seite.textSha256) {
            throw new Error(`Der Demo-Text von ${seite.name} hat sich geaendert (${ist}). Das Blatt ${seite.datei} `
                + 'zeigt noch den alten Text — neu zeichnen lassen, dann textSha256 und bildSha256 erneuern.');
        }
    });
});
