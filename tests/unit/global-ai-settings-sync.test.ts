import { GlobalSettingsService } from '../../src/lib/services/global-settings-service';
import globalAiSettingsHandler from '../../src/pages/api/admin/global-ai-settings';
import fs from 'fs';

// Mock Security & Env Context
jest.mock('../../src/lib/security', () => ({
    withSecurity: (handler: any) => async (req: any, res: any) => {
        req.user = req.user || { claims: { sub: 'admin-id', role: 'ADMIN' } };
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
        writeFileSync: jest.fn()
    };
});

describe('Global AI Settings Sync Unit & API Verification (Layer 1 & 2)', () => {
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
    });

    describe('GlobalSettingsService', () => {
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
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.any(String),
                JSON.stringify({
                    provider: 'ollama',
                    ollamaUrl: 'http://127.0.0.1:11434',
                    ollamaModel: 'qwen3.6:35b'
                }, null, 2)
            );
        });
    });

    describe('GET /api/admin/global-ai-settings', () => {
        it('should return stored global settings for local instance admin', async () => {
            const stored = { provider: 'ollama', ollamaModel: 'qwen3.6:35b' };
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(stored));

            const req: any = { method: 'GET', user: { claims: { sub: 'admin', role: 'ADMIN' } } };
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
                user: { claims: { sub: 'admin', role: 'ADMIN' } },
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

            const writtenJson = JSON.parse((fs.writeFileSync as jest.Mock).mock.calls[0][1]);
            expect(writtenJson.provider).toBe('ollama');
            expect(writtenJson.ollamaUrl).toBe('http://127.0.0.1:11434');
            expect(writtenJson.ollamaModel).toBe('qwen3.6:35b');
            expect(writtenJson.mistralKey).toBeUndefined();
        });
    });
});
