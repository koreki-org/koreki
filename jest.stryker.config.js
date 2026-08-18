/**
 * Jest-Konfiguration NUR für die Mutationstests.
 * 🧬
 *
 * Sie steht hier und nicht in `jest.config.js`, damit der normale Lauf
 * unverändert bleibt: `npm test` soll nicht davon abhängen, dass ein
 * Mutations-Werkzeug installiert ist.
 *
 * KEINE eigene Testumgebung: Stryker böte eine an, die ihm meldet, welcher Test
 * welche Zeile berührt. Fünf Testdateien legen ihre Umgebung aber selbst im
 * Dateikopf fest (`@jest-environment node`) und überstimmen sie damit. Die
 * Werkzeugkette darf die Tests nicht zwingen, sich nach ihr zu richten —
 * deshalb ordnet Stryker über `coverageAnalysis: "all"` zu und grenzt die Läufe
 * über `enableFindRelatedTests` ein.
 */

// `next/jest` liefert eine FUNKTION, kein Versprechen — sie muss aufgerufen
// werden. Wird sie nur `await`et, kommt die Funktion selbst zurück, das
// Verteilen unten ergibt eine leere Konfiguration, und Jest fällt auf Babel
// zurück. Das sieht dann aus, als könne der Sandkasten kein TypeScript.
const erzeugeBasis = require('./jest.config');

module.exports = async () => {
    const base = await erzeugeBasis();

    return {
        ...base,
        // Die Abdeckungs-Schwellen gelten für den normalen Lauf. Hier laufen je
        // Mutant nur die zugehörigen Tests — eine Schwelle wäre dabei sinnlos
        // und liesse jeden Lauf scheitern.
        coverageThreshold: undefined,
        collectCoverage: false,
        testPathIgnorePatterns: [
            ...(base.testPathIgnorePatterns || []),
            // Der Live-LLM-Determinismustest wird ohne `KOREKI_REAL_FETCH`
            // übersprungen und liefert damit gar keine Ergebnisse — Stryker
            // hält das für eine kaputte Umgebung. An Mutationstests könnte er
            // ohnehin nicht teilnehmen: er fragt ein echtes Modell.
            'CalcDeterminism',
            // Die WÄCHTER lesen den Quelltext von der Platte, statt ihn
            // auszuführen. Stryker instrumentiert die Dateien und macht sie
            // dabei je eine Zeile länger — der Größen-Wächter meldet dann das
            // halbe Projekt. Töten könnten sie ohnehin keinen Mutanten: sie
            // prüfen Struktur, nicht Verhalten.
            'governance.test',
            'profile-family-symmetry',
            'security-audit.test',
            'StructuralIntegrity'
        ]
    };
};
