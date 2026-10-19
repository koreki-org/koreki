import { executeOpenAIRequest } from '../../src/lib/ai/openai-provider';
import * as constants from '../../src/lib/ai/constants';
import { TEMPERATURE_MINIMUM } from '@/lib/ai/temperature-guidance';
import { isDesktopTarget } from '../../src/lib/env-context';

// Mock fetchWithRetry
jest.mock('../../src/lib/ai/constants', () => ({
    ...jest.requireActual('../../src/lib/ai/constants'),
    fetchWithRetry: jest.fn()
}));

// Mock env-context to control mode
jest.mock('../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false)
}));

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
    invoke: jest.fn()
}), { virtual: true });

const mockFetchWithRetry = constants.fetchWithRetry as jest.Mock;

describe('OpenAI Provider (Bridge) - Unit Tests', () => {
    const API_KEY = 'OPENAI_KEY_123';
    const URL = 'https://api.openai.com/v1';
    const MODEL = 'gpt-4o';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executeOpenAIRequest - Payload Construction', () => {
        it('should send standard OpenAI payload', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: MODEL });
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.model).toBe(MODEL);
            expect(body.messages[0].role).toBe('system');
        });

        /**
         * UMGEDREHT AM 07.09.2026. Hier stand die Erwartung, `chat_template_kwargs`
         * duerfe NICHT im Rumpf stehen — begruendet mit einem Absturz des Vermittlers
         * (LiteLLM bei Mittwald), den es nicht gibt. Gegen den Endpunkt nachgemessen:
         * Er nimmt das Feld an und befolgt es; ignoriert wird nur `enable_thinking`
         * auf oberster Ebene.
         *
         * Der Test war damit ein Waechter fuer den Fehler statt gegen ihn: Er hielt
         * die einzige wirksame Form des Schalters aus dem Rumpf heraus, und der
         * Denkschritt lief bei jeder Aktion mit — auch bei der Bilderkennung, wo er
         * die Antwort vollstaendig auffrisst.
         *
         * Die Leiter dahinter steht in `denkschritt.ts`, geprueft in
         * `tests/unit/ai/denkschritt-leiter.test.ts`.
         */
        it('sendet den Denkschritt verschachtelt, nicht auf oberster Ebene', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, {
                model: MODEL,
                enableThinking: true
            });

            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.chat_template_kwargs).toEqual({ enable_thinking: true });
            expect(body).not.toHaveProperty('enable_thinking');
        });

        /**
         * Bis zum 25.08.2026 setzte der Provider bei der Korrektur mit Thinking eine
         * eigene Temperatur von 0.6 — unabhaengig davon, was Profil und Oberflaeche
         * anzeigten. Damit rechneten OpenAI- und Ollama-Weg bei sonst gleicher
         * Einstellung verschieden. Jetzt gilt fuer beide derselbe Standardwert.
         */
        it('nimmt bei der Korrektur den Standardwert, auch mit Thinking', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, {
                model: MODEL,
                enableThinking: true
            });
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.temperature).toBe(TEMPERATURE_MINIMUM);
        });
    });

    describe('executeOpenAIRequest - Response Processing', () => {
        it('should strip reasoning blocks from content', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    choices: [{ message: { content: '<thinking>Ich überlege...</thinking> {"score": 5}' } }] 
                })
            });

            const res = await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: MODEL });
            expect(res.score).toBe(5);
        });

        it('should strip Qwen <think> tags containing braces and extract JSON correctly', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    choices: [{ message: { content: '<think>\nIch analysiere den Fall: { "draft": true }\n</think>\n```json\n{"score": 9, "status": "done"}\n```' } }] 
                })
            });

            const res = await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: MODEL });
            expect(res.score).toBe(9);
            expect(res.status).toBe('done');
        });

        it('should auto-repair truncated JSON caused by max_tokens limits', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    choices: [{ message: { content: '<think>Reasoning...</think>\n{"score": 10, "tasks": [{"name": "Task 1"' } }] 
                })
            });

            const res = await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: MODEL });
            expect(res.score).toBe(10);
            expect(res.tasks).toBeDefined();
            expect(res.tasks[0].name).toBe('Task 1');
        });

        it('should allocate at least 16384 max_tokens when Thinking Mode is active', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, {
                model: MODEL,
                maxTokens: 4000,
                enableThinking: true
            });
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.max_tokens).toBeGreaterThanOrEqual(16384);
        });

        it('should handle markdown code blocks', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    choices: [{ message: { content: 'Hier ist JSON:\n```json\n{"score": 8}\n```' } }] 
                })
            });

            const res = await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: MODEL });
            expect(res.score).toBe(8);
        });
    });

    describe('executeOpenAIRequest - Desktop Proxy', () => {
        it('should call Tauri invoke if in desktop mode', async () => {
            const { isDesktopTarget } = require('../../src/lib/env-context');
            const { invoke } = require('@tauri-apps/api/core');
            
            isDesktopTarget.mockReturnValue(true);
            invoke.mockResolvedValue(JSON.stringify({ 
                choices: [{ message: { content: '{"ok": true}' } }] 
            }));

            await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: MODEL });
            
            expect(invoke).toHaveBeenCalledWith('execute_ai_proxy_command', expect.objectContaining({
                url: `${URL}/chat/completions`
            }));
            const body = JSON.parse(invoke.mock.calls[0][1].body);
            expect(body.model).toBe(MODEL);
            expect(mockFetchWithRetry).not.toHaveBeenCalled();
        });
    });
});

