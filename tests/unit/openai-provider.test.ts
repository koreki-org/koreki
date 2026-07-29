import { executeOpenAIRequest } from '../../src/lib/ai/openai-provider';
import * as constants from '../../src/lib/ai/constants';

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

        it('should NOT include non-standard fields like chat_template_kwargs in payload body', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, {
                model: MODEL,
                enableThinking: true
            });
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body).not.toHaveProperty('chat_template_kwargs');
            expect(body).not.toHaveProperty('enable_thinking');
        });

        it('should force temperature 0.6 for "correction" when Thinking Mode is active', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeOpenAIRequest('correction', { modelSolution: '', studentText: '' }, URL, API_KEY, {
                model: MODEL,
                enableThinking: true
            });
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.temperature).toBe(0.6);
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
