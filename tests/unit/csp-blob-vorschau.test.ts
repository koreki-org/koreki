/**
 * Waechter: Hochgeladene Fotos brauchen `blob:` in der CSP-Regel `img-src`.
 *
 * Die Vorschau eines Fotos vor der Bilderkennung ist eine `blob:`-Adresse
 * (`getPreviewUrl` in `src/hooks/useBatchStatus.ts`). Bis zum 18.11.2026 fehlte
 * `blob:` in `img-src` — die Vorschau blieb bei JEDEM Foto-Upload leer, bis die
 * Bilderkennung eigene Vorschaubilder lieferte. Niemand bemerkte es, weil PDFs
 * ihre Vorschau als `data:` erzeugen.
 *
 * Die Regel steht an drei Stellen, die zusammen gelten muessen: `next.config.js`
 * (Kopfzeilen), `src/middleware.ts` (ueberschreibt sie zur Laufzeit) und
 * `src-tauri/tauri.conf.json` (Desktop).
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const STELLEN = ['next.config.js', 'src/middleware.ts', 'src-tauri/tauri.conf.json'];

describe('CSP erlaubt die Vorschau hochgeladener Fotos', () => {
    it.each(STELLEN)('%s: img-src enthaelt blob:', (datei) => {
        const inhalt = readFileSync(join(ROOT, datei), 'utf-8');
        const regeln = (inhalt.match(/img-src[^;]*;/g) ?? []).map(regel => regel.slice('img-src'.length, -1));
        expect(regeln.length).toBeGreaterThan(0);
        for (const regel of regeln) expect(regel.split(/\s+/)).toContain('blob:');
    });
});
