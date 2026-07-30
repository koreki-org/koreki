import { calculateUserCost, formatEuro } from '../../../src/lib/billing-logic';
import { fetchWithRetry } from '../../../src/lib/api-utils';
import { DbUser, AppSettings } from '../../../src/types';

describe('Billing & API Utils Quick-Wins - Unit Verification', () => {
    describe('billing-logic.ts (calculateUserCost & formatEuro)', () => {
        it('should correctly calculate OCR, KI, and total costs based on million-token rates', () => {
            const mockUser: DbUser = {
                id: 'usr-1',
                ocrInputTokens: 2_000_000,
                ocrOutputTokens: 1_000_000,
                correctionInputTokens: 5_000_000,
                correctionOutputTokens: 2_000_000
            } as any;

            const mockSettings: AppSettings = {
                ocrInputCostPerMillion: 1.50,
                ocrOutputCostPerMillion: 5.00,
                correctionInputCostPerMillion: 2.00,
                correctionOutputCostPerMillion: 10.00
            } as any;

            const costResult = calculateUserCost(mockUser, mockSettings);

            // OCR Input: 2M * 1.50 = 3.00, Output: 1M * 5.00 = 5.00 -> OCR Total = 8.00
            expect(costResult.ocrInput).toBe(3.00);
            expect(costResult.ocrOutput).toBe(5.00);
            expect(costResult.ocr).toBe(8.00);

            // KI Input: 5M * 2.00 = 10.00, Output: 2M * 10.00 = 20.00 -> KI Total = 30.00
            expect(costResult.kiInput).toBe(10.00);
            expect(costResult.kiOutput).toBe(20.00);
            expect(costResult.ki).toBe(30.00);

            // Total: 8.00 + 30.00 = 38.00
            expect(costResult.total).toBe(38.00);
            expect(costResult.tokens.ocr).toBe(3_000_000);
            expect(costResult.tokens.ki).toBe(7_000_000);
        });

        it('should format numbers as Euro currency using German locale', () => {
            const formatted = formatEuro(12.3456);
            expect(formatted).toContain('12,3456');
            expect(formatted).toContain('€');
        });
    });

    describe('api-utils.ts (fetchWithRetry)', () => {
        beforeEach(() => {
            global.fetch = jest.fn();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return response immediately on 200 OK', async () => {
            const mock200 = { status: 200, ok: true } as Response;
            (global.fetch as jest.Mock).mockResolvedValueOnce(mock200);

            const response = await fetchWithRetry('https://api.koreki.org/test', {}, 1, 10);
            expect(response.status).toBe(200);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should retry on transient HTTP 429 errors and succeed', async () => {
            const mock429 = { status: 429, ok: false } as Response;
            const mock200 = { status: 200, ok: true } as Response;

            (global.fetch as jest.Mock)
                .mockResolvedValueOnce(mock429)
                .mockResolvedValueOnce(mock200);

            const response = await fetchWithRetry('https://api.koreki.org/test', {}, 2, 10);
            expect(response.status).toBe(200);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should throw error when max retries are exceeded on network failure', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Reset'));

            await expect(
                fetchWithRetry('https://api.koreki.org/test', {}, 1, 10)
            ).rejects.toThrow('Network Reset');
        });
    });
});