/**
 * Waechter: Eine leere Antwort wird einmal wiederholt — und dann erklaert. 🫙
 *
 * ANLASS (07.09.2026). Bei der Genauigkeitsmessung gegen `Qwen3.8-27B-NVFP4` ueber
 * Mittwald fiel der ZWOELFTE von zwoelf Faellen in beiden Durchgaengen mit einer
 * leeren Antwort aus. Derselbe Fall allein gemessen lief fehlerfrei durch — es lag
 * nicht an ihm, sondern an der Stelle am Ende einer langen Aufruffolge.
 *
 * Zwei Luecken kamen zusammen:
 *
 * 1. Eine 200er-Antwort ohne Inhalt ist kein HTTP-Fehler. `fetchWithRetry` sieht sie
 *    nicht und wiederholt sie nicht.
 * 2. Die Fehlermeldung nannte den Abbruchgrund nicht. Man sah nur, DASS nichts kam —
 *    nicht, ob das Modell blockiert hat oder ob der Denktext den Antwortplatz
 *    aufgebraucht hat. Bei einem Modell, das 1135 von 1146 Tokens verdenkt, ist das
 *    der Unterschied zwischen zwei ganz verschiedenen Ursachen.
 *
 * Die Folge war keine Fehlermeldung, sondern eine falsche ZAHL: Der Fall ging mit 0
 * statt 3 Punkten in die Messung und trieb die ausgewiesene Abweichung von 0,09 auf
 * 0,42 Punkte — ueber beide Schwellen der KI-Verordnung.
 */
