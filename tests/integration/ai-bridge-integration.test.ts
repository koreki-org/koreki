import { performAIRequest } from '../../src/lib/ai/ai-orchestrator';
import * as mistralProvider from '../../src/lib/ai/mistral-provider';
import * as openaiProvider from '../../src/lib/ai/openai-provider';

// Mock the providers
jest.mock('../../src/lib/ai/mistral-provider', () => ({
    executeMistralRequest: jest.fn()
}));
jest.mock('../../src/lib/ai/openai-provider', () => ({
    executeOpenAIRequest: jest.fn()
}));

const mockExecuteMistralRequest = mistralProvider.executeMistralRequest as jest.Mock;
const mockExecuteOpenAIRequest = openaiProvider.executeOpenAIRequest as jest.Mock;

describe('AI Bridge - Layer 2 Integration Tests', () => {
    const API_KEY = 'MOCK_API_KEY_123';
    
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    describe('performAIRequest - PURE Mode (Mistral)', () => {
        it('should call Mistral Bridge and ping billing', async () => {
            mockExecuteMistralRequest.mockResolvedValueOnce({ 
                tasks: [],
                usage: { total_tokens: 100 } 
            });

            // Mock billing ping
            (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

            const payload = { modelSolution: 'A', studentText: 'B', pageCount: 1 };
            const result = await performAIRequest('correction', payload, 'PURE', { provider: 'mistral', mistralKey: API_KEY });

            expect(mockExecuteMistralRequest).toHaveBeenCalled();
            expect(result).toHaveProperty('overallMatchPercentage');
        });
    });

    describe('performAIRequest - PURE Mode (OpenAI-Compatible)', () => {
        it('should call OpenAI Bridge with custom config', async () => {
            mockExecuteOpenAIRequest.mockResolvedValueOnce({ 
                tasks: [],
                usage: { total_tokens: 200 } 
            });

            (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

            const settings = { 
                provider: 'openai-compatible' as const, 
                mistralKey: '',
                openaiUrl: 'https://custom.api', 
                openaiKey: 'CUSTOM_KEY',
                openaiModel: 'qwen-3.6-reasoning',
                enableThinking: true
            };

            const payload = { modelSolution: 'A', studentText: 'B', pageCount: 1 };
            await performAIRequest('correction', payload, 'PURE', settings);

            expect(mockExecuteOpenAIRequest).toHaveBeenCalledWith(
                'correction',
                payload,
                'https://custom.api',
                'CUSTOM_KEY',
                expect.objectContaining({ 
                    model: 'qwen-3.6-reasoning',
                    enableThinking: true 
                })
            );
        });
    });

    describe('performAIRequest - PURE Mode (Ollama)', () => {
        // ... Ollama logic is usually tested elsewhere or uses global.fetch/tauri-invoke
    });

    describe('performAIRequest - STANDARD Mode (Fallback)', () => {
        it('should call backend endpoint instead of Bridge', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ status: 'success' })
            });

            const payload = { modelSolution: 'A', studentText: 'B' };
            const result = await performAIRequest('correction', payload, 'STANDARD', { provider: 'mistral', mistralKey: '' });

            expect(mockExecuteMistralRequest).not.toHaveBeenCalled();
            expect(mockExecuteOpenAIRequest).not.toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/api/ai-correct', expect.objectContaining({ method: 'POST' }));
            expect(result).toEqual({ status: 'success' });
        });
    });
});
