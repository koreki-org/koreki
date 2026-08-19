import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Playwright gegen den EIGENEN Rechner.
 * 🏠
 *
 * Es gibt bewusst nur DIESE eine Konfiguration, und sie zeigt auf
 * `localhost`. Bis zum 19.08.2026 stand hier `https://koreki.org` — die
 * Produktion. Das war die Wurzel aller Probleme des alten
 * Golden-Thread-Tests: Er loeschte dort Daten, verbrauchte Credits, konnte
 * ungetaggte Aenderungen gar nicht pruefen und war von fremdem Zustand
 * abhaengig. Dazu meldete sich ein `auth.setup`-Projekt bei JEDEM Lauf mit
 * echten Zugangsdaten in der Produktion an.
 *
 * Dass `npm run test:e2e` jetzt von sich aus harmlos ist, statt seine
 * Harmlosigkeit an einem Zusatzargument haengen zu lassen, ist der Punkt: Die
 * sichere Variante muss die bequeme sein.
 *
 * WAS HIER NICHT HINEINFAELLT
 * ---------------------------
 * Der lokale Stand laeuft ohne Datenbank (`NEXT_PUBLIC_AUTH_TYPE=NONE`,
 * `KOREKI_MODE=community`). Abrechnung, AVV-Riegel und Workspace-Aufloesung
 * greifen dort nicht — sie sind mit gemockter Datenbank unit-getestet. Diese
 * Konfiguration ergaenzt das, sie ersetzt es nicht.
 *
 * Einen Rauchtest gegen die ausgelieferte Instanz gibt es derzeit NICHT.
 */
export default defineConfig({
    testDir: './tests/e2e/local',
    timeout: 120000,
    expect: { timeout: 20000 },
    fullyParallel: false,
    workers: 1,
    reporter: [['list']],
    outputDir: './tests/reports/results-local',

    use: {
        baseURL: 'http://localhost:3000',
        // Kein `force: true` und keine festen Wartezeiten — beides hat den
        // alten Test wertlos gemacht: Er war gruen, waehrend Schritte
        // uebersprungen oder auf verdeckte Elemente geklickt wurde.
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },

    /**
     * Beide Dienste startet Playwright selbst. `reuseExistingServer` lässt einen
     * bereits laufenden Dev-Server stehen — sonst wartet man bei jedem Lauf auf
     * den Next-Start.
     */
    webServer: [
        {
            command: 'node tests/e2e/stub-provider.mjs',
            url: 'http://localhost:4010/__aufrufe',
            reuseExistingServer: true,
            timeout: 20000
        },
        {
            command: 'npm run dev',
            url: 'http://localhost:3000/app',
            // BEWUSST NICHT wiederverwendet: Ein bereits laufender Dev-Server
            // kennt die Umgebung unten nicht — er spraeche dann mit dem echten
            // Anbieter statt mit dem Stub, und der Test liefe an dem vorbei,
            // was er pruefen will. Genau darueber bin ich beim Bauen
            // gestolpert: null Stub-Aufrufe, trotzdem eine Note auf dem
            // Bildschirm.
            reuseExistingServer: false,
            timeout: 180000,
            env: {
                ...process.env,
                // EIGENES Datenverzeichnis fuer den Test.
                //
                // Der lokale Stand legt Profile, Skills und die globalen
                // KI-Einstellungen unter `%APPDATA%/koreki` ab. Ohne diese
                // Umlenkung liefe der Test auf den ECHTEN Daten der Lehrkraft —
                // er laese ihre Profile und koennte sie veraendern.
                //
                // Zweiter, ebenso wichtiger Grund: Eine gespeicherte
                // Einstellungsdatei gewinnt gegen die Umgebungsvorgaben
                // darunter (`GlobalSettingsService.getSettings` liest sie
                // zuerst). Mit dem echten Verzeichnis blieb der Anbieter
                // deshalb auf Mistral stehen — der Test rief das ECHTE Modell
                // und verbrauchte Guthaben, ohne dass es auffiel. Genau das
                // sollte diese Konfiguration verhindern.
                APPDATA: path.resolve(__dirname, 'tests', 'reports', 'appdata-local'),
                // Die globalen Einstellungen des Servers gewinnen gegen alles,
                // was der Browser mitbringt (`hydrateAiSettings` bevorzugt
                // sie). Der Anbieter muss deshalb HIER umgestellt werden.
                DEFAULT_AI_PROVIDER: 'openai-compatible',
                OPENAI_API_BASE: 'http://localhost:4010/v1',
                OPENAI_API_KEY: 'stub',
                OPENAI_API_MODEL: 'stub-modell'
            }
        }
    ]
});
