import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Die Korrektur-Kette gegen einen steuerbaren KI-Anbieter (Layer 2)
 * ⛓️🎭
 *
 * EINORDNUNG: Layer 2, nicht Layer 3. Diese Datei trug zuerst die falsche
 * Nummer. Layer 3 waere die Nutzerreise durch die Oberflaeche (`playwright-pro`
 * §3: Login, Upload, Korrektur, Pruefung, Export); hier laeuft nichts davon.
 * Geprueft wird das Zusammenspiel der Module hinter der HTTP-Schnittstelle —
 * das ist Layer 2, auch wenn Playwright es startet.
 *
 * WAS DIESER TEST LEISTET, DEN UNIT-TESTS NICHT LEISTEN
 * -----------------------------------------------------
 * Die Durchsicht vom 18./19.08.2026 hat eine Reihe von Fehlern gefunden, die
 * alle dieselbe Form hatten: Das Modell schickt etwas Unerwartetes, und Koreki
 * verrechnet sich daran, ohne dass es jemand merkt. Jeder einzelne ist
 * inzwischen unit-getestet — aber nur in Isolation.
 *
 * Hier läuft die ganze Kette: Anfrage → Sandbox-Vorlauf → Anbieter → Deutung
 * der Antwort (`parseLlmJson`) → Abbildung auf die Aufgaben
 * (`correction-mapping`) → Gesamtprozentsatz. Ein Fehler in einem Glied fällt
 * hier auf, auch wenn jedes Glied für sich grün ist.
 *
 * Der Anbieter ist ein Stub, dessen Antworten der Test vorgibt. Genau das ging
 * gegen die Produktion nicht — dort konnte man dem System keine bestimmte
 * Antwort vorlegen.
 *
 * WARUM AUF HTTP-EBENE STATT DURCH DIE OBERFLÄCHE
 * -----------------------------------------------
 * Der geprüfte Weg ist der Server. Ihn durch Klicks anzusteuern würde den Test
 * von Beschriftungen und Ladezuständen abhängig machen — genau daran ist der
 * alte Golden Thread zerbrochen.
 *
 * Das heißt aber auch: Diese Datei ERSETZT den Golden Thread nicht, sie
 * ergänzt ihn. Was hier fehlt und nur Layer 3 leisten kann:
 *
 *   - dass der Upload in der Oberfläche überhaupt ankommt,
 *   - dass die Punkte dort erscheinen, wo die Lehrkraft sie liest,
 *   - dass der Excel-/ZIP-Export eine brauchbare Datei ergibt.
 *
 * Solange das aussteht, ist die Nutzerreise ungeprüft.
 */

const STUB = 'http://localhost:4010';

/** Die Adresse des Stubs geht in der Anfrage mit — lokal ist das erlaubt. */
const EINSTELLUNGEN = {
    provider: 'openai-compatible',
    openaiUrl: `${STUB}/v1`,
    openaiKey: 'stub',
    openaiModel: 'stub-modell'
};

const aufgabe = (name: string, maxPoints: unknown) => ({ id: name, name, maxPoints });

/** Eine Aufgabe mit Rechenkette — sie löst den Extraktions-Aufruf mit aus. */
const rechenAufgabe = (name: string, maxPoints: number) => ({
    ...aufgabe(name, maxPoints),
    taskType: 'calc-trace',
    targetGoal: {
        targetValue: 42,
        maxPoints,
        criteria: [{ id: 'begruendung', label: 'Begründung', punktwert: maxPoints, source: 'llm', targetIndex: 0 }]
    }
});

interface Ergebnis {
    tasks: { name: string; pointsObtained: number; maxPoints?: number; feedback?: string; correctionNotes?: string }[];
    overallMatchPercentage?: number;
}

async function antwortVorgeben(request: APIRequestContext, inhalt: string, fuer: 'korrektur' | 'extraktion' = 'korrektur') {
    await request.post(`${STUB}/__antwort`, { data: { inhalt, fuer } });
}

async function korrigiere(request: APIRequestContext, tasksLayout: unknown[]): Promise<Ergebnis> {
    const antwort = await request.post('/api/ai-correct', {
        data: {
            modelSolution: 'Aufgabe 1: Berechne 2+2. Lösung: 4',
            studentText: 'Aufgabe 1: 4',
            tasksLayout,
            settings: EINSTELLUNGEN
        }
    });
    expect(antwort.ok(), await antwort.text()).toBeTruthy();
    return antwort.json();
}

