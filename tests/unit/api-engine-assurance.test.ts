import { readFileSync } from 'fs';
import { join } from 'path';
import { validateCalcTraceDeterminism } from '../../src/lib/grading/calc-trace-generator';
import { validateGraphDeterminism } from '../../src/lib/grading/graph-generator';

/**
 * Was eine erzeugte Engine über sich selbst behauptet (Layer 1)
 * 🛡️🔍
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. `generate-calc-trace.ts` hängte an jede
 * erzeugte Rechenkette `dryRunChecked: true` — darüber der Kommentar
 * "Add dummy validation metadata". Genau das war es: eine behauptete
 * Verifikation, die nie stattgefunden hat.
 *
 * Der Unterschied ist der Kern der Architektur, nicht eine Feinheit:
 *
 *   Graph:       validateGraphDeterminism rechnet ihn tatsächlich durch.
 *                DESHALB ist ein erzeugter Graph verlässlich.
 *   Rechenkette: Es gibt kein solches Verfahren.
 *                validateCalcTraceDeterminism ist ein Platzhalter, der
 *                bedingungslos zustimmt. Geprüft wird allein die STRUKTUR.
 *
 * Kein akuter Schaden — zurzeit liest niemand `targetGoal.validation`, der
 * Kommentar "for frontend UI consumption" ging ins Leere. Der Punkt ist, dass
 * die Zusicherung in den Daten steht: Ein Export oder eine neue Ansicht
 * bekäme eine Falschaussage geliefert.
 *
 * Der Test liest Quelltext statt die Route auszuführen. Das ist hier das
 * schärfere Werkzeug: Die Behauptung ist eine Konstante, kein Verhalten — und
 * genau als Konstante war sie falsch.
 */

const API_DIR = join(process.cwd(), 'src', 'pages', 'api');

/**
 * Kommentare vor dem Pruefen entfernen.
 *
 * Sonst zaehlt jede Erwaehnung von `dryRunChecked: true` in einer Begruendung
 * als Verstoss — auch die, die den Befund BESCHREIBT. Genau darueber ist die
 * erste Fassung dieses Tests gestolpert.
 */
const ohneKommentare = (quelltext: string): string =>
    quelltext
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');

const lies = (datei: string) => ohneKommentare(readFileSync(join(API_DIR, datei), 'utf8'));

describe('Der Platzhalter gibt sich als solcher zu erkennen', () => {
    /**
     * Falls jemand hier echte Prüflogik einbaut, muss dieser Test auffallen —
     * dann darf (und soll) `generate-calc-trace` seine Zusicherung ändern.
     */
    it('validateCalcTraceDeterminism stimmt weiterhin bedingungslos zu', () => {
        expect(validateCalcTraceDeterminism(undefined)).toEqual({ isValid: true, error: '' });
        expect(validateCalcTraceDeterminism({ unsinn: true })).toEqual({ isValid: true, error: '' });
        expect(validateCalcTraceDeterminism({ targetValue: 'keine Zahl' })).toEqual({ isValid: true, error: '' });
    });

    /** Zum Vergleich: Die Graph-Prüfung urteilt tatsächlich. */
    it('validateGraphDeterminism urteilt dagegen wirklich', () => {
        const kaputt = validateGraphDeterminism({
            variables: [{ id: 'a', type: 'formula', formula: 'gibtesnicht(1)' }]
        } as never);

        expect(kaputt.isValid).toBe(false);
        expect(kaputt.error).toBeTruthy();
    });
});

describe('Die erzeugte Rechenkette behauptet keinen Trockenlauf', () => {
    /** DER BEFUND. */
    it('setzt dryRunChecked NICHT auf true', () => {
        const quelltext = lies('generate-calc-trace.ts');

        expect(quelltext).toContain('dryRunChecked: false');
        expect(quelltext).not.toMatch(/dryRunChecked:\s*true/);
    });

    /**
     * Die Plakette "Plausibilität verifiziert!" hängt in beiden Ansichten an
     * `{validation?.dryRunChecked && ...}`. Mit `false` bleibt sie aus — das
     * vorhandene Muster tut damit von selbst das Richtige.
     */
    it('haelt die UI-Plakette an dryRunChecked fest', () => {
        const ansichten = [
            'src/components/batch/parts/GraphAiPanel.tsx',
            'src/components/batch/parts/GraphEditorPanel.tsx'
        ];

        ansichten.forEach(datei => {
            const quelltext = readFileSync(join(process.cwd(), datei), 'utf8');
            expect(quelltext).toMatch(/validation\?\.dryRunChecked\s*&&/);
        });
    });
});

describe('Der Graph behauptet seinen Trockenlauf zu Recht', () => {
    it('leitet isValid aus validateGraphDeterminism ab, statt sie zu setzen', () => {
        const quelltext = lies('generate-graph.ts');

        expect(quelltext).toContain('validateGraphDeterminism');
        expect(quelltext).toMatch(/isValid:\s*graphValidation\.isValid/);
        // Keine fest verdrahtete Zusicherung.
        expect(quelltext).not.toMatch(/isValid:\s*true/);
    });
});