describe('Leere Antwort', () => {
    const API_KEY = 'k';
    const URL = 'https://example.test/v1';
    const leer = { ok: true, json: async () => ({ choices: [{ message: { content: null, reasoning_content: 'x'.repeat(13631) }, finish_reason: 'stop' }], usage: { completion_tokens: 4415 } }) };

    /**
     * `jest.clearAllMocks()` loescht Aufrufe, nicht Rueckgabewerte. Der Desktop-Test
     * weiter oben setzt `isDesktopTarget` auf `true`, und das wirkt hier fort.
     */
    beforeEach(() => {
        jest.clearAllMocks();
        (isDesktopTarget as jest.Mock).mockReturnValue(false);
    });

    const anfragen = () => executeOpenAIRequest(
        'correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: 'm' }
    );

    /** Die Fortsetzung kommt ebenfalls leer zurueck — ohne Inhalt, ohne Denktext. */
    const auchLeer = { ok: true, json: async () => ({ choices: [{ message: { content: '' }, finish_reason: 'stop' }] }) };

    /**
     * KEIN NEU-WUERFELN — und das ist eine Entscheidung, keine Luecke.
     *
     * Am 07.09.2026 stand hier kurzzeitig ein Wiederholungsversuch. Der Einspruch des
     * Anbieters hat ihn gekippt: Eine Aufgabe waere nach einem Aussetzer anders
     * zustande gekommen als die daneben, und der Punktzahl saehe man das nicht an.
     *
     * SEIT 19.10.2026 wird ein Denkabbruch FORTGESETZT: derselbe Denktext, nur der
     * Uebergang zur Antwort wird erzwungen (`denkabbruch.ts`). Darum zwei Aufrufe —
     * aber der zweite enthaelt den Denktext des ersten und denkt nicht neu. Waere er
     * eine blosse Wiederholung, stuende hier dieselbe Anfrage zweimal.
     */
    it('setzt einen Denkabbruch fort, statt neu zu wuerfeln', async () => {
        mockFetchWithRetry
            .mockResolvedValueOnce(leer)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: null, reasoning_content: '{"ok":1}' }, finish_reason: 'stop' }] }) });

        const ergebnis = await anfragen();

        expect(ergebnis.ok).toBe(1);
        expect(mockFetchWithRetry).toHaveBeenCalledTimes(2);
        const zweite = JSON.parse(mockFetchWithRetry.mock.calls[1][1].body);
        const vorgabe = zweite.messages[zweite.messages.length - 1];
        expect(vorgabe.role).toBe('assistant');
        expect(vorgabe.content).toMatch(/^<think>\nx+/);
        expect(vorgabe.content).toMatch(/<\/think>\n\n$/);
        expect(zweite.continue_final_message).toBe(true);
        expect(zweite.add_generation_prompt).toBe(false);
    });

    /**
     * Ohne den Abbruchgrund sieht man nur, DASS nichts kam. `stop` heisst: Das Modell
     * war fertig und hat nichts gesagt — eine ganz andere Ursache als `length`
     * (Platz aufgebraucht) oder `content_filter` (blockiert).
     */
    it('nennt Abbruchgrund und Umfang in der Meldung, wenn auch die Fortsetzung leer bleibt', async () => {
        mockFetchWithRetry.mockResolvedValueOnce(leer).mockResolvedValueOnce(auchLeer);

        await expect(anfragen()).rejects.toThrow(/Abbruchgrund: stop \(4415 Antwort-Tokens\)/);
        expect(mockFetchWithRetry).toHaveBeenCalledTimes(2);
    });

    /**
     * Ohne Denktext gibt es nichts fortzusetzen. Der leere String lief frueher weiter
     * und scheiterte erst beim JSON-Lesen.
     */
    it('behandelt den leeren String ohne Denktext als fehlende Antwort — ein Aufruf', async () => {
        mockFetchWithRetry.mockResolvedValue(auchLeer);

        await expect(anfragen()).rejects.toThrow(/leere Antwort/);
        expect(mockFetchWithRetry).toHaveBeenCalledTimes(1);
    });

    /** Wer nicht denken sollte, hat keinen Denkabbruch — dort bleibt es beim Fehler. */
    it('setzt nicht fort, wenn der Denkschritt aus war', async () => {
        mockFetchWithRetry.mockResolvedValue(leer);

        await expect(executeOpenAIRequest(
            'correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: 'm', enableThinking: false }
        )).rejects.toThrow(/leere Antwort/);
        expect(mockFetchWithRetry).toHaveBeenCalledTimes(1);
    });

    /**
     * Die Denktiefe ist eine Einstellung, die fuer jeden Aufruf gleich gilt — kein
     * Rueckfall im Fehlerfall. Eine Bewertung, die je nach Zufall mit oder ohne
     * Denkschritt zustande kommt, waere keine gleiche Bewertung.
     */
    it('sendet eine eingestellte Denktiefe mit', async () => {
        mockFetchWithRetry.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '{"ok":1}' }, finish_reason: 'stop' }] })
        });

        await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY,
            { model: 'm', reasoningEffort: 'medium' });

        expect(JSON.parse(mockFetchWithRetry.mock.calls[0][1].body).reasoning_effort).toBe('medium');
    });

    /**
     * Ohne Angabe bleibt das Feld weg — dann entscheidet das Modell.
     *
     * Am 07.09.2026 stand hier kurz `medium` als Vorgabe. Der Referenzsatz hat sie
     * gekippt: 0,88 statt 0,17 Punkte Abweichung, beide Schwellen gerissen.
     */
    it('sendet ohne Angabe kein Denktiefe-Feld', async () => {
        mockFetchWithRetry.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '{"ok":1}' }, finish_reason: 'stop' }] })
        });

        await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, { model: 'm' });

        expect(JSON.parse(mockFetchWithRetry.mock.calls[0][1].body).reasoning_effort).toBeUndefined();
    });
});
