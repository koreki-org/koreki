import prisma from '@/lib/prisma';
import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { performBillingAction, resolveActiveWorkspace } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { promisePool } from '../../lib/ai/promise-pool';
import { isLocalInstance } from '@/lib/env-context';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

import { withSecurity, AuthenticatedRequest } from '@/lib/security';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method not allowed' });
        }

        const { buffer, buffers: buffersFromReq, mimeType, settings, pageCount, pageRange, isComplex } = req.body;
        let dataBuffer: Buffer[];

        if (buffersFromReq && Array.isArray(buffersFromReq)) {
            dataBuffer = buffersFromReq.map((b: string) => Buffer.from(b, 'base64'));
        } else {
            dataBuffer = [Buffer.from(buffer, 'base64')];
        }

        const { claims } = req.user;
        const logtoId = claims.sub!; // sub is guaranteed if authenticated



        // --- COMPLIANCE EARLY GATEKEEPER ---
        await resolveActiveWorkspace(logtoId);

        let effectivePageCount = Math.max(1, req.body.pageCount || pageCount || 1);
        if (pageRange && Array.isArray(pageRange) && pageRange.length === 2) {
            effectivePageCount = pageRange[1] - pageRange[0] + 1;
        }

        if (dataBuffer.length > 1) {
            effectivePageCount = dataBuffer.length;
        }

        const isScan = req.body.isScan === true;
        const OCR_CREDIT_COST = effectivePageCount * (isScan ? 1 : 0);

        // --- AI Cost Brake Check ---
        if (!isLocalInstance()) {
            const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
            if (systemSettings) {
                const ocrCost = (systemSettings.ocrMonthlyUsage / 1_000_000) * systemSettings.ocrPricePerMillion;
                if (ocrCost >= systemSettings.ocrBudget) {
                    return res.status(429).json({ error: "Aktuell zu hohe Auslastung, bitte versuchen Sie es später erneut." });
                }
            }
        }

        const tryMistral = async (buffers: Buffer[]) => {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            const pageResults = await promisePool(buffers, 1, async (b) => {
                // TODO: DEPRECATED - Mistral Vision / Handwriting is temporarily disabled in favor of Qwen3.6
                // const action = (isComplex && mimeType?.startsWith('image/')) ? 'vision' : 'ocr';
                const action = 'ocr';
                const result = await executeMistralRequest(
                    action,
                    { buffer: b.toString('base64'), mimeType },
                    apiKey,
                    { isScan, model: settings?.model }
                );

                return {
                    content: result.text,
                    promptTokens: result.usage?.prompt_tokens || 0,
                    completionTokens: result.usage?.completion_tokens || 0
                };
            });

            const fullText = pageResults.map(r => r.content).join('\n\n');
            const totalPromptTokens = pageResults.reduce((sum, r) => sum + r.promptTokens, 0);
            const totalCompletionTokens = pageResults.reduce((sum, r) => sum + r.completionTokens, 0);

            return { 
                text: fullText, 
                inputTokens: totalPromptTokens, 
                outputTokens: totalCompletionTokens 
            };
        };

        const tryOpenAI = async (buffers: Buffer[]) => {
            const baseUrl = settings?.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
            const apiKey = settings?.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings?.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';
            
            if (!apiKey) throw new Error('Mittwald/OpenAI API-Key fehlt.');

            const pageResults = await promisePool(buffers, 1, async (b) => {
                const result = await executeOpenAIRequest(
                    'vision',
                    { buffer: b.toString('base64'), mimeType },
                    baseUrl,
                    apiKey,
                    { 
                        model,
                        temperature: settings?.visionTemperature,
                        topP: settings?.visionTopP,
                        maxTokens: settings?.visionMaxTokens,
                        presencePenalty: settings?.visionPresencePenalty
                    }
                );

                return {
                    content: result.text,
                    promptTokens: result.usage?.prompt_tokens || 0,
                    completionTokens: result.usage?.completion_tokens || 0
                };
            });

            const fullText = pageResults.map(r => r.content).join('\n\n');
            const totalPromptTokens = pageResults.reduce((sum, r) => sum + r.promptTokens, 0);
            const totalCompletionTokens = pageResults.reduce((sum, r) => sum + r.completionTokens, 0);

            return { 
                text: fullText, 
                inputTokens: totalPromptTokens, 
                outputTokens: totalCompletionTokens 
            };
        };

        const tryOllama = async (buffers: Buffer[]) => {
            const { executeOllamaRequest } = require('../../lib/ai/ollama-logic');

            const pageResults = await promisePool(buffers, 1, async (b) => {
                const result = await executeOllamaRequest(
                    'vision',
                    { buffer: b.toString('base64'), mimeType },
                    settings
                );

                return {
                    content: result.text,
                    promptTokens: 0,
                    completionTokens: 0
                };
            });

            const fullText = pageResults.map(r => r.content).join('\n\n');

            return { 
                text: fullText, 
                inputTokens: 0, 
                outputTokens: 0 
            };
        };

        // Route to selected AI provider
        let resultData;
        if (settings?.provider === 'ollama') {
            resultData = await tryOllama(dataBuffer);
        } else {
            const useOpenAI = settings?.provider === 'openai-compatible' || isComplex;
            resultData = useOpenAI 
                ? await tryOpenAI(dataBuffer) 
                : await tryMistral(dataBuffer);
        }
        
        // --- ATOMIC BILLING & TRACKING ---
        await performBillingAction({
            logtoId,
            module: 'ocr',
            inputTokens: resultData.inputTokens || (effectivePageCount * 500),
            outputTokens: resultData.outputTokens || (effectivePageCount * 500),
            creditCost: OCR_CREDIT_COST
        });

        return res.status(200).json({ text: resultData.text });
    } catch (error: any) {
        console.error('[API/extract-image] OCR Error:', error);
        const isComplianceError = error.message?.includes('Compliance') || error.message?.includes('AVV');
        const isCreditsError = error.message?.includes('Credits');
        const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit');
        
        let statusCode = 500;
        if (isCreditsError) statusCode = 402;
        else if (isComplianceError) statusCode = 403;
        else if (isRateLimit) statusCode = 429;

        res.status(statusCode).json({ 
            error: error.message || 'Fehler bei der Bilderkennung (OCR).' 
        });
    }
});
