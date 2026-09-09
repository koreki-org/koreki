import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Waechter: Aufrufe eigener API-Routen nur ueber den apiClient
 * 🔐
 *
 * Nur `apiClient.fetch` haengt den `Authorization: Bearer`-Kopf an. Ein rohes
 * `fetch('/api/...')` geht ohne Token raus — in Community Multi-User antwortet
 * `withSecurity` darauf mit 401 "Nicht angemeldet.".
 *
 * GEFUNDEN AM 09.09.2026: Die Bilderkennung tat genau das
 * (`ocr-orchestrator.ts`). Aufgefallen ist es erst, als der Gateway nicht mehr
 * vorher abbrach — sein fehlendes `client_max_body_size` hatte jeden Bildupload
 * schon bei 1 MB mit einer 413-HTML-Seite beantwortet und den 401 damit
 * verdeckt. Ein Fehler hat den anderen versteckt.
 *
 * Betroffen waren acht Stellen, nicht eine. Sieben brauchen Authentifizierung
 * und sind umgestellt.
 */

const SRC_DIR = join(process.cwd(), 'src');

/**
 * Oeffentliche Endpunkte, die bewusst ohne Anmeldung erreichbar sind.
 * Ein Eintrag hier ist im Review zu begruenden.
 */
const AUSNAHMEN: Record<string, string> = {
    'pages/contact.tsx': 'Oeffentliches Kontaktformular — wird von nicht angemeldeten Besuchern genutzt.'
};

const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    readdirSync(dir).forEach(entry => {
        const filePath = join(dir, entry);
        results = lstatSync(filePath).isDirectory()
            ? results.concat(getFilesRecursively(filePath))
            : results.concat(filePath);
    });
    return results;
};

const toRelative = (filePath: string) => relative(SRC_DIR, filePath).split(sep).join('/');

/** Rohes fetch auf eine eigene Route — `apiClient.fetch(` davor zaehlt nicht. */
const ROHER_AUFRUF = /(?<!apiClient\.)\bfetch\(\s*[`'"]\/api\//;

describe('API Client Governance', () => {
    const dateien = getFilesRecursively(SRC_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

    it('ruft eigene API-Routen nur ueber den apiClient auf', () => {
        const verstoesse: string[] = [];

        dateien.forEach(filePath => {
            const relativePath = toRelative(filePath);

            // Die API-Routen selbst und der apiClient sind nicht gemeint.
            if (relativePath.startsWith('pages/api/')) return;
            if (relativePath === 'lib/api-client.ts') return;
            if (AUSNAHMEN[relativePath]) return;

            const inhalt = readFileSync(filePath, 'utf8');
            if (ROHER_AUFRUF.test(inhalt)) {
                verstoesse.push(
                    `${relativePath}: rohes fetch auf eine eigene API-Route. ` +
                    `Ohne apiClient fehlt der Authorization-Kopf — in Community Multi-User gibt das 401.`
                );
            }
        });

        if (verstoesse.length > 0) {
            throw new Error(`API CLIENT GATE:\n  - ${verstoesse.join('\n  - ')}`);
        }
    });

    /**
     * Haelt den Waechter ehrlich: Findet er gar keine Aufrufe mehr, ist der
     * Suchbegriff veraltet oder das Verzeichnis verschoben — und ab dann winkt
     * er alles durch.
     */
    it('findet ueberhaupt Aufrufe ueber den apiClient', () => {
        const mitApiClient = dateien.filter(f =>
            /apiClient\.(fetch|get|post)\(/.test(readFileSync(f, 'utf8'))
        );

        expect(mitApiClient.length).toBeGreaterThanOrEqual(10);
    });
});
