import prisma from '@/lib/prisma';
import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { performBillingAction, resolveActiveWorkspace } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { promisePool } from '../../lib/ai/promise-pool';

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
        const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
        if (systemSettings) {
            const ocrCost = (systemSettings.ocrMonthlyUsage / 1_000_000) * systemSettings.ocrPricePerMillion;
            if (ocrCost >= systemSettings.ocrBudget) {
                return res.status(429).json({ error: "Aktuell zu hohe Auslastung, bitte versuchen Sie es später erneut." });
            }
        }

        const tryMistral = async (buffers: Buffer[]) => {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            const pageResults = await promisePool(buffers, 1, async (b) => {
                const action = (isComplex && mimeType?.startsWith('image/')) ? 'vision' : 'ocr';
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
            const baseUrl = settings?.openaiUrl || 'https://llm.aihosting.mittwald.de/v1';
            const apiKey = settings?.openaiKey || process.env.MITTWALD_API_KEY;
            const model = settings?.openaiModel || 'Qwen3.6-35B-A3B-FP8';
            
            if (!apiKey) throw new Error('Mittwald/OpenAI API-Key fehlt.');

            const pageResults = await promisePool(buffers, 1, async (b) => {
                const result = await executeOpenAIRequest(
                    'vision',
                    { buffer: b.toString('base64'), mimeType },
                    baseUrl,
                    apiKey,
                    { model }
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

        const resultData = settings?.provider === 'openai-compatible' 
            ? await tryOpenAI(dataBuffer) 
            : await tryMistral(dataBuffer);
        
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
