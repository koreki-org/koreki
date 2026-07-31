import { executeMistralRequest } from './mistral-provider';
import { executeOllamaRequest } from './ollama-logic';
import { executeOpenAIRequest } from './openai-provider';
import { promisePool } from './promise-pool';
import { AppSettings } from '../../types';
import { isLocalInstance } from '../env-context';
import { logger } from '../logger';

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
    isComplex?: boolean,
    signal?: AbortSignal
): Promise<string> {
    const buffers = Array.isArray(bufferOrBuffers) ? bufferOrBuffers : [bufferOrBuffers];

    if (appMode === 'PURE') {
        const mistralKey = settings?.mistralKey;
        const openaiKey = settings?.openaiKey;

        if (settings?.provider === 'openai-compatible') {
            if (!openaiKey) throw new Error("OPENAI_KEY_MISSING");
        } else if (settings?.provider !== 'ollama') {
            if (!mistralKey) throw new Error("PURE_KEY_MISSING");
        }

        const pageResults = await promisePool(buffers, 1, async (b64, idx) => {
            if (idx > 0) {
                await new Promise(r => setTimeout(r, 1000));
            }
            if (settings?.provider === 'ollama') {
                const data = await executeOllamaRequest(
                    'vision',
                    { buffer: b64, mimeType },
                    settings,
                    signal
                );
                return data.text;
            } else if (settings?.provider === 'openai-compatible') {
                const baseUrl = settings.openaiUrl || '';
                const apiKey = settings.openaiKey || '';
                const model = settings.openaiModel || 'Qwen3.6-35B-A3B-FP8';
                const data = await executeOpenAIRequest(
                    'vision',
                    { buffer: b64, mimeType },
                    baseUrl,
                    apiKey,
                    {
                        model,
                        temperature: settings?.visionTemperature,
                        topP: settings?.visionTopP,
                        maxTokens: settings?.visionMaxTokens,
                        presencePenalty: settings?.visionPresencePenalty,
                        signal
                    }
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
                    { isScan, model: settings.model, signal }
                );
                return data.text;
            }
        });

        const fullText = pageResults.join('\n\n');

        // Billing for PURE mode (Ping only, no data) - Skipped on Local/Desktop to prevent Network/CSP errors
        if (!isLocalInstance()) {
            await fetch('/api/billing/pure-deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageCount: buffers.length,
                    action: 'ocr',
                    isScan: isScan
                })
            }).catch(e => logger.error("Billing ping failed", e));
        }

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
            }),
            signal
        });
        const extractData = await res.json();
        if (!res.ok) throw new Error(extractData.error || 'Fehler bei der OCR-Bilderkennung');
        return extractData.text;
    }
}
