import { DbUser, AppSettings } from '../types';

/**
 * Calculates the total cost for a user based on their token usage and current global settings.
 * Handles both legacy pauschal pricing and industrial split pricing.
 */
export const calculateUserCost = (user: DbUser, settings: AppSettings) => {
    // OCR Calculation (Industrial Only)
    const ocrInputPrice = settings.ocrInputCostPerMillion || 0;
    const ocrOutputPrice = settings.ocrOutputCostPerMillion || 0;

    const ocrInputCost = (user.ocrInputTokens / 1_000_000) * ocrInputPrice;
    const ocrOutputCost = (user.ocrOutputTokens / 1_000_000) * ocrOutputPrice;
    const ocrTotalCost = ocrInputCost + ocrOutputCost;

    // KI (Correction) Calculation (Industrial Only)
    const kiInputPrice = settings.correctionInputCostPerMillion || 0;
    const kiOutputPrice = settings.correctionOutputCostPerMillion || 0;

    const kiInputCost = (user.correctionInputTokens / 1_000_000) * kiInputPrice;
    const kiOutputCost = (user.correctionOutputTokens / 1_000_000) * kiOutputPrice;
    const kiTotalCost = kiInputCost + kiOutputCost;

    return {
        ocr: ocrTotalCost,
        ocrInput: ocrInputCost,
        ocrOutput: ocrOutputCost,
        ki: kiTotalCost,
        kiInput: kiInputCost,
        kiOutput: kiOutputCost,
        total: ocrTotalCost + kiTotalCost,
        tokens: {
            ocr: user.ocrInputTokens + user.ocrOutputTokens,
            ocrIn: user.ocrInputTokens,
            ocrOut: user.ocrOutputTokens,
            ki: user.correctionInputTokens + user.correctionOutputTokens,
            kiIn: user.correctionInputTokens,
            kiOut: user.correctionOutputTokens
        }
    };
};



/**
 * Formats a number as Euro currency.
 */
export const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    }).format(amount);
};
