import type { NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { performBillingAction, resolveActiveWorkspace } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '@/lib/ai/constants';

import { withSecurity, AuthenticatedRequest } from '@/lib/security';

const cleanAndMapSchema = z.object({
    text: z.string().min(1, 'Text fehlt.'),
    settings: z.object({
        provider: z.enum(['mistral', 'ollama', 'openai-compatible']),
        mistralKey: z.string().optional(),
        openaiUrl: z.string().optional(),
        openaiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        model: z.string().optional(),
        ollamaUrl: z.string().optional(),
        ollamaModel: z.string().optional(),
        ollamaNumCtx: z.number().optional()
    }).passthrough(),
    isInclusive: z.boolean().optional(),
    tasksLayout: z.unknown().optional(),
    pageCount: z.number().optional(),
    isScan: z.boolean().optional()
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { claims } = req.user;
    const logtoId = claims.sub;

    // --- COMPLIANCE EARLY GATEKEEPER ---
    try {
        await resolveActiveWorkspace(logtoId);
    } catch (error: any) {
        return res.status(error.message?.includes('Compliance') || error.message?.includes('AVV') ? 403 : 500).json({ error: error.message });
    }

    const validation = cleanAndMapSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues[0].message });
    }

    const { text, settings, isInclusive, tasksLayout, pageCount, isScan } = validation.data;

    logger.info('OCR Request passed to clean-and-map', { 
        pageCount: pageCount, 
        provider: settings?.provider 
    });

    const effectivePageCount = Math.max(1, pageCount || 1);

    try {
        let result: any;

        if (settings.provider === 'ollama') {

            result = await executeOllamaRequest(
                'clean-and-map',
                { text, tasksLayout },
                settings
            );
        } else if (settings.provider === 'mistral') {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');
 
             result = await executeMistralRequest(
                'clean-and-map',
                { text, tasksLayout },
                apiKey,
                { isScan, model: settings.model }
            );
        } else if (settings.provider === 'openai-compatible') {
            const baseUrl = settings.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || DEFAULT_OPENAI_COMPATIBLE_BASE_URL;
            const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';

            if (!apiKey) throw new Error('Mittwald/OpenAI API-Key fehlt.');

            result = await executeOpenAIRequest(
                'clean-and-map',
                { text, tasksLayout },
                baseUrl,
                apiKey,
                { model }
            );
        } else {
            throw new Error(`Unbekannter Provider: ${settings.provider}`);
        }

        // --- BILLING & TRACKING ---
        const CREDIT_COST = effectivePageCount * 1;
        await performBillingAction({
            logtoId,
            module: 'correction',
            inputTokens: result.usage?.prompt_tokens || 0,
            outputTokens: result.usage?.completion_tokens || 0,
            creditCost: isInclusive ? 0 : CREDIT_COST
        });

        // Cleanup usage from response
        delete result.usage;

        res.status(200).json(result);
    } catch (error: any) {
        logger.error('Clean Text Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        const isComplianceError = error.message?.includes('Compliance') || error.message?.includes('AVV');
        const isCreditsError = error.message?.includes('Credits');
        const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit');

        const statusCode = isCreditsError ? 402 : isComplianceError ? 403 : isRateLimit ? 429 : 500;
        res.status(statusCode).json({ 
            error: isRateLimit 
                ? 'KI-Server überlastet. Bitte warten Sie ca. 30 Sekunden und versuchen es erneut.' 
                : (error.message || 'Fehler beim Aufbereiten des Textes.')
        });
    }
});
