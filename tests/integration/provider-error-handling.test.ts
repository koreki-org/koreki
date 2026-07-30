import { fetchWithRetry } from '../../src/lib/ai/constants';
import { executeMistralRequest } from '../../src/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../src/lib/ai/openai-provider';
import { apiClient } from '../../src/lib/api-client';

jest.mock('../../src/lib/api-client', () => ({
    apiClient: {
        fetch: jest.fn()
    }
}));

// Mock env-context
jest.mock('../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false)
}));

const mockApiFetch = apiClient.fetch as jest.Mock;

describe('Provider Error Handling & Resiliency - Layer 2 Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchWithRetry - HTTP Status Codes', () => {
        it('should retry on HTTP 429 (Rate Limit) and eventually succeed', async () => {
            const rateLimitResponse = {
                status: 429,
                headers: new Headers({ 'Retry-After': '0.01' }),
                text: jest.fn().mockResolvedValue('Rate limited')
            };

            const successResponse = {
                status: 200,
                ok: true,
                json: async () => ({ choices: [{ message: { content: '{"status": "ok"}' } }] })
            };

            mockApiFetch
                .mockResolvedValueOnce(rateLimitResponse)
                .mockResolvedValueOnce(successResponse);

            const response = await fetchWithRetry('https://api.mistral.ai/v1/chat/completions', {}, 2, 10);
            expect(mockApiFetch).toHaveBeenCalledTimes(2);
            expect(response.status).toBe(200);
        });

        it('should retry on HTTP 500 (Server Error) and return response when retries exhaust', async () => {
            const serverErrorResponse = {
                status: 500,
                headers: new Headers(),
                text: jest.fn().mockResolvedValue('Internal Server Error')
            };

            mockApiFetch.mockResolvedValue(serverErrorResponse);

            const response = await fetchWithRetry('https://api.mistral.ai/v1/chat/completions', {}, 1, 10);
            expect(mockApiFetch).toHaveBeenCalledTimes(2); // Initial call + 1 retry
            expect(response.status).toBe(500);
        });
    });

    describe('executeMistralRequest - Error Response Graceful Handling', () => {
        it('should handle HTTP 401 Unauthorized gracefully without breaking application runtime', async () => {
            const unauthorizedResponse = {
                ok: false,
                status: 401,
                headers: new Headers(),
                text: async () => 'Unauthorized: Invalid API Key'
            };

            mockApiFetch.mockResolvedValueOnce(unauthorizedResponse);

            await expect(executeMistralRequest('correction', { modelSolution: 'A', studentText: 'B' }, 'INVALID_KEY'))
                .rejects.toThrow();
        });
    });

    describe('executeOpenAIRequest - Error Response Graceful Handling', () => {
        it('should handle HTTP 401 Unauthorized gracefully without breaking application runtime', async () => {
            const unauthorizedResponse = {
                ok: false,
                status: 401,
                headers: new Headers(),
                text: async () => 'Invalid API key provided'
            };

            mockApiFetch.mockResolvedValueOnce(unauthorizedResponse);

            await expect(executeOpenAIRequest('correction', { modelSolution: 'A', studentText: 'B' }, 'https://api.openai.com/v1', 'INVALID_KEY'))
                .rejects.toThrow();
        });
    });
});
