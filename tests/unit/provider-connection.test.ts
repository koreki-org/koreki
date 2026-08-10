import {
    DEFAULT_OPENAI_COMPATIBLE_MODEL,
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
        'OPENAI_MODEL'
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
});
