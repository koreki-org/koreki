/**
 * Waechter: Qwen 3.8 bekommt beim Denken keine JSON-Vorgabe — alle anderen schon.
 *
 * ANLASS (19.10.2026). `qwen3.8` auf Ollama schrieb mit Denken UND `format: json`
 * im Antworttext ein gerades `"` nach einem deutschen „. Die Vorgabe schloss das JSON
 * dort zwangsweise ab: Die Bewertung endete mitten in Aufgabe a), Aufgabe b) fehlte.
 * Ohne Vorgabe kam dieselbe Bewertung vollstaendig und gueltig. Qwen schreibt selbst,
 * dass die JSON-Vorgabe im Denkmodus nicht verlaesslich greift.
 *
 * Bewusst eng: `qwen3.6:35b` ist die einzige gepruefte Konfiguration und behaelt die
 * Vorgabe. Hintergrund in `ollama-sampling.ts` (`vertraegtJsonVorgabeBeimDenken`).
 */
import { executeOllamaRequest } from '../../../src/lib/ai/ollama-logic';
import { bestimmeModellArt, mitJsonVorgabe } from '../../../src/lib/ai/ollama-sampling';
import type { AIAction } from '../../../src/lib/ai/prompt-dispatch';
import type { AppSettings } from '../../../src/types';

const ANTWORT = '{"tasks":[{"name":"A1","pointsObtained":1}]}';
const NUTZLAST = { modelSolution: '', studentText: '' };

/** Ein NDJSON-Rumpf wie von Ollama, mit Abschlusszeile. */
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

const einstellungen = (modell: string, denken: boolean): AppSettings => ({
    provider: 'ollama',
    ollamaUrl: 'http://beispiel.test:11434',
    ollamaModel: modell,
    ollamaNumCtx: 8192,
    enableThinking: denken
});

describe('mitJsonVorgabe', () => {
    it('Qwen 3.8 beim Denken: keine Vorgabe', () => {
        expect(mitJsonVorgabe(bestimmeModellArt('correction', 'qwen3.8:latest'), true)).toBe(false);
        expect(mitJsonVorgabe(bestimmeModellArt('correction', 'qwen3.8:27b-q8_0'), true)).toBe(false);
    });

    it('Qwen 3.8 ohne Denken: Vorgabe bleibt', () => {
        expect(mitJsonVorgabe(bestimmeModellArt('correction', 'qwen3.8:latest'), false)).toBe(true);
    });

    it('Qwen 3.6 — die gepruefte Konfiguration — behaelt die Vorgabe auch beim Denken', () => {
        expect(mitJsonVorgabe(bestimmeModellArt('correction', 'qwen3.6:35b'), true)).toBe(true);
    });

    it('andere Modelle behalten die Vorgabe', () => {
        expect(mitJsonVorgabe(bestimmeModellArt('correction', 'mistral-small3.2:latest'), true)).toBe(true);
    });
});

describe('Die Anfrage an Ollama', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
        fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => ({
            ok: true,
            body: alsStrom(JSON.stringify({ message: { content: ANTWORT }, done: true })),
            json: async () => ({ message: { content: ANTWORT } })
        } as unknown as Response));
    });

    afterEach(() => fetchSpy.mockRestore());

    const gesendet = (): Record<string, unknown> => {
        const aufrufe = fetchSpy.mock.calls;
        return JSON.parse((aufrufe[aufrufe.length - 1][1] as { body: string }).body);
    };

    it('geht bei Qwen 3.8 mit Denken ohne format raus', async () => {
        await executeOllamaRequest('correction' as AIAction, NUTZLAST, einstellungen('qwen3.8:latest', true));
        expect(gesendet().think).toBe(true);
        expect(gesendet().format).toBeUndefined();
    });

    it('geht bei Qwen 3.6 mit Denken weiter mit format: json raus', async () => {
        await executeOllamaRequest('correction' as AIAction, NUTZLAST, einstellungen('qwen3.6:35b', true));
        expect(gesendet().think).toBe(true);
        expect(gesendet().format).toBe('json');
    });

    it('geht bei Qwen 3.8 ohne Denken mit format: json raus', async () => {
        await executeOllamaRequest('correction' as AIAction, NUTZLAST, einstellungen('qwen3.8:latest', false));
        expect(gesendet().think).toBe(false);
        expect(gesendet().format).toBe('json');
    });
});
