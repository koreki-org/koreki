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
 * Synthetic Student Generator API
 * 🏮🛡️🏛️
 * Generates fiktive student answers with distinct, common pedagogical error profiles
 * for calibration (GradingMemory Case generation).
 */

const generateSchema = z.object({
    modelSolution: z.string().min(1, 'Musterlösung ist erforderlich'),
    tasksLayout: z.array(z.any()).optional(),
    selectedTasks: z.array(z.string()).optional(),
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
        const validation = generateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { modelSolution, tasksLayout, selectedTasks, settings: clientSettings } = validation.data;

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
                'student-simulator',
                { modelSolution, tasksLayout, selectedTasks },
                settings
            );
        } else if (settings.provider === 'openai-compatible') {
            const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

            result = await executeOpenAIRequest(
                'student-simulator',
                { modelSolution, tasksLayout, selectedTasks },
                baseUrl,
                apiKey,
                { model }
            );
        } else {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

            result = await executeMistralRequest(
                'student-simulator',
                { modelSolution, tasksLayout, selectedTasks },
                apiKey,
                { model: settings.model }
            );
        }

        // Return the parsed synthetic answers array to the frontend
        return res.status(200).json(result);

    } catch (error) {
        logger.error('[API:GradingMemories:Generate] Error', { endpoint: req.url, message: toErrorMessage(error) });
        const { status, message } = resolveAiHttpError(error, 'Fehler beim Generieren der fiktiven Schülerabgaben.');
        return res.status(status).json({ error: message });
    }
}, { isAi: true });
