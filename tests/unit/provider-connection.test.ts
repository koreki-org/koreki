/**
 * @jest-environment node
 *
 * Node, nicht jsdom: Der Env-Rueckfall greift bewusst nur serverseitig
 * (`typeof window === 'undefined'`). Unter jsdom waere `window` definiert und
 * der Rueckfall damit in allen Faellen abgeschaltet — die Tests wuerden das
 * Gegenteil dessen pruefen, was in Produktion laeuft.
 */
import {
    DEFAULT_OPENAI_COMPATIBLE_MODEL,
    requireOllamaConnection,
    requireOpenAiConnection,
    resolveOpenAiConnection
} from '../../src/lib/ai/provider-connection';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '../../src/lib/ai/constants';
import { AIConfigError } from '../../src/lib/ai/provider-error';

jest.mock('../../src/lib/logger', () => ({
    logger: { error: jest.fn(), security: jest.fn(), info: jest.fn(), warn: jest.fn() }
}));

/**
 * Diese Aufloesung stand vorher wortgleich an zwoelf Stellen — die Duplikation
 * WAR die kritische Sicherheitsluecke. Jetzt haengen alle dreizehn Aufrufer an
 * dieser einen Funktion, also gehoert die Fallback-Kette festgenagelt.
 */
describe('provider-connection', () => {
    const ENV_KEYS = [
        'OPENAI_API_BASE',
        'OPENAI_API_URL',
        'OPENAI_API_KEY',
        'MITTWALD_API_KEY',
        'OPENAI_API_MODEL',
        'OPENAI_MODEL',
        'OLLAMA_BASE_URL',
        'OLLAMA_URL',
        'OLLAMA_MODEL'
    ] as const;

    const originalEnv = { ...process.env };

    beforeEach(() => {
        ENV_KEYS.forEach(key => delete process.env[key]);
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('resolveOpenAiConnection', () => {
        it('bevorzugt die Einstellungen vor der Env', () => {
            process.env.OPENAI_API_BASE = 'https://env.example/v1';
            process.env.OPENAI_API_KEY = 'env-key';
            process.env.OPENAI_API_MODEL = 'env-model';

            const connection = resolveOpenAiConnection({
                openaiUrl: 'https://lokal.example/v1',
                openaiKey: 'lokaler-key',
                openaiModel: 'lokales-model'
            });

            expect(connection).toEqual({
                baseUrl: 'https://lokal.example/v1',
                apiKey: 'lokaler-key',
                model: 'lokales-model'
            });
        });

        it('faellt auf die Env zurueck, wenn die Einstellungen leer sind', () => {
            process.env.OPENAI_API_BASE = 'https://env.example/v1';
            process.env.OPENAI_API_KEY = 'env-key';
            process.env.OPENAI_API_MODEL = 'env-model';

            expect(resolveOpenAiConnection({})).toEqual({
                baseUrl: 'https://env.example/v1',
                apiKey: 'env-key',
                model: 'env-model'
            });
        });

        it('haelt die Reihenfolge der Env-Alternativen ein', () => {
            process.env.OPENAI_API_URL = 'https://zweitwahl.example/v1';
            process.env.MITTWALD_API_KEY = 'mittwald-key';
            process.env.OPENAI_MODEL = 'zweitwahl-model';

            expect(resolveOpenAiConnection({})).toEqual({
                baseUrl: 'https://zweitwahl.example/v1',
                apiKey: 'mittwald-key',
                model: 'zweitwahl-model'
            });
        });

        it('nutzt die Standardwerte, wenn weder Einstellungen noch Env etwas vorgeben', () => {
            const connection = resolveOpenAiConnection(undefined);

            expect(connection.baseUrl).toBe(DEFAULT_OPENAI_COMPATIBLE_BASE_URL);
            expect(connection.model).toBe(DEFAULT_OPENAI_COMPATIBLE_MODEL);
            expect(connection.apiKey).toBeUndefined();
        });

        it('wirft nicht, wenn der Schluessel fehlt — das entscheidet der Aufrufer', () => {
            expect(() => resolveOpenAiConnection({})).not.toThrow();
        });
    });

    describe('requireOpenAiConnection', () => {
        it('liefert die Verbindung, wenn ein Schluessel vorliegt', () => {
            process.env.OPENAI_API_KEY = 'env-key';

            expect(requireOpenAiConnection({}).apiKey).toBe('env-key');
        });

        it('wirft einen AIConfigError, wenn kein Schluessel auffindbar ist', () => {
            expect(() => requireOpenAiConnection({})).toThrow(AIConfigError);
        });

        /**
         * AIConfigError bildet auf HTTP 503 ab. Ein nackter Error landete auf
         * 500 und war damit von einem echten Absturz nicht zu unterscheiden —
         * genau das war an zwei der urspruenglichen Fundstellen der Fall.
         */
        it('meldet den Konfigurationsfehler als solchen, nicht als Absturz', () => {
            try {
                requireOpenAiConnection({});
                throw new Error('haette werfen muessen');
            } catch (error) {
                expect(error).toBeInstanceOf(AIConfigError);
                expect((error as Error).message).toBe('Mittwald/OpenAI API-Key fehlt.');
            }
        });
    });

    describe('requireOllamaConnection', () => {
        it('bevorzugt die Einstellungen vor der Env', () => {
            process.env.OLLAMA_BASE_URL = 'http://env.example:11434';
            process.env.OLLAMA_MODEL = 'env-model';

            expect(requireOllamaConnection({
                ollamaUrl: 'http://lokal.example:11434',
                ollamaModel: 'lokales-model'
            })).toEqual({
                baseUrl: 'http://lokal.example:11434',
                model: 'lokales-model'
            });
        });

        /**
         * DIE REGRESSION (09.09.2026). Seit `6dc4609` entfernt
         * `sanitizeClientAiSettings` die client-gelieferte `ollamaUrl` im SaaS
         * und in Community Multi-User. Ohne diesen Rueckfall kam
         * `executeOllamaRequest` ohne Adresse an und warf — jede Korrektur einer
         * Schulinstanz mit Ollama endete im 500, obwohl Ollama erreichbar war.
         */
        it('faellt auf die Env zurueck, wenn der Gate die Adresse entfernt hat', () => {
            process.env.OLLAMA_BASE_URL = 'http://host.docker.internal:11434';
            process.env.OLLAMA_MODEL = 'qwen3.6:35b';

            // Genau die Gestalt, die der Gate hinterlaesst: Modell bleibt, Adresse ist weg.
            expect(requireOllamaConnection({ ollamaModel: undefined, ollamaUrl: undefined })).toEqual({
                baseUrl: 'http://host.docker.internal:11434',
                model: 'qwen3.6:35b'
            });
        });

        it('haelt die Reihenfolge der Env-Alternativen ein', () => {
            process.env.OLLAMA_URL = 'http://zweitwahl.example:11434';
            process.env.OLLAMA_MODEL = 'zweitwahl-model';

            expect(requireOllamaConnection({}).baseUrl).toBe('http://zweitwahl.example:11434');
        });

        /**
         * Ein nackter Error landet auf 500 und ist von einem Absturz nicht zu
         * unterscheiden — so stand es in ollama-logic.ts und so kam es beim
         * Nutzer an. AIConfigError bildet auf 503 ab.
         */
        it('wirft einen AIConfigError statt eines nackten Errors', () => {
            expect(() => requireOllamaConnection({})).toThrow(AIConfigError);
        });

        it('beanstandet ein fehlendes Modell eigenstaendig', () => {
            process.env.OLLAMA_BASE_URL = 'http://env.example:11434';

            expect(() => requireOllamaConnection({})).toThrow(/Modell/);
        });

        /**
         * Im Browser (PURE / Desktop) gibt es diese Variablen nicht und darf es
         * sie nicht geben: Dort bestimmt der Nutzer seine eigene Adresse ueber
         * die Einstellungen, die der Gate bei lokalen Instanzen unangetastet
         * laesst. Ein Env-Rueckfall waere dort bestenfalls wirkungslos.
         */
        it('nutzt die Server-Env NICHT, wenn Code im Browser laeuft', () => {
            process.env.OLLAMA_BASE_URL = 'http://env.example:11434';
            process.env.OLLAMA_MODEL = 'env-model';

            const globals = globalThis as { window?: unknown };
            globals.window = {};
            try {
                expect(() => requireOllamaConnection({})).toThrow(AIConfigError);
            } finally {
                delete globals.window;
            }
        });
    });

    /**
     * Die wiederkehrende Fehlerklasse dieses Projekts ist nicht die falsche
     * Regel, sondern die Regel, die in einer Anbieter-Familie gilt und in der
     * anderen fehlt. Genau so entstand der Ausfall vom 09.09.2026: Der
     * Env-Rueckfall existierte fuer OpenAI und fehlte fuer Ollama.
     */
    describe('Symmetrie der Anbieter-Familien', () => {
        it('beide Familien fallen auf die Server-Env zurueck, wenn der Gate die Adresse entfernt hat', () => {
            process.env.OPENAI_API_BASE = 'https://env.example/v1';
            process.env.OPENAI_API_KEY = 'env-key';
            process.env.OLLAMA_BASE_URL = 'http://env.example:11434';
            process.env.OLLAMA_MODEL = 'env-model';

            expect(requireOpenAiConnection({}).baseUrl).toBe('https://env.example/v1');
            expect(requireOllamaConnection({}).baseUrl).toBe('http://env.example:11434');
        });
    });
});
