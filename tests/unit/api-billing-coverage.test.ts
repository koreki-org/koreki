import fs from 'fs';
import path from 'path';

/**
 * Billing-Abdeckung aller KI-Endpunkte (Layer 1, Struktur-Contract)
 *
 * Hintergrund: `refine-graph` und `generate-calc-trace` haben ueber mehrere Releases hinweg echte
 * LLM-Requests ausgefuehrt, ohne Credits abzurechnen — der Billing-Hook wurde beim Anlegen der
 * Routen schlicht vergessen. Eine dritte Route (`calc-trace-extraction`) hatte dieselbe Luecke und
 * wurde ersatzlos entfernt, weil sie keinen Aufrufer hatte: Waehrend der Korrektur laeuft die
 * Extraktion inline in `api/ai-correct.ts` und ist dort im Credit der Korrektur enthalten.
 *
 * Einzelne Endpunkt-Tests haetten das nicht verhindert, weil ein neuer, ungetesteter Endpunkt
 * genau dieselbe Luecke wieder aufreisst.
 *
 * Dieser Test prueft daher generisch: Jede API-Route, die einen KI-Provider aufruft, MUSS auch
 * eine Abrechnung ausloesen. Neue Endpunkte sind damit automatisch erfasst.
 */

const API_DIR = path.join(__dirname, '..', '..', 'src', 'pages', 'api');

/** Marker, an denen ein serverseitiger KI-Aufruf erkennbar ist. */
const AI_CALL_MARKERS = [
    'executeMistralRequest',
    'executeOpenAIRequest',
    'executeOllamaRequest',
    'extractStudentAST',
    'api.mistral.ai'
];

/** Marker, an denen eine Abrechnung erkennbar ist. */
const BILLING_MARKERS = [
    'performBillingAction',
    'checkAndDeductCredits'
];

/**
 * Bewusst abrechnungsfreie KI-Routen. Jeder Eintrag braucht eine fachliche Begruendung —
 * ein Eintrag ohne Grund ist ein Bug, kein Ausnahmefall.
 */
const DOCUMENTED_EXEMPTIONS: Record<string, string> = {
    // Der einzige Eintrag (pure/proxy.ts) ist am 19.08.2026 entfallen: Die Route
    // hatte keinen Aufrufer. Sie war ein serverseitiger Umweg fuer BYOK — gebaut
    // in der Annahme, der Browser koenne die Mistral-API im PURE-Modus nicht
    // direkt erreichen. Er kann: `mistral-provider.ts` ruft api.mistral.ai
    // unmittelbar auf. Der eine Fall, in dem das wirklich nicht geht (die
    // Tauri-Desktop-Huelle), laeuft ueber `desktop-proxy.ts` per Rust-Befehl.
    //
    // Bleibt bewusst als leeres Verzeichnis stehen: Der naechste, der eine
    // abrechnungsfreie KI-Route braucht, findet hier die Regel dafuer —
    // ein Eintrag ohne fachliche Begruendung ist ein Bug, kein Ausnahmefall.
};

function collectApiRoutes(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return collectApiRoutes(full);
        return entry.isFile() && entry.name.endsWith('.ts') ? [full] : [];
    });
}

describe('Billing-Abdeckung aller KI-Endpunkte (Layer 1)', () => {
    const routes = collectApiRoutes(API_DIR).map(file => ({
        relPath: path.relative(API_DIR, file).replace(/\\/g, '/'),
        source: fs.readFileSync(file, 'utf-8')
    }));

    const aiRoutes = routes.filter(r => AI_CALL_MARKERS.some(m => r.source.includes(m)));

    it('findet ueberhaupt KI-Routen (schuetzt vor einem stillschweigend leeren Test)', () => {
        expect(aiRoutes.length).toBeGreaterThan(3);
    });

    it.each(aiRoutes.map(r => r.relPath))(
        '%s rechnet seinen KI-Aufruf ab oder ist dokumentiert befreit',
        relPath => {
            const route = aiRoutes.find(r => r.relPath === relPath)!;
            const isBilled = BILLING_MARKERS.some(m => route.source.includes(m));
            const exemption = DOCUMENTED_EXEMPTIONS[relPath];

            if (exemption) {
                // Eine befreite Route darf nicht zusaetzlich abrechnen — sonst ist die
                // Befreiung veraltet und der Nutzer zahlt doppelt.
                expect(isBilled).toBe(false);
                expect(exemption.length).toBeGreaterThan(20);
                return;
            }

            expect(isBilled).toBe(true);
        }
    );

    it('enthaelt keine veralteten Eintraege in der Ausnahmeliste', () => {
        const knownRoutes = new Set(routes.map(r => r.relPath));
        Object.keys(DOCUMENTED_EXEMPTIONS).forEach(exempt => {
            expect(knownRoutes.has(exempt)).toBe(true);
        });
    });
});
