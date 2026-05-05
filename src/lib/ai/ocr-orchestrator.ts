import { executeMistralRequest } from './mistral-provider';
import { executeOllamaRequest } from './ollama-logic';
import { promisePool } from './promise-pool';
import { AppSettings } from '../../types';

/**
 * Orchestrates OCR requests, choosing between direct Mistral API (PURE) or Koreki Backend (STANDARD).
 * Industrial Parallel Architecture (Tier-1 Safe Concurrency: 2)
 */
export async function performOCRRequest(
    bufferOrBuffers: string | string[],
    mimeType: string,
    isRedacted: boolean,
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
    settings: AppSettings,
    isScan: boolean = false,
    pageCount?: number,
    isComplex?: boolean 
): Promise<string> {
    const buffers = Array.isArray(bufferOrBuffers) ? bufferOrBuffers : [bufferOrBuffers];

    if (appMode === 'PURE') {
        const mistralKey = settings?.mistralKey;
        if (!mistralKey && settings?.provider !== 'ollama') throw new Error("PURE_KEY_MISSING");

        const pageResults = await promisePool(buffers, 1, async (b64) => {
            if (settings?.provider === 'ollama') {
                const data = await executeOllamaRequest(
                    'vision',
                    { buffer: b64, mimeType },
                    settings
                );
                return data.text;
            } else {
                // INDUSTRIAL SIDING: Use Vision if isComplex is forced or Large model is selected
                const forceComplex = isComplex === true;
                const isLargeModel = settings.model?.toLowerCase().includes('large');
                const action = (forceComplex || isLargeModel) ? 'vision' : 'ocr';
                
                // If isComplex is explicitly false, force 'ocr' action
                const finalAction = isComplex === false ? 'ocr' : action;

                const data = await executeMistralRequest(
                    finalAction, 
                    { buffer: b64, mimeType }, 
                    mistralKey, 
                    { isScan, model: settings.model }
                );
                return data.text;
            }
        });

        const fullText = pageResults.join('\n\n');

        // Billing for PURE mode (Ping only, no data)
        await fetch('/api/billing/pure-deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pageCount: buffers.length,
                action: 'ocr',
                isScan: isScan
            })
        });

        return fullText;
    } else {
        const res = await fetch('/api/extract-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                buffers,
                mimeType,
                settings,
                isScan,
                isComplex: isComplex ?? true, // Default to true (Aggressive/Large Vision) for SaaS legacy compatibility
                pageCount
            })
        });
        const extractData = await res.json();
        if (!res.ok) throw new Error(extractData.error || 'Fehler bei der OCR-Bilderkennung');
        return extractData.text;
    }
}
