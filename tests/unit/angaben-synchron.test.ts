/**
 * Wächter: Was der Code annimmt, steht genauso in Betriebsanleitung und Handbuch.
 *
 * ANLASS (12.11.2026). Koreki nahm seit diesem Tag Markdown-Dateien (.md) an.
 * Die ausgelieferte Betriebsanleitung v1.7 nannte in §8 trotzdem nur „PDF, JPG,
 * PNG, TXT, XLSX und CSV“, das Handbuch nur „Text (.txt)“. Keine der drei
 * Stellen wusste von den anderen. Aufgefallen ist es nur durch Zufall.
 *
 * Für Fließtext gibt es keinen sinnvollen Test. Dort hilft nur der Prüfschritt
 * vor jedem Release (Skill `release`). Für Werte, die im Code als Konstante
 * stehen, schon:
 *   - jede Dateiart aus `src/lib/upload-dateiarten.ts` steht in §8 der
 *     NEUESTEN Fassung der Betriebsanleitung und im Handbuch-Kapitel zum Ablauf,
 *   - die Größengrenze der Bilderkennung auf dem Server
 *     (`src/pages/api/extract-image.ts`) steht in §8 der neuesten Fassung.
 *
 * Fällt der Test, weil sich der Code geändert hat: zuerst eine neue Fassung der
 * Betriebsanleitung mit Andreas' Freigabe (Skill `eu-ai-act`), dann das
 * Handbuch. Alte Fassungen bleiben unverändert und werden nicht geprüft.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { MUSTERLOESUNG_ENDUNGEN, SCHUELERARBEIT_ENDUNGEN } from '@/lib/upload-dateiarten';

const ROOT = process.cwd();

/** Endungen, die Lehrkräfte als Format wählen. `.jpeg` ist dasselbe wie `.jpg`, `.koreki` eine gespeicherte Sitzung. */
const KEIN_EIGENES_FORMAT = new Set(['.jpeg', '.koreki']);

function formate(): string[] {
    const alle = `${MUSTERLOESUNG_ENDUNGEN},${SCHUELERARBEIT_ENDUNGEN}`.split(',');
    return Array.from(new Set(alle))
        .filter(e => !KEIN_EIGENES_FORMAT.has(e))
        .map(e => e.replace('.', '').toUpperCase());
}

function neuesteBetriebsanleitung(): { datei: string; text: string } {
    const dir = join(ROOT, 'src', 'legal');
    const fassungen = readdirSync(dir)
        .map(name => ({ name, m: /^betriebsanleitung_v(\d+)\.(\d+)\.md$/.exec(name) }))
        .filter((f): f is { name: string; m: RegExpExecArray } => f.m !== null)
        .sort((a, b) => Number(b.m[1]) - Number(a.m[1]) || Number(b.m[2]) - Number(a.m[2]));
    const neueste = fassungen[0].name;
    return { datei: neueste, text: readFileSync(join(dir, neueste), 'utf-8') };
}

/** Die Zeile „**Dateien:** …“ aus §8 — dort stehen Formate und Grenzen. */
function dateienZeile(text: string): string {
    const zeile = text.split(/\r?\n/).find(z => z.includes('**Dateien:**'));
    if (!zeile) throw new Error('Keine Zeile „**Dateien:**“ in der Betriebsanleitung gefunden');
    return zeile;
}

const enthaeltWort = (text: string, wort: string) => new RegExp(`\\b${wort}\\b`).test(text);

describe('Angaben aus dem Code stehen in Betriebsanleitung und Handbuch', () => {
    const { datei, text } = neuesteBetriebsanleitung();
    const zeile = dateienZeile(text);
    const handbuch = readFileSync(join(ROOT, 'handbuch', 'korrigieren', 'ablauf.md'), 'utf-8');

    it.each(formate())(`Format %s steht in ${datei} §8`, format => {
        expect(enthaeltWort(zeile, format)).toBe(true);
    });

    it.each(formate())('Format %s steht im Handbuch (korrigieren/ablauf.md)', format => {
        expect(enthaeltWort(handbuch, format)).toBe(true);
    });

    it(`Größengrenze der Bilderkennung steht in ${datei} §8`, () => {
        const route = readFileSync(join(ROOT, 'src', 'pages', 'api', 'extract-image.ts'), 'utf-8');
        const treffer = /sizeLimit:\s*'(\d+)mb'/i.exec(route);
        expect(treffer).not.toBeNull();
        expect(zeile).toContain(`${treffer![1]} MB`);
    });
});
