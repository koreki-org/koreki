import { calculateUserCost, formatEuro } from '../../src/lib/billing-logic';
import { AppSettings, DbUser } from '../../src/types';

describe('Industrial Billing Logic (Layer 1)', () => {
    const mockSettings: AppSettings = {
        ocrInputCostPerMillion: 0.10, // 0.10€ / 1M
        ocrOutputCostPerMillion: 0.50, // 0.50€ / 1M
        correctionInputCostPerMillion: 0.20,
        correctionOutputCostPerMillion: 1.00,
        ocrBudget: 10,
        correctionBudget: 50,
        mistralKey: '',
    };

    const mockUser: DbUser = {
        id: 'user-1',
        username: 'test@koreki.org',
        email: 'test@koreki.org',
        role: 'USER',
        hasProAccess: false,
        credits: 0,
        totalCreditsPurchased: 0,
        ocrInputTokens: 1_000_000, // 1M tokens
        ocrOutputTokens: 2_000_000, // 2M tokens
        correctionInputTokens: 500_000,
        correctionOutputTokens: 500_000,
        appMode: 'STANDARD',
        avvAccepted: false,
        createdAt: new Date().toISOString(),
        memberships: [],
    };

    describe('calculateUserCost', () => {
        it('should calculate precise OCR costs with split pricing', () => {
            const result = calculateUserCost(mockUser, mockSettings);
            
            // OCR: (1M * 0.10) + (2M * 0.50) = 0.10 + 1.00 = 1.10€
            expect(result.ocr).toBeCloseTo(1.10);
            expect(result.ocrInput).toBeCloseTo(0.10);
            expect(result.ocrOutput).toBeCloseTo(1.00);
        });

        it('should calculate precise KI costs with split pricing', () => {
            const result = calculateUserCost(mockUser, mockSettings);
            
            // KI: (0.5M * 0.20) + (0.5M * 1.00) = 0.10 + 0.50 = 0.60€
            expect(result.ki).toBeCloseTo(0.60);
            expect(result.kiInput).toBeCloseTo(0.10);
            expect(result.kiOutput).toBeCloseTo(0.50);
        });

        it('should return total tokens correctly', () => {
            const result = calculateUserCost(mockUser, mockSettings);
            expect(result.tokens.ocr).toBe(3_000_000);
            expect(result.tokens.ki).toBe(1_000_000);
        });

        it('should handle zero prices correctly', () => {
            const zeroSettings = { ...mockSettings, ocrInputCostPerMillion: 0, ocrOutputCostPerMillion: 0 };
            const result = calculateUserCost(mockUser, zeroSettings);
            expect(result.ocr).toBe(0);
        });
    });

    describe('formatEuro', () => {
        it('should format numbers as currency correctly', () => {
            expect(formatEuro(1.10)).toBe('1,10\u00a0€'); // Non-breaking space
            expect(formatEuro(0)).toBe('0,00\u00a0€');
        });
    });
});
