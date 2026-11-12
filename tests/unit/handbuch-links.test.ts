/**
 * Wächter: Jeder Verweis der App ins Handbuch landet auf einer Stelle, die es gibt.
 *
 * Die App springt aus Tooltips und dem Hilfe-Menü direkt in Abschnitte von
 * https://hilfe.koreki.org (`src/lib/handbuch.ts`). Das Handbuch liegt im selben
 * Repository unter `handbuch/` und wird unabhängig von der App geändert. Ein
 * umbenannter Abschnitt bricht den Link dann still: Der Browser öffnet die Seite
 * oben, statt an der richtigen Stelle — kein Fehler, keine Warnung.
 *
 * Deshalb zeigen die Verweise nur auf FESTE Sprungmarken (`## Text {#marke}`),
 * nie auf eine aus dem Überschriftentext erzeugte, und dieser Test prüft, dass
 * Seite und Marke existieren.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { HANDBUCH_STELLEN } from '@/lib/handbuch';

const HANDBUCH_DIR = join(process.cwd(), 'handbuch');

/** `/korrigieren/ablauf` → `handbuch/korrigieren/ablauf.md`, `/` → `handbuch/index.md`. */
function markdownDatei(pfad: string): string {
    const ohneSchraegstrich = pfad.replace(/^\//, '').replace(/\/$/, '');
    if (ohneSchraegstrich === '') return join(HANDBUCH_DIR, 'index.md');
    const direkt = join(HANDBUCH_DIR, `${ohneSchraegstrich}.md`);
    return existsSync(direkt) ? direkt : join(HANDBUCH_DIR, ohneSchraegstrich, 'index.md');
}

describe('Verweise ins Handbuch', () => {
    it.each(Object.entries(HANDBUCH_STELLEN))('%s → %s existiert', (_stelle, ziel) => {
        const [pfad, marke] = ziel.split('#');
        const datei = markdownDatei(pfad);
        expect(existsSync(datei)).toBe(true);

        if (marke) {
            const inhalt = readFileSync(datei, 'utf-8');
            const feste = new RegExp(`^#{1,6} .*\\{#${marke}\\}\\s*$`, 'm');
            expect(feste.test(inhalt)).toBe(true);
        }
    });
});
