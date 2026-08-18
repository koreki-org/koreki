import { executeMistralRequest } from '../../../src/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../../src/lib/ai/openai-provider';
import * as constants from '../../../src/lib/ai/constants';

jest.mock('../../../src/lib/ai/constants', () => ({
    ...jest.requireActual('../../../src/lib/ai/constants'),
    fetchWithRetry: jest.fn()
}));

const mockFetch = constants.fetchWithRetry as jest.Mock;

/**
 * Anbieter-Parität beim JSON-Lesen (Layer 2)
 * 🤝🧩
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026. `mistral-provider.ts` hatte eine EIGENE,
 * deutlich schwächere Fassung des JSON-Lesens — dieselbe Doppelung,
 * deretwegen `llm-json.ts` überhaupt angelegt wurde. Der Kopf jener Datei
 * beschreibt den Zusammenschluss von `ollama-logic` und `openai-provider`;
 * Mistral wurde dabei übersehen und behielt seine Kopie.
 *
 * Mistral ist nicht irgendein Anbieter: Im `ai-orchestrator` ist er der
 * Rückfall und läuft auch ohne ausdrücklich gesetzten Provider.
 *
 * Architectural Vision §11 fordert für diese Bridge ausdrücklich eine
 * "Single Source of Truth" für robustes JSON-Parsing und "identische
 * Qualität" über die Betriebsarten. Dieser Test misst genau das: Beide
 * Anbieter bekommen dieselben vier Antworten, und beide müssen sie lesen.
 *
 * Jede der vier führte bei Mistral zum VOLLSTÄNDIGEN Verlust der Korrektur —
 * nicht zu einem Teilschaden.
 */

/** Die vier Fallen, jeweils mit dem, was ohne die gemeinsame Fassung passierte. */
const FAELLE: [string, string][] = [
    [
        'Denkblock mit geschweifter Klammer',
        '<think>Ich brauche ein Objekt wie {a: 1}</think>\n{"tasks":[{"name":"A1","pointsObtained":3}]}'
    ],
    [
        'unmaskiertes Anfuehrungszeichen im Feedback',
        '{"tasks":[{"name":"A1","pointsObtained":3,"feedback":"notierte 5" statt 5 cm"}]}'
    ],
    [
        'abgeschnittene Antwort',
        '{"tasks":[{"name":"A1","pointsObtained":3},{"name":"A2","pointsObtained":2},{"name":"A3","point'
    ],
    [
        'Markdown-Block um das JSON',
        '```json\n{"tasks":[{"name":"A1","pointsObtained":3}]}\n```'
    ]
];

interface Gelesen {
    tasks?: { name: string; pointsObtained: number }[];
}

describe('Beide Anbieter lesen dieselben schwierigen Antworten', () => {
    beforeEach(() => jest.clearAllMocks());

    it.each(FAELLE)('Mistral: %s', async (_was, antwort) => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: [{ message: { content: antwort } }] })
        });

        const ergebnis = await executeMistralRequest(
            'correction', { modelSolution: '', studentText: '' }, 'SCHLUESSEL'
        ) as Gelesen;

        expect(ergebnis.tasks?.[0]).toMatchObject({ name: 'A1', pointsObtained: 3 });
    });

    it.each(FAELLE)('OpenAI-kompatibel: %s', async (_was, antwort) => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: [{ message: { content: antwort } }] })
        });

        const ergebnis = await executeOpenAIRequest(
            'correction', { modelSolution: '', studentText: '' }, 'https://beispiel.test/v1', 'SCHLUESSEL'
        ) as Gelesen;

        expect(ergebnis.tasks?.[0]).toMatchObject({ name: 'A1', pointsObtained: 3 });
    });

    /**
     * Für eine Korrektur ist das der Unterschied zwischen "zwei von drei
     * Aufgaben bewertet" und "gar nichts". Ausdrücklich für Mistral geprüft,
     * weil dort die Rettung abgeschnittener Antworten ganz fehlte.
     */
    it('Mistral rettet die vollstaendigen Aufgaben einer abgeschnittenen Antwort', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: [{ message: { content: FAELLE[2][1] } }] })
        });

        const ergebnis = await executeMistralRequest(
            'correction', { modelSolution: '', studentText: '' }, 'SCHLUESSEL'
        ) as Gelesen;

        expect(ergebnis.tasks?.map(t => t.name)).toEqual(['A1', 'A2']);
    });

    /** Sauberes JSON darf durch nichts davon anders gelesen werden. */
    it('liest sauberes JSON bei beiden unveraendert', async () => {
        const sauber = '{"tasks":[{"name":"A1","pointsObtained":3}],"confidence":95}';

        mockFetch.mockResolvedValueOnce({
            ok: true, json: async () => ({ choices: [{ message: { content: sauber } }] })
        });
        const m = await executeMistralRequest('correction', { modelSolution: '', studentText: '' }, 'K') as Gelesen & { confidence?: number };

        mockFetch.mockResolvedValueOnce({
            ok: true, json: async () => ({ choices: [{ message: { content: sauber } }] })
        });
        const o = await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, 'https://b.test/v1', 'K') as Gelesen & { confidence?: number };

        expect(m.confidence).toBe(95);
        expect(o.confidence).toBe(95);
        expect(m.tasks).toEqual(o.tasks);
    });
});
