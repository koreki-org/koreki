import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * Ratsche für das Zod-Validation-Gate
 * 🧯🛡️
 *
 * `architectural-vision` §8 sagt wörtlich: "Jede API-Route MUSS ihren Input
 * via Zod-Schema validieren. Unvalidierter `req.body`-Zugriff ist verboten."
 *
 * Diese Regel hatte bis zum 19.08.2026 keinen Wächter — und ist entsprechend
 * gedriftet: zehn Routen lasen `req.body` ohne Schema. Nicht, weil jemand die
 * Regel abgelehnt hätte, sondern weil nichts sie gemessen hat. Genau die
 * Erfahrung, die im Kopf der Compliance-Checkliste steht: jede geprüfte Regel
 * wird zu 100 % eingehalten, jede ungeprüfte driftet.
 *
 * Fünf der zehn gehören zusammen — `update-mode` und die vier
 * `update-*-profile`-Routen. Wieder die Profil-Familien, wieder dieselbe Regel,
 * die überall gleichzeitig fehlt (vgl. profile-family-symmetry.test.ts).
 *
 * RATSCHEN-PRINZIP:
 * - Neue Routen, die `req.body` lesen, brauchen ein Zod-Schema.
 * - Die Altfälle sind eingefroren und dürfen nur schrumpfen.
 * - Wer eine repariert, nimmt sie aus der Liste.
 *
 * Warum das mehr ist als Formalie: Ohne Schema entscheidet der Client über
 * Typ und Wertebereich. `billing/pure-deduct.ts` etwa rechnet mit einem
 * `pageCount` aus dem Anfrage-Rumpf. Dass daraus kein Schaden entsteht, liegt
 * allein an einer Prüfung weiter unten (`if (creditCost > 0)`) — nicht an
 * dieser Route. Auf so etwas soll man sich nicht verlassen müssen.
 */

const API_DIR = join(process.cwd(), 'src', 'pages', 'api');

/**
 * Altlasten, eingefroren am 19.08.2026. NUR ENTFERNEN, NIE ERGAENZEN.
 */
const OHNE_SCHEMA_BASELINE: string[] = [
    'admin/global-ai-settings.ts',
    'billing/pure-deduct.ts',
    'org-admin.ts',
    'user/consent-avv.ts',
    'user/update-ai-profile.ts',
    'user/update-grading-memory-profile.ts',
    'user/update-mode.ts',
    'user/update-profile.ts',
    'user/update-skill-profile.ts'
];

/**
 * Begründete Ausnahmen. §8 nennt selbst genau eine Sorte: Stripe-Webhooks
 * prüfen ihre Signatur und müssen den ROHEN Rumpf sehen, damit die Prüfung
 * überhaupt aufgeht.
 *
 * Ein Eintrag ohne fachliche Begründung ist ein Bug, kein Ausnahmefall.
 */
const BEGRUENDETE_AUSNAHMEN: Record<string, string> = {
    'stripe/webhook.ts':
        'Signaturpruefung braucht den rohen Rumpf; ein Schema davor wuerde sie unmoeglich machen (§8).'
};

const ohneKommentare = (quelltext: string): string =>
    quelltext
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');

const liestRumpf = (quelltext: string): boolean => /\breq\.body\b/.test(quelltext);

const hatSchema = (quelltext: string): boolean =>
    /from ['"]zod['"]/.test(quelltext)
    || /safeParse\s*\(/.test(quelltext)
    || /\.parse\s*\(\s*req\.body/.test(quelltext);

const routenUnter = (dir: string): string[] => {
    let treffer: string[] = [];
    readdirSync(dir).forEach(eintrag => {
        const pfad = join(dir, eintrag);
        treffer = lstatSync(pfad).isDirectory()
            ? treffer.concat(routenUnter(pfad))
            : treffer.concat(pfad);
    });
    return treffer.filter(f => f.endsWith('.ts'));
};

const relativ = (pfad: string) => relative(API_DIR, pfad).split(sep).join('/');

describe('Zod-Validation-Gate (architectural-vision §8)', () => {
    const routen = routenUnter(API_DIR).map(datei => ({
        pfad: relativ(datei),
        quelltext: ohneKommentare(readFileSync(datei, 'utf8'))
    }));

    /** Schuetzt davor, dass der Test bei einem Pfadfehler stillschweigend leer laeuft. */
    it('findet ueberhaupt API-Routen', () => {
        expect(routen.length).toBeGreaterThan(20);
    });

    it('laesst keine NEUE Route ohne Schema auf req.body zugreifen', () => {
        const verstoesse = routen
            .filter(r => liestRumpf(r.quelltext) && !hatSchema(r.quelltext))
            .map(r => r.pfad)
            .filter(p => !OHNE_SCHEMA_BASELINE.includes(p))
            .filter(p => !BEGRUENDETE_AUSNAHMEN[p]);

        if (verstoesse.length > 0) {
            throw new Error(
                'ZOD-GATE: Route liest req.body ohne Schema (architectural-vision §8).\n'
                + 'Schema in src/lib/validation.ts anlegen und direkt nach dem Einlesen anwenden.\n  - '
                + verstoesse.join('\n  - ')
            );
        }
    });

    /** Haelt die Ratsche am Ziehen — sonst waere eine reparierte Route wieder frei. */
    it('verlangt, dass reparierte Routen die Baseline verlassen', () => {
        const veraltet = OHNE_SCHEMA_BASELINE.filter(pfad => {
            const route = routen.find(r => r.pfad === pfad);
            if (!route) return true;                       // Datei existiert nicht mehr
            return !liestRumpf(route.quelltext) || hatSchema(route.quelltext);
        });

        if (veraltet.length > 0) {
            throw new Error(
                'ZOD-BASELINE VERALTET — diese Eintraege aus OHNE_SCHEMA_BASELINE entfernen: 🎉\n  - '
                + veraltet.join('\n  - ')
            );
        }
    });

    it('begruendet jede Ausnahme fachlich', () => {
        Object.entries(BEGRUENDETE_AUSNAHMEN).forEach(([pfad, grund]) => {
            expect(routen.some(r => r.pfad === pfad)).toBe(true);
            expect(grund.length).toBeGreaterThan(30);
        });
    });
});
