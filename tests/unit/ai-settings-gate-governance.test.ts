import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Waechter: Anbieter-Aufruf nur mit Einstellungs-Gate
 * 🔐
 *
 * Im SaaS duerfen Anbieter-Endpunkt und -Schluessel ausschliesslich aus der
 * Server-Env stammen. Wuerde eine API-Route die vom Client geschickten
 * `settings` ungefiltert an einen Anbieter weiterreichen, koennte ein
 * angemeldeter Nutzer den Endpunkt umbiegen — und Schuelertexte liefen an einen
 * fremden Server, auf Kosten der Koreki-Instanz. Dafuer gibt es
 * `sanitizeClientAiSettings`, das lokale Instanzen unangetastet laesst.
 *
 * Beim Aufraeumen der Doppelungen habe ich geprueft: alle zehn Routen, die
 * einen Anbieter aufrufen, benutzen das Gate auch. Das war Glueck, kein
 * Mechanismus — eine neue Route haette es vergessen koennen und nichts haette
 * es gemeldet.
 *
 * Nach dem Muster der uebrigen Waechter in diesem Verzeichnis: eine Regel ohne
 * Test driftet, eine Regel mit Test haelt.
 */

const API_DIR = join(process.cwd(), 'src', 'pages', 'api');

/** Direkte Aufrufe eines KI-Anbieters. */
const PROVIDER_AUFRUFE = [
    'executeMistralRequest',
    'executeOpenAIRequest',
    'executeOllamaRequest'
];

const GATE = 'sanitizeClientAiSettings';

/**
 * Routen, die einen Anbieter aufrufen OHNE Client-Einstellungen entgegen-
 * zunehmen, duerften das Gate weglassen. Bisher gibt es keine — der Eintrag
 * bliebe leer und waere im Review zu begruenden.
 */
const AUSNAHMEN: string[] = [];

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

const toRelative = (filePath: string) => relative(API_DIR, filePath).split(sep).join('/');

describe('AI Settings Gate Governance', () => {
    const routen = getFilesRecursively(API_DIR).filter(f => f.endsWith('.ts'));

    it('laesst keine API-Route einen Anbieter ohne sanitizeClientAiSettings aufrufen', () => {
        const verstoesse: string[] = [];

        routen.forEach(filePath => {
            const relativePath = toRelative(filePath);
            if (AUSNAHMEN.includes(relativePath)) return;

            const inhalt = readFileSync(filePath, 'utf8');
            const ruftAnbieter = PROVIDER_AUFRUFE.some(fn => inhalt.includes(fn + '('));
            if (!ruftAnbieter) return;

            if (!inhalt.includes(GATE)) {
                verstoesse.push(
                    `${relativePath}: ruft einen KI-Anbieter, aber ohne ${GATE}. ` +
                    `Im SaaS koennte der Client damit Endpunkt und Schluessel bestimmen.`
                );
            }
        });

        if (verstoesse.length > 0) {
            throw new Error(`AI SETTINGS GATE:\n  - ${verstoesse.join('\n  - ')}`);
        }
    });

    /**
     * Haelt den Waechter ehrlich: findet er gar keine Route mehr, ist entweder
     * der Suchbegriff veraltet oder das Verzeichnis verschoben — und der Test
     * wuerde ab dann alles durchwinken.
     */
    it('findet ueberhaupt Routen, die einen Anbieter aufrufen', () => {
        const mitAnbieter = routen.filter(f => {
            const inhalt = readFileSync(f, 'utf8');
            return PROVIDER_AUFRUFE.some(fn => inhalt.includes(fn + '('));
        });

        expect(mitAnbieter.length).toBeGreaterThanOrEqual(8);
    });
});
