import { GlobalSettingsService } from '../../src/lib/services/global-settings-service';
import globalAiSettingsHandler from '../../src/pages/api/admin/global-ai-settings';
import fs from 'fs';

// Mock Security & Env Context
jest.mock('../../src/lib/security', () => ({
    // Spiegelt den Claims-Aufbau aus withSecurity: Rollen sind ein Array
    // (aus dem verifizierten Keycloak-Token bzw. dem lokalen Trust-Modell).
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = req.user || { claims: { sub: 'admin-id', roles: ['ADMIN'] } };
        return handler(req, res);
    }
}));

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn(() => true)
}));

jest.mock('fs', () => {
    const actualFs = jest.requireActual('fs');
    return {
        ...actualFs,
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        // Schreibvorgänge laufen atomar über Temp-Datei + Umbenennen.
        renameSync: jest.fn()
    };
});

/** Nutzlast des letzten Schreibvorgangs — unabhängig vom konkreten Zielpfad. */
const lastWrittenPayload = () => {
    const calls = (fs.writeFileSync as jest.Mock).mock.calls;
    return JSON.parse(calls[calls.length - 1][1]);
};

describe('Global AI Settings Sync Unit & API Verification (Layer 1 & 2)', () => {
    let res: any;
    let envSnapshot: NodeJS.ProcessEnv;

    beforeEach(() => {
        jest.clearAllMocks();
        // Wiederherstellung über afterEach statt über manuelles delete am Testende:
        // Letzteres läuft nicht mehr, sobald eine Assertion vorher wirft, und leckt
        // dann in die Folgetests.
        envSnapshot = { ...process.env };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
    });

    afterEach(() => {
        process.env = envSnapshot;
    });

        it('should return env fallbacks when no settings file exists yet', async () => {
            // getSettings() liest die Fallbacks ALLER Provider aus der Umgebung, nicht
            // nur die hier gesetzten. Ohne explizites Leeren hing das Ergebnis von der
            // lokalen .env.local ab (die OPENAI_API_BASE/OPENAI_API_MODEL setzt) — der
            // Test war damit maschinenabhängig: grün in CI, rot auf Entwicklerrechnern.
            for (const key of ['OPENAI_API_BASE', 'OPENAI_API_URL', 'OPENAI_API_MODEL', 'OPENAI_MODEL', 'DEFAULT_PROVIDER']) {
                delete process.env[key];
            }

            process.env.DEFAULT_AI_PROVIDER = 'ollama';
            process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
            process.env.OLLAMA_MODEL = 'qwen3.6:35b';

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const settings = await GlobalSettingsService.getSettings();

            expect(settings).toEqual({
                provider: 'ollama',
                ollamaUrl: 'http://127.0.0.1:11434',
                ollamaModel: 'qwen3.6:35b'
            });
        });

        it('should correctly merge and persist settings without corrupting existing fields', async () => {
            const initialData = { provider: 'mistral' };
            const newData = { provider: 'ollama', ollamaUrl: 'http://127.0.0.1:11434', ollamaModel: 'qwen3.6:35b' };

            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(initialData));

            const updated = await GlobalSettingsService.updateSettings(newData);

            expect(updated).toEqual({
                provider: 'ollama',
                ollamaUrl: 'http://127.0.0.1:11434',
                ollamaModel: 'qwen3.6:35b'
            });
            expect(lastWrittenPayload()).toEqual({
                provider: 'ollama',
                ollamaUrl: 'http://127.0.0.1:11434',
                ollamaModel: 'qwen3.6:35b'
            });
        });

    describe('GET /api/admin/global-ai-settings', () => {
        it('should return stored global settings for local instance admin', async () => {
            const stored = { provider: 'ollama', ollamaModel: 'qwen3.6:35b' };
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(stored));

            const req: any = { method: 'GET', user: { claims: { sub: 'admin', roles: ['ADMIN'] } } };
            await globalAiSettingsHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(stored);
        });
    });

    describe('POST /api/admin/global-ai-settings', () => {
        it('should persist safe routing fields and ignore undefined ones', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const req: any = {
                method: 'POST',
                user: { claims: { sub: 'admin', roles: ['ADMIN'] } },
                body: {
                    provider: 'ollama',
                    ollamaUrl: 'http://127.0.0.1:11434',
                    ollamaModel: 'qwen3.6:35b',
                    mistralKey: 'SECRET_KEY_SHOULD_BE_IGNORED'
                }
            };

            await globalAiSettingsHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(fs.writeFileSync).toHaveBeenCalled();

            const writtenJson = lastWrittenPayload();
            expect(writtenJson.provider).toBe('ollama');
            expect(writtenJson.ollamaUrl).toBe('http://127.0.0.1:11434');
            expect(writtenJson.ollamaModel).toBe('qwen3.6:35b');
            expect(writtenJson.mistralKey).toBeUndefined();
        });
    });
});
