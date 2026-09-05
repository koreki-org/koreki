/**
 * Waechter: Die Anbieter-Panels behandeln den Einzelbenutzer-Betrieb gleich. 🔀
 *
 * ANLASS (05.09.2026). Mistral und OpenAI-kompatibel blendeten ihre Eingabefelder in
 * JEDER Community-Instanz aus, mit dem Hinweis, das Institut konfiguriere zentral. Im
 * Einzelbenutzer-Betrieb gibt es niemanden sonst — dort war die eigene Konfiguration
 * unerreichbar. Ollama war nie betroffen und zeigte seine Felder weiter; deshalb fiel
 * es lange nicht auf.
 *
 * DIE REGEL. Was fuer einen Anbieter gilt, gilt fuer den anderen. Die wiederkehrende
 * Fehlerklasse dieses Projekts ist nicht die falsche Regel, sondern die Regel, die in
 * einer Familie gilt und in der Schwester fehlt — dieselbe Begruendung wie in
 * `profile-family-symmetry.test.ts`.
 *
 * Geprueft wird die Bedingung im Quelltext, nicht ihre Wirkung: Beide Dateien tragen
 * dieselbe Weiche, und keine faellt beim naechsten Umbau still zurueck.
 */
import fs from 'fs';
import path from 'path';

const PANELS = [
    'src/components/settings/MistralConfig.tsx',
    'src/components/settings/OpenAICompatibleConfig.tsx'
];

const lies = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf-8');

describe.each(PANELS)('%s', datei => {
    const inhalt = lies(datei);

    it('leitet den Einzelbenutzer-Betrieb aus der gemeinsamen Quelle ab', () => {
        expect(inhalt).toContain("import { anbieterPanelModus } from './anbieter-panel-modus'");
        expect(inhalt).toContain('istEigenverwaltet } = anbieterPanelModus(appMode)');
        // Keine eigene Herleitung daneben: sonst haette die Kopie wieder einen Ort.
        expect(inhalt).not.toMatch(/const mode = getKorekiMode\(\)/);
    });

    it('verbirgt den zentral-verwaltet-Kasten im Einzelbenutzer-Betrieb', () => {
        expect(inhalt).toContain('(isCommunity && !istEigenverwaltet)');
    });

    it('zeigt die eigene Konfiguration im Einzelbenutzer-Betrieb', () => {
        expect(inhalt).toMatch(/isDesktop \|\| istEigenverwaltet \|\|/);
    });

    /**
     * Der CORS-Hinweis und der Satz ueber die "direkte Browser-Verbindung" gelten fuer
     * den Pure-Modus, wo der Browser selbst beim Anbieter anfragt. Auf einer selbst
     * betriebenen Instanz laeuft die Anfrage ueber den eigenen Server — dort waeren
     * beide Saetze schlicht falsch, und der Verweis auf koreki.org irrefuehrend.
     */
    it('erklaert den eigenen Betrieb nicht mit dem Pure-Modus', () => {
        expect(inhalt).toContain('!isDesktop && !istEigenverwaltet');
    });
});
