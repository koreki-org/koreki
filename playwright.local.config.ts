import { defineConfig } from '@playwright/test';

/**
 * Layer 2 gegen den EIGENEN Rechner — nicht Layer 3.
 * 🏠
 *
 * DIE EINORDNUNG STIMMTE ZUERST NICHT, und die Korrektur gehoert hierher:
 * Diese Konfiguration hiess anfangs "Layer 3". Sie ist es nicht. Der
 * `playwright-pro`-Skill (§3) verlangt fuer Layer 3 die Nutzerreise durch die
 * OBERFLAECHE — Login, Upload, Korrektur, Pruefung der Punkte, Export mit
 * Dateiintegritaet. Davon steht hier nichts; die Tests sprechen HTTP.
 *
 * Was sie tun, ist woertlich die Layer-2-Beschreibung aus `industrial-testing`:
 * "Validierung des Zusammenspiels mehrerer Module und Services". Playwright ist
 * hier nur das Startprogramm, weil es Dienste hochfahren und HTTP sprechen kann
 * — nicht, weil ein Browser beteiligt waere.
 *
 * WARUM ES EINE ZWEITE KONFIGURATION GIBT
 * ---------------------------------------
 * `playwright.config.ts` zeigt auf `https://koreki.org` — die Produktion. Das
 * war die Wurzel aller Probleme des alten Golden-Thread-Tests: Er löschte dort
 * Daten, verbrauchte Credits, konnte ungetaggte Änderungen gar nicht prüfen und
 * war von fremdem Zustand abhängig.
 *
 * Diese Konfiguration prüft stattdessen den lokalen Stand — deterministisch,
 * kostenlos und mit einem KI-Anbieter, dessen Antworten der Test selbst
 * vorgibt. Erst dadurch werden die Fälle prüfbar, an denen sich Koreki
 * nachweislich verrechnet hat: `points: "drei"`, abgeschnittenes JSON, ein
 * Zoll-Zeichen im Feedback.
 *
 * WAS HIER NICHT HINEINFÄLLT
 * --------------------------
 * Der lokale Stand läuft ohne Datenbank (`NEXT_PUBLIC_AUTH_TYPE=NONE`,
 * `KOREKI_MODE=community`). Abrechnung, AVV-Riegel und Workspace-Auflösung
 * greifen dort nicht — sie sind mit gemockter Datenbank unit-getestet. Diese
 * Konfiguration ergänzt das, sie ersetzt es nicht.
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
            reuseExistingServer: true,
            timeout: 180000
        }
    ]
});
