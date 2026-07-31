import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { executeMistralRequest } from '../../../../lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../../../lib/ai/openai-provider';
import { executeOllamaRequest } from '../../../../lib/ai/ollama-logic';
import { logger } from '../../../../lib/logger';
import { withSecurity, AuthenticatedRequest } from '../../../../lib/security';
import { checkAndDeductCredits } from '../../../../lib/billing';
import { isLocalInstance } from '../../../../lib/env-context';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '../../../../lib/ai/constants';

/**
 * Stylistic Student Answer Anonymizer API
 * 🏮🛡️🏛️
 * Stylistically anonymizes student responses before they are saved to GradingMemory
 * to avoid legal issues with saving raw student data.
 */

const anonymizeSchema = z.object({
    studentText: z.string().min(1, 'Schülerantwort ist erforderlich'),
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
    }).passthrough()
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const validation = anonymizeSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { studentText, settings } = validation.data;

        const { claims } = req.user;
        const userId = claims?.sub;

        if (!isLocalInstance()) {
            if (!userId) throw new Error('Nutzer-ID fehlt.');
            await checkAndDeductCredits(userId, 1);
        }

        let result: any;

        if (settings.provider === 'ollama') {
            result = await executeOllamaRequest(
                'anonymize',
                { studentText },
                settings
            );
        } else if (settings.provider === 'openai-compatible') {
            const baseUrl = settings.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || DEFAULT_OPENAI_COMPATIBLE_BASE_URL;
            const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';
            
            if (!apiKey) throw new Error('OpenAI/Mittwald API-Key fehlt.');

            result = await executeOpenAIRequest(
                'anonymize',
                { studentText },
                baseUrl,
                apiKey,
                { model }
            );
        } else {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            result = await executeMistralRequest(
                'anonymize',
                { studentText },
                apiKey,
                { model: settings.model }
            );
        }

        // Return the parsed anonymized response containing "anonymizedText"
        return res.status(200).json(result);

    } catch (error: any) {
        logger.error('[API:GradingMemories:Anonymize] Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit');
        return res.status(isRateLimit ? 429 : 500).json({ 
            error: error.message || 'Fehler beim Anonymisieren der Schülerabgabe.' 
        });
    }
});