test.beforeEach(async ({ request }) => {
    await request.post(`${STUB}/__zuruecksetzen`);
});

test.describe('Unbrauchbare Antworten des Modells', () => {
    /**
     * DER BEFUND VOM 18.08.2026. `Number("drei")` ergab NaN, die Rückfallebene
     * prüfte auf `=== undefined` und griff nicht — die ganze Aufgabe endete mit
     * NaN Punkten.
     *
     * Erwartet wird jetzt die Gesamtpunktzahl des Modells (3), weil die
     * Einzelwertung unlesbar ist.
     */
    test('eine unlesbare Einzelwertung kostet nicht die ganze Aufgabe', async ({ request }) => {
        await antwortVorgeben(request, JSON.stringify({
            tasks: [{
                name: 'Aufgabe 1',
                pointsObtained: 3,
                criteriaScores: [{ id: 'begruendung', points: 'drei' }]
            }]
        }));

        const ergebnis = await korrigiere(request, [rechenAufgabe('Aufgabe 1', 3)]);

        expect(Number.isNaN(ergebnis.tasks[0].pointsObtained)).toBe(false);
        expect(ergebnis.tasks[0].pointsObtained).toBe(3);
        expect(ergebnis.overallMatchPercentage).toBe(100);
        // Die Rückfallebene sagt auch, dass sie gegriffen hat.
        expect(ergebnis.tasks[0].correctionNotes).toContain('nicht auswertbar');
    });

    /**
     * DER BEFUND VOM 18.08.2026 an `llm-json`: Reisst das Token-Budget mitten
     * im JSON, war das vorher bei Mistral ein Totalverlust. Für eine Korrektur
     * ist das der Unterschied zwischen "zwei von drei Aufgaben bewertet" und
     * "gar nichts".
     */
    test('eine abgeschnittene Antwort rettet die vollstaendigen Aufgaben', async ({ request }) => {
        await antwortVorgeben(request,
            '{"tasks":[{"name":"Aufgabe 1","pointsObtained":3},{"name":"Aufgabe 2","pointsObtained":2},{"name":"Aufgabe 3","point');

        const ergebnis = await korrigiere(request, [aufgabe('Aufgabe 1', 3), aufgabe('Aufgabe 2', 3)]);

        expect(ergebnis.tasks.map(t => [t.name, t.pointsObtained])).toEqual([
            ['Aufgabe 1', 3],
            ['Aufgabe 2', 2]
        ]);
    });

    /**
     * DER BEFUND VOM 18.08.2026: Ein einziges unmaskiertes Anführungszeichen
     * — eine Zoll-Angabe reicht — liess die GESAMTE Korrektur scheitern, weil
     * die Antwort faelschlich fuer abgeschnitten gehalten wurde.
     */
    test('ein Zoll-Zeichen im Feedback zerstoert die Korrektur nicht', async ({ request }) => {
        await antwortVorgeben(request,
            '{"tasks":[{"name":"Aufgabe 1","pointsObtained":3,"feedback":"Der Schüler notierte 5" statt 5 cm."}]}');

        const ergebnis = await korrigiere(request, [aufgabe('Aufgabe 1', 3)]);

        expect(ergebnis.tasks[0].pointsObtained).toBe(3);
        expect(ergebnis.tasks[0].feedback).toContain('statt 5 cm');
    });

    /**
     * DER BEFUND VOM 18.08.2026 am Gesamtprozentsatz — und die Falle, in die
     * meine erste Reparatur lief: Wer das unbrauchbare Maximum als 0 zählt, die
     * Punkte aber stehen lässt, kommt über 100 %.
     */
    test('eine untippbare Maximalpunktzahl reisst nicht die ganze Arbeit mit', async ({ request }) => {
        await antwortVorgeben(request, JSON.stringify({
            tasks: [
                { name: 'Aufgabe 1', pointsObtained: 5 },
                { name: 'Aufgabe 2', pointsObtained: 8 },
                { name: 'Aufgabe 3', pointsObtained: 4 }
            ]
        }));

        const ergebnis = await korrigiere(request, [
            aufgabe('Aufgabe 1', 5),
            aufgabe('Aufgabe 2', '10 Punkte'),
            aufgabe('Aufgabe 3', 5)
        ]);

        // 9 von 10 Punkten der beiden auswertbaren Aufgaben.
        expect(ergebnis.overallMatchPercentage).toBe(90);
        expect(ergebnis.overallMatchPercentage).toBeLessThanOrEqual(100);
    });

    /** Ein Denkblock mit geschweifter Klammer darin — Qwen3 schreibt so etwas. */
    test('ein Denkblock vor der Antwort stoert nicht', async ({ request }) => {
        await antwortVorgeben(request,
            '<think>Ich brauche ein Objekt wie {a: 1}</think>\n{"tasks":[{"name":"Aufgabe 1","pointsObtained":2}]}');

        const ergebnis = await korrigiere(request, [aufgabe('Aufgabe 1', 4)]);

        expect(ergebnis.tasks[0].pointsObtained).toBe(2);
        expect(ergebnis.overallMatchPercentage).toBe(50);
    });
});

