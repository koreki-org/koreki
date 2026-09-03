/**
 * Waechter: Jeder Anbieter sendet den festen Startwert — und der Simulator keinen.
 *
 * ANLASS (02.09.2026). Bei der Genauigkeitsmessung wichen drei von zwoelf Faellen
 * zwischen zwei Messsitzungen ab. Auf die Frage, ob der feste Startwert ueberhaupt
 * gesetzt sei, zeigte sich: Er ist es — `SAMPLING_SEED` geht an alle drei Anbieter.
 * Gesichert war das aber nirgends.
 *
 * Im gesamten Testbaum kam ein Startwert nur an EINER Stelle vor: in
 * `tests/integration/CalcDeterminism.test.ts`, und dort SETZT der Test ihn selbst,
 * indem er `fetch` abfaengt und `body.options.seed = 42` schreibt. Dieser Test wuerde
 * also weiterhin gruen bleiben, wenn die Anbieter den Startwert gar nicht mehr
 * senden — er prueft die eigene Injektion, nicht das Verhalten der Anwendung.
 *
 * DIE REGEL. Der Startwert geht an ALLE Anbieter oder an keinen. Er ist die einzige
 * Zusicherung, die Koreki zur Wiederholbarkeit einer Bewertung geben kann: Ein
 * Stapel, den eine Lehrkraft ein zweites Mal laufen laesst, soll dieselben Zahlen
 * liefern statt neuer. Faellt er bei einem Anbieter weg, wuerfelt genau dort jeder
 * Lauf neu — und niemand merkt es, weil die Zahlen ja plausibel aussehen.
 *
 * DIE AUSNAHME ist der Schueler-Simulator und nur er. Er erzeugt fiktive Abgaben zur
 * Kalibrierung; mit festem Startwert lieferte er bei jedem Aufruf DIESELBEN Schueler.
 * Deshalb wird hier beides geprueft: dass der Startwert da ist, wo er hingehoert, und
 * dass er dort fehlt, wo er schadet.
 *
 * NICHT GEDECKT. Ob ein Modell den Startwert BEACHTET. Bei Mixture-of-Experts-Modellen
 * und serverseitiger Buendelung ist er eine starke Tendenz, keine harte Zusicherung —
 * das steht so im Kopf von `temperature-guidance.ts` und war bei der Messung oben auch
 * zu sehen: Das dort verwendete Modell meldet sich selbst als `qwen35moe`. Dieser Test
 * sichert nur, dass Koreki den Startwert sendet.
 */
import { executeMistralRequest } from '../../../src/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../../src/lib/ai/openai-provider';
import { executeOllamaRequest } from '../../../src/lib/ai/ollama-logic';
import { SAMPLING_SEED } from '../../../src/lib/ai/temperature-guidance';
import * as constants from '../../../src/lib/ai/constants';
import type { AIAction } from '../../../src/lib/ai/prompt-dispatch';
import type { AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/ai/constants', () => ({
    ...jest.requireActual('../../../src/lib/ai/constants'),
    fetchWithRetry: jest.fn()
}));

const mockFetchWithRetry = constants.fetchWithRetry as jest.Mock;

/** Eine unauffaellige, gueltige Korrekturantwort — der Inhalt ist hier gleichgueltig. */
const ANTWORT = '{"tasks":[{"name":"A1","pointsObtained":1}]}';

const NUTZLAST = { modelSolution: '', studentText: '' };

/** Der zuletzt gesendete Rumpf, als Objekt. */
function letzterRumpf(aufrufe: jest.Mock | jest.SpyInstance): Record<string, unknown> {
    const calls = (aufrufe as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const optionen = calls[calls.length - 1][1] as { body: string };
    return JSON.parse(optionen.body) as Record<string, unknown>;
}

/**
 * Eine NDJSON-Zeile als Rumpf, wie ihn Ollama sendet.
 *
 * Bauart wie in `ollama-stream.test.ts`: ein Objekt mit `getReader`, nicht ein
 * echter `ReadableStream` — den gibt es in der Testumgebung nicht.
 */
function alsStrom(zeile: string): { getReader: () => { read: () => Promise<unknown> } } {
    const bytes = new TextEncoder().encode(zeile + String.fromCharCode(10));
    let gelesen = false;
    return {
        getReader: () => ({
            read: async () => {
                if (gelesen) return { done: true, value: undefined };
                gelesen = true;
                return { done: false, value: bytes };
            }
        })
    };
}

function ollamaEinstellungen(): AppSettings {
    return {
        provider: 'ollama',
        ollamaUrl: 'http://beispiel.test:11434',
        ollamaModel: 'irgendein-modell',
        ollamaNumCtx: 8192,
        temperature: 0.2,
        topP: 0.8,
        maxTokens: 512
    };
}

describe('Fester Startwert bei allen Anbietern', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
        mockFetchWithRetry.mockReset();
        mockFetchWithRetry.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: ANTWORT } }] })
        });

        // Ollama geht nicht ueber fetchWithRetry, sondern direkt ueber fetch —
        // und liest die Antwort als Strom, nicht als JSON. Die Attrappe muss
        // daher einen Strom liefern, sonst scheitert der Aufruf NACH dem
        // Senden, und der Test pruefte nur noch seine eigene Attrappe.
        fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
            ok: true,
            body: alsStrom(JSON.stringify({ message: { content: ANTWORT }, done: true })),
            json: async () => ({ message: { content: ANTWORT } })
        } as unknown as Response));
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    describe('bei einer Korrektur ist er gesetzt', () => {
        it('Mistral sendet random_seed', async () => {
            await executeMistralRequest('correction' as AIAction, NUTZLAST, 'SCHLUESSEL');
            expect(letzterRumpf(mockFetchWithRetry).random_seed).toBe(SAMPLING_SEED);
        });

        it('OpenAI-kompatibel sendet seed', async () => {
            await executeOpenAIRequest(
                'correction' as AIAction, NUTZLAST, 'https://beispiel.test/v1', 'SCHLUESSEL'
            );
            expect(letzterRumpf(mockFetchWithRetry).seed).toBe(SAMPLING_SEED);
        });

        it('Ollama sendet options.seed', async () => {
            await executeOllamaRequest('correction' as AIAction, NUTZLAST, ollamaEinstellungen());
            const optionen = letzterRumpf(fetchSpy).options as Record<string, unknown>;
            expect(optionen.seed).toBe(SAMPLING_SEED);
        });
    });

    describe('beim Schueler-Simulator fehlt er', () => {
        it('Mistral sendet keinen random_seed', async () => {
            await executeMistralRequest('student-simulator' as AIAction, NUTZLAST, 'SCHLUESSEL');
            expect(letzterRumpf(mockFetchWithRetry).random_seed).toBeUndefined();
        });

        it('OpenAI-kompatibel sendet keinen seed', async () => {
            await executeOpenAIRequest(
                'student-simulator' as AIAction, NUTZLAST, 'https://beispiel.test/v1', 'SCHLUESSEL'
            );
            expect(letzterRumpf(mockFetchWithRetry).seed).toBeUndefined();
        });

        it('Ollama sendet kein options.seed', async () => {
            await executeOllamaRequest('student-simulator' as AIAction, NUTZLAST, ollamaEinstellungen());
            const optionen = letzterRumpf(fetchSpy).options as Record<string, unknown>;
            expect(optionen.seed).toBeUndefined();
        });
    });
});
