/**
 * Waechter der Handschrift-Demo (18.11.2026).
 *
 * Die Blaetter unter `public/demo/handschrift/` sind Bilder — ob ihr Text noch
 * zur getippten Demo passt, sieht man ihnen nicht an. Die Bewertung der Demo ist
 * aber durchgemessen und haengt am Wortlaut (Schueler #2 liest bewusst 1000
 * statt 1200 ab). Geprueft wird deshalb zweierlei:
 *
 *  1. Die Vorlage meint woertlich denselben Text wie die getippte Demo.
 *  2. Die Bilder wurden nach der letzten Aenderung der Vorlage neu erzeugt
 *     (`npm run demo:handschrift` schreibt dafuer `stand.json`).
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { buildDemoScenario } from '../../src/lib/demo/demoScenario';
import { HANDSCHRIFT_SEITEN, alsDemoText, vorlageSchluessel } from '../../src/lib/demo/handschrift-seiten';

const ORDNER = join(__dirname, '..', '..', 'public', 'demo', 'handschrift');
const NEU_ERZEUGEN = 'Vorlage geaendert, Bilder nicht — `npm run demo:handschrift` laufen lassen und die Bilder mitcommitten.';

describe('Handschrift-Demo', () => {
    const getippt = buildDemoScenario().studentBatchFiles;

    it('hat fuer jede getippte Arbeit genau ein Blatt', () => {
        expect(HANDSCHRIFT_SEITEN.map(s => s.originalName)).toEqual(getippt.map(a => a.originalName));
    });

    it.each(HANDSCHRIFT_SEITEN.map(s => [s.name, s] as const))('%s meint woertlich den Text der getippten Demo', (_name, seite) => {
        const arbeit = getippt.find(a => a.originalName === seite.originalName);
        expect(arbeit?.name).toBe(seite.name);
        expect(alsDemoText(seite.text)).toBe(arbeit?.fileText);
    });

    it('Bilder sind zur Vorlage erzeugt', () => {
        const pfad = join(ORDNER, 'stand.json');
        expect(existsSync(pfad)).toBe(true);
        const stand: Record<string, string> = JSON.parse(readFileSync(pfad, 'utf-8'));
        for (const seite of HANDSCHRIFT_SEITEN) {
            expect(existsSync(join(ORDNER, seite.datei))).toBe(true);
            const soll = createHash('sha256').update(vorlageSchluessel(seite)).digest('hex');
            if (stand[seite.datei] !== soll) throw new Error(`${seite.datei}: ${NEU_ERZEUGEN}`);
        }
    });

    it('Durchgestrichenes faellt weg, Eingefuegtes zaehlt', () => {
        expect(alsDemoText('# Aufgabe 1\nDer ~~Nachteil~~ Vorteil ist {^direkt} da')).toBe('=== TASK: Aufgabe 1 ===\nDer Vorteil ist direkt da');
    });
});