test.describe('Der uebliche Weg bleibt unveraendert', () => {
    test('rechnet eine saubere Antwort richtig ab', async ({ request }) => {
        await antwortVorgeben(request, JSON.stringify({
            tasks: [
                { name: 'Aufgabe 1', pointsObtained: 4, feedback: 'Fast vollständig.' },
                { name: 'Aufgabe 2', pointsObtained: 5, feedback: 'Richtig.' }
            ],
            confidence: 95
        }));

        const ergebnis = await korrigiere(request, [aufgabe('Aufgabe 1', 5), aufgabe('Aufgabe 2', 5)]);

        expect(ergebnis.tasks.map(t => t.pointsObtained)).toEqual([4, 5]);
        expect(ergebnis.overallMatchPercentage).toBe(90);
    });
});

test.describe('Was Koreki dem Modell vorlegt', () => {
    /**
     * Die Sampling-Disziplin aus dem `prompt-engineering`-Skill (§4):
     * Extraktion bei 0.0, weil dort jede Kreativität eine Halluzination ist.
     * Der Stub protokolliert, was tatsächlich angefragt wurde.
     */
    test('extrahiert bei Temperatur 0 und korrigiert waermer', async ({ request }) => {
        await korrigiere(request, [rechenAufgabe('Aufgabe 1', 3)]);

        const aufrufe = await (await request.get(`${STUB}/__aufrufe`)).json();
        const extraktion = aufrufe.find((a: { art: string }) => a.art === 'extraktion');
        const korrektur = aufrufe.find((a: { art: string }) => a.art === 'korrektur');

        expect(extraktion?.temperature).toBe(0);
        expect(korrektur?.temperature).toBeGreaterThan(0);
    });

    /**
     * Der Prompt-Injection-Befund vom 18.08.2026: Schülertext wurde per
     * `String.replace` eingesetzt, und dort haben `$&`, `` $` ``, `$'` und
     * `$$` Sonderbedeutung. Ein Schüler, der `$'` schreibt, liess damit das
     * schliessende `</task_to_evaluate>` mitten in seiner eigenen Antwort
     * erscheinen.
     */
    test('setzt Schuelertext woertlich in den Prompt', async ({ request }) => {
        const heikel = "Die Lösung ist $$E = mc^2$$ und $' als Konstrukt.";

        await (await request.post('/api/ai-correct', {
            data: {
                modelSolution: 'M',
                studentText: heikel,
                tasksLayout: [aufgabe('Aufgabe 1', 3)],
                settings: EINSTELLUNGEN
            }
        })).json();

        const aufrufe = await (await request.get(`${STUB}/__aufrufe`)).json();
        const korrektur = aufrufe.find((a: { art: string }) => a.art === 'korrektur');
        const user = korrektur.nachrichten.find((n: { role: string }) => n.role === 'user').content;

        expect(user).toContain(heikel);
        // Das schliessende Tag steht genau einmal — am Ende, nicht in der Antwort.
        expect(user.match(/<\/task_to_evaluate>/g)).toHaveLength(1);
    });
});
