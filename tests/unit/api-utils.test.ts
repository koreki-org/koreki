/**
 * Unit Tests for fetchWithRetry (Industrial Grade)
 * 
 * Tests the hardened retry logic in src/lib/ai/constants.ts:
 * - Retry-After header support
 * - Jitter (non-deterministic delays)
 * - Response body consumption before retry
 * - Exponential backoff for 429 and 5xx
 */
import { fetchWithRetry } from '../../src/lib/ai/constants';

// Helper: Create a mock Response with optional headers
function mockResponse(status: number, headers: Record<string, string> = {}, body: string = ''): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: new Headers(headers),
        text: jest.fn().mockResolvedValue(body),
        json: jest.fn().mockResolvedValue({}),
    } as unknown as Response;
}

describe('fetchWithRetry (Industrial Hardened)', () => {

    beforeEach(() => {
        global.fetch = jest.fn();
        jest.spyOn(Math, 'random').mockReturnValue(0.5); // Neutralize jitter for deterministic tests
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return response immediately on 200', async () => {
        const res200 = mockResponse(200);
        (global.fetch as jest.Mock).mockResolvedValueOnce(res200);

        const res = await fetchWithRetry('https://api.test', {});
        expect(res.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 and eventually succeed', async () => {
        const res429 = mockResponse(429);
        const res200 = mockResponse(200);

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce(res429)
            .mockResolvedValueOnce(res200);

        const res = await fetchWithRetry('https://api.test', {}, 2, 10);
        expect(res.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx and eventually succeed', async () => {
        const res503 = mockResponse(503);
        const res200 = mockResponse(200);

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce(res503)
            .mockResolvedValueOnce(res200);

        const res = await fetchWithRetry('https://api.test', {}, 2, 10);
        expect(res.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return error response after exhausting retries', async () => {
        const res429 = mockResponse(429);
        (global.fetch as jest.Mock).mockResolvedValue(res429);

        const res = await fetchWithRetry('https://api.test', {}, 1, 10);
        expect(res.status).toBe(429);
        // 1 initial + 1 retry = 2 calls
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should consume response body before retrying (connection leak prevention)', async () => {
        const res429 = mockResponse(429, {}, 'rate limited');
        const res200 = mockResponse(200);

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce(res429)
            .mockResolvedValueOnce(res200);

        await fetchWithRetry('https://api.test', {}, 2, 10);
        
        // The 429 response's body should have been consumed
        expect(res429.text).toHaveBeenCalledTimes(1);
    });

    it('should respect Retry-After header from Mistral', async () => {
        // Mistral sends Retry-After: 1 (seconds)
        const res429 = mockResponse(429, { 'Retry-After': '1' });
        const res200 = mockResponse(200);

        (global.fetch as jest.Mock)
            .mockResolvedValueOnce(res429)
            .mockResolvedValueOnce(res200);

        const start = Date.now();
        await fetchWithRetry('https://api.test', {}, 2, 10);
        const elapsed = Date.now() - start;

        // With Retry-After: 1 and jitter neutralized (random=0.5 → 0% jitter),
        // the delay should be ~1000ms. We allow margin for test execution.
        expect(elapsed).toBeGreaterThanOrEqual(800);
        expect(elapsed).toBeLessThan(3000);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx errors other than 429', async () => {
        const res400 = mockResponse(400);
        (global.fetch as jest.Mock).mockResolvedValueOnce(res400);

        const res = await fetchWithRetry('https://api.test', {}, 3, 10);
        expect(res.status).toBe(400);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
        const res401 = mockResponse(401);
        (global.fetch as jest.Mock).mockResolvedValue(res401);

        const res = await fetchWithRetry('https://api.test', {}, 3, 10);
        expect(res.status).toBe(401);
    });
});
