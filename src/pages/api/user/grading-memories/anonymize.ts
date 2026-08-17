import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { executeMistralRequest } from '../../../../lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../../../lib/ai/openai-provider';
import { executeOllamaRequest } from '../../../../lib/ai/ollama-logic';
import { logger } from '../../../../lib/logger';
import { withSecurity, AuthenticatedRequest } from '../../../../lib/security';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { checkAiBudget, checkAndDeductCredits } from '../../../../lib/billing';
import { isLocalInstance } from '../../../../lib/env-context';
import { requireOpenAiConnection } from '../../../../lib/ai/provider-connection';
import { toErrorMessage } from '../../../../lib/error-message';

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

        const { studentText, settings: clientSettings } = validation.data;

        // Im SaaS stammen Anbieter-Endpunkt und -Schluessel ausschliesslich aus
        // der Server-Env; lokale Instanzen behalten ihre eigene Konfiguration.
        const settings = sanitizeClientAiSettings(clientSettings, req.url);

        const { claims } = req.user;
        const userId = claims?.sub;

        // --- AI Cost Brake (Saeule 7): absoluter Monatsdeckel der Instanz ---
        const budgetError = await checkAiBudget('correction');
        if (budgetError) {
            return res.status(429).json({ error: budgetError });
        }

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
            const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

            result = await executeOpenAIRequest(
                'anonymize',
                { studentText },
                baseUrl,
                apiKey,
                { model }
            );
        } else {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

            result = await executeMistralRequest(
                'anonymize',
                { studentText },
                apiKey,
                { model: settings.model }
            );
        }

        // Return the parsed anonymized response containing "anonymizedText"
        return res.status(200).json(result);

    } catch (error) {
        logger.error('[API:GradingMemories:Anonymize] Error', { endpoint: req.url, message: toErrorMessage(error) });
        const { status, message } = resolveAiHttpError(error, 'Fehler beim Anonymisieren der Schülerabgabe.');
        return res.status(status).json({ error: message });
    }
}, { isAi: true });
