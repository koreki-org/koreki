import { executeMistralRequest } from '../../src/lib/ai/mistral-provider';
import { AIProviderError } from '../../src/lib/ai/provider-error';
import * as constants from '../../src/lib/ai/constants';

// Mock fetchWithRetry to avoid real API calls
jest.mock('../../src/lib/ai/constants', () => ({
    ...jest.requireActual('../../src/lib/ai/constants'),
    fetchWithRetry: jest.fn()
}));

const mockFetchWithRetry = constants.fetchWithRetry as jest.Mock;

describe('Mistral Provider (Bridge) - Unit Tests', () => {
    const API_KEY = 'MOCK_API_KEY_123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executeMistralRequest - Model Mapping', () => {
        it('should map "correction" to MISTRAL_MEDIUM_MODEL', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeMistralRequest('correction', { modelSolution: '', studentText: '' }, API_KEY);
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.model).toBe(constants.MISTRAL_MEDIUM_MODEL);
        });

        it('should map "clean-and-analyze" to MISTRAL_MEDIUM_MODEL', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeMistralRequest('clean-and-analyze', { modelSolution: '' }, API_KEY);
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.model).toBe(constants.MISTRAL_MEDIUM_MODEL);
        });

        it('should map "vision" to MISTRAL_CHATS_MODEL', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: 'Vision Result' } }] })
            });

            await executeMistralRequest('vision', { buffer: 'b64', mimeType: 'image/jpeg' }, API_KEY);
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.model).toBe(constants.MISTRAL_CHATS_MODEL);
        });

        it('should map "second-opinion" to MISTRAL_CORE_MODEL', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeMistralRequest('second-opinion', { taskName: 'T' }, API_KEY);
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.model).toBe(constants.MISTRAL_CORE_MODEL);
        });
    });

    describe('executeMistralRequest - Prompt Construction', () => {
        it('should construct a vision prompt with image_url', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: 'Vision Result' } }] })
            });

            await executeMistralRequest('vision', { buffer: 'BUF123', mimeType: 'image/png' }, API_KEY);
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            
            // Aligned with Mistral Chat behavior: System role for instructions, User for media
            expect(body.messages[0].role).toBe('system');
            
            const userMessage = body.messages[1];
            expect(userMessage.role).toBe('user');
            expect(userMessage.content[0].type).toBe('text');
            expect(userMessage.content[1].type).toBe('image_url');
            expect(userMessage.content[1].image_url.url).toContain('data:image/png;base64,BUF123');
        });

        it('should include customPrompt if provided in options', async () => {
             mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeMistralRequest('correction', { modelSolution: 'A', studentText: 'B' }, API_KEY, {
                customPrompt: 'SEI_STRENG'
            });
            
            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body.messages[0].content).toContain('SEI_STRENG');
        });
    });

    describe('executeMistralRequest - JSON Sanitization', () => {
        it('should extract JSON from markdown code blocks', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    choices: [{ message: { content: 'Hier ist das Ergebnis:\n```json\n{"score": 10}\n```' } }],
                    usage: { total_tokens: 100 }
                })
            });

            const res = await executeMistralRequest('correction', { modelSolution: '', studentText: '' }, API_KEY);
            expect(res.score).toBe(10);
            expect(res.usage.total_tokens).toBe(100);
        });

        it('should throw error on invalid JSON', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: 'Kein JSOn hier.' } }] })
            });

            await expect(executeMistralRequest('correction', { modelSolution: '', studentText: '' }, API_KEY))
                .rejects.toThrow('KI-Antwort konnte nicht als JSON verarbeitet werden.');
        });
    });

    describe('executeMistralRequest - Error Handling', () => {
        // Der Upstream-Status muss den Wurf ueberleben: Frueher steckte er nur als
        // Text im Error ("Kritischer API-Fehler (401)."), womit die API-Routen ihn
        // nicht mehr auswerten konnten und jeden Anbieter-Fehler zu einem 500 machten.
        it('bewahrt den Upstream-Status als AIProviderError bei non-ok response', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: { message: 'Unauthorized Access' } })
            });

            const promise = executeMistralRequest('correction', { modelSolution: '', studentText: '' }, API_KEY);
            await expect(promise).rejects.toBeInstanceOf(AIProviderError);
            await expect(promise).rejects.toMatchObject({
                upstreamStatus: 401,
                upstreamDetail: 'Unauthorized Access'
            });
        });
    });

    describe('executeMistralRequest - Payload Strictness & Schema Integrity', () => {
        it('should NOT contain unsupported OpenAI fields like "reasoning_effort" in payload body', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{}' } }] })
            });

            await executeMistralRequest('correction', { modelSolution: 'A', studentText: 'B' }, API_KEY, {
                enableThinking: true
            });

            const body = JSON.parse(mockFetchWithRetry.mock.calls[0][1].body);
            expect(body).not.toHaveProperty('reasoning_effort');
            expect(body).toHaveProperty('model');
            expect(body).toHaveProperty('messages');
            expect(body).toHaveProperty('max_tokens');
        });

        it('should use valid official Mistral model identifiers', () => {
            const validModelRegex = /^mistral-(large|medium|small|ocr|embed|chats)-latest$|^pixtral-/;
            expect(constants.MISTRAL_CORE_MODEL).toMatch(validModelRegex);
            expect(constants.MISTRAL_MEDIUM_MODEL).toMatch(validModelRegex);
            expect(constants.MISTRAL_UTILS_MODEL).toMatch(validModelRegex);
            expect(constants.MISTRAL_OCR_MODEL).toMatch(validModelRegex);
            expect(constants.MISTRAL_MEDIUM_MODEL).not.toContain('2604');
        });
    });

    describe('handleOCRRequest (OCR Action)', () => {
        it('should use the /v1/ocr endpoint', async () => {
            mockFetchWithRetry.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    pages: [{ markdown: 'Page Content' }],
                    usage: { total_tokens: 50 }
                })
            });

            const res = await executeMistralRequest('ocr', { buffer: 'BUF', mimeType: 'application/pdf' }, API_KEY);
            
            expect(mockFetchWithRetry).toHaveBeenCalledWith('https://api.mistral.ai/v1/ocr', expect.anything());
            expect(res.text).toBe('Page Content');
        });
    });
});
