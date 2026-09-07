/**
 * Waechter: EINE Leiter fuer den Denkschritt — und sie muss beim Anbieter ankommen. 💭🪜
 *
 * ANLASS (07.09.2026). Die Regel "bei Bilderkennung wird nicht laut gedacht" stand in
 * ZWEI Familien: Bei Ollama als ausgefuehrter Code, beim OpenAI-kompatiblen Weg als
 * Kommentar, der sich selbst widersprach — er zaehlte die Aktionen richtig auf und
 * sendete das Ergebnis an keiner Stelle.
 *
 * Die Folge war kein Schoenheitsfehler. Gegen `Qwen3.6-35B-A3B-FP8` ueber Mittwald,
 * eine echte Schuelerseite, die Parameter aus dem Betrieb:
 *
 * | Denkschritt | Dauer je Seite | Denktext        | Ergebnis                       |
 * |-------------|----------------|-----------------|--------------------------------|
 * | offen       | 60,6 / 112,5 s | ~46.000 Zeichen | `content` LEER (`length`)      |
 * | aus         | 0,8 / 0,9 s    | 0               | Text vollstaendig              |
 *
 * Der Test prueft beides: dass die Leiter fuer jede Aktion dasselbe sagt, egal wer
 * fragt — und dass der OpenAI-kompatible Weg die Antwort VERSCHACHTELT sendet. Die
 * oberste Ebene verwirft der Vermittler stillschweigend; ein Test, der nur
 * `body.enable_thinking` prueft, waere gruen gewesen, waehrend das Denken weiterlief.
 */
import { denktBeiAktion } from '@/lib/ai/denkschritt';
import { berechneSamplingParameter } from '@/lib/ai/ollama-sampling';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import * as constants from '@/lib/ai/constants';
import type { AIAction } from '@/lib/ai/prompt-dispatch';
import type { AppSettings } from '@/types';

jest.mock('@/lib/ai/constants', () => ({
    ...jest.requireActual('@/lib/ai/constants'),
    fetchWithRetry: jest.fn()
}));
jest.mock('@/lib/env-context', () => ({
    ...jest.requireActual('@/lib/env-context'),
    isDesktopTarget: jest.fn(() => false)
}));

const mockFetch = constants.fetchWithRetry as jest.Mock;

/** Jede Aktion, jede Schalterstellung — und was dabei herauskommen MUSS. */
const LEITER: [AIAction, boolean | 'modal'][] = [
    ['vision', false],
    ['anonymize', false],
    ['calc-trace-extraction', true],
    ['clean-and-analyze', false],
    ['clean-and-map', false],
    ['variable-extraction', false],
    ['generate-graph', false],
    ['refine-graph', false],
    ['generate-calc-trace', false],
    ['correction', 'modal'],
    ['second-opinion', 'modal'],
    ['student-simulator', 'modal']
];

const erwartet = (regel: boolean | 'modal', schalter: boolean) =>
    regel === 'modal' ? schalter : regel;

describe('Die Leiter selbst', () => {
    it.each(LEITER)('%s: sagt fuer beide Schalterstellungen dasselbe wie die Regel', (action, regel) => {
        expect(denktBeiAktion(action, true)).toBe(erwartet(regel, true));
        expect(denktBeiAktion(action, false)).toBe(erwartet(regel, false));
    });

    /**
     * Ungesetzt heisst AN — aber nur dort, wo das Modal ueberhaupt gefragt wird.
     * Eine Struktur-Aktion darf durch einen fehlenden Wert nicht anfangen zu denken.
     */
    it.each(LEITER)('%s: ein ungesetzter Schalter kippt die Regel nicht', (action, regel) => {
        expect(denktBeiAktion(action, undefined)).toBe(erwartet(regel, true));
    });
});

describe('Ollama und OpenAI-kompatibel antworten gleich', () => {
    it.each(LEITER)('%s: beide Familien entscheiden identisch', async (action, regel) => {
        for (const schalter of [true, false]) {
            const settings = { enableThinking: schalter } as AppSettings;

            const ollama = berechneSamplingParameter({
                action, settings, model: 'qwen3.6:35b', promptCharCount: 100, imageCount: 0
            } as Parameters<typeof berechneSamplingParameter>[0]).think;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });
            await executeOpenAIRequest(
                action,
                { modelSolution: '', studentText: '', buffer: 'x' },
                'https://llm.example/v1',
                'schluessel',
                { model: 'Qwen3.6-35B-A3B-FP8', enableThinking: schalter }
            ).catch(() => undefined);
            const body = JSON.parse(mockFetch.mock.calls.at(-1)![1].body);

            expect(ollama).toBe(erwartet(regel, schalter));
            expect(body.chat_template_kwargs.enable_thinking).toBe(ollama);
        }
    });
});

describe('Das Feld steht verschachtelt', () => {
    beforeEach(() => jest.clearAllMocks());

    /**
     * Die eigentliche Falle. Gemessen am 07.09.2026: `enable_thinking` auf oberster
     * Ebene wird von Mittwalds Vermittler ohne Fehlermeldung verworfen — bei Qwen 3.6
     * UND 3.8. Wer es dort hinschreibt, hat einen gruenen Test und ein denkendes
     * Modell.
     */
    it('sendet enable_thinking nicht auf oberster Ebene', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'Text' } }] })
        });

        await executeOpenAIRequest('vision', { buffer: 'x' }, 'https://llm.example/v1', 'schluessel', {
            model: 'Qwen3.6-35B-A3B-FP8'
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.enable_thinking).toBeUndefined();
        expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    });

    /**
     * `reasoning_effort` ist KEIN Ersatz: Bei Qwen 3.6 — dem Modell hinter "Hohe
     * Genauigkeit" im SaaS — aendern die Denktiefen-Stufen nachweislich nichts.
     * Es bleibt als Feld erhalten, darf den An/Aus-Schalter aber nicht verdraengen.
     */
    it('behaelt reasoning_effort als eigenstaendiges Feld', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'Text' } }] })
        });

        await executeOpenAIRequest('second-opinion', { studentText: '' }, 'https://llm.example/v1', 'schluessel', {
            model: 'Qwen3.8-27B-NVFP4', reasoningEffort: 'low'
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.reasoning_effort).toBe('low');
        expect(body.chat_template_kwargs.enable_thinking).toBe(true);
    });
});
