import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import type { NextApiResponse } from 'next';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { checkAiBudget, checkCompliance, checkCreditsAvailable, performBillingAction } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { requireOpenAiConnection } from '@/lib/ai/provider-connection';

import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { toErrorMessage } from '@/lib/error-message';

const cleanAndAnalyzeSchema = z.object({
    modelSolution: z.string().min(1, 'Musterlösung fehlt.'),
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
    pageCount: z.number().optional(),
    isScan: z.boolean().optional()
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const logtoId = requireUserId(req);

    // --- COMPLIANCE EARLY GATEKEEPER ---
    // --- COMPLIANCE EARLY GATEKEEPER ---
    //
    // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand `resolveActiveWorkspace`.
    // Diese Funktion prueft die AVV-Zustimmung gar nicht und wirft nie —
    // sie schlaegt nur einen Workspace nach. Die Ueberschrift stimmte
    // also nicht: Der Riegel war an dieser Stelle wirkungslos, und die
    // einzige echte Pruefung lief in `performBillingAction`, also NACH
    // dem Anbieter-Aufruf. Schuelertext ging raus, und erst danach fiel
    // auf, dass die Schule nie zugestimmt hatte.
    const komplianzFehler = await checkCompliance(logtoId);
    if (komplianzFehler) {
        return res.status(403).json({ error: komplianzFehler });
    }

    const validation = cleanAndAnalyzeSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.issues[0].message });
    }

    const { modelSolution, settings: clientSettings, isInclusive, pageCount, isScan } = validation.data;

    // Im SaaS stammen Anbieter-Endpunkt und -Schluessel ausschliesslich aus der
    // Server-Env; lokale Instanzen behalten ihre eigene Konfiguration.
    const settings = sanitizeClientAiSettings(clientSettings, req.url);

    const effectivePageCount = Math.max(1, pageCount || 1);

    // Einmal abgeleitet und unten unveraendert weitergereicht, damit Vorpruefung
    // und Abrechnung nicht auseinanderlaufen koennen. Inklusive Laeufe kosten
    // bewusst nichts — checkCreditsAvailable steigt bei 0 sofort aus.
    const creditCost = isInclusive ? 0 : effectivePageCount;

    // --- AI Cost Brake (Saeule 7): absoluter Monatsdeckel der Instanz ---
    const budgetError = await checkAiBudget('correction');
    if (budgetError) {
        return res.status(429).json({ error: budgetError });
    }

    // Guthaben VOR dem Anbieter-Aufruf pruefen — sonst entstehen echte Kosten,
    // die anschliessend ohnehin abgelehnt werden.
    const creditError = await checkCreditsAvailable(logtoId!, creditCost);
    if (creditError) {
        return res.status(402).json({ error: creditError });
    }

    try {
        let result: any;

        if (settings.provider === 'ollama') {
            result = await executeOllamaRequest(
                'clean-and-analyze',
                { modelSolution },
                settings
            );
        } else if (settings.provider === 'mistral') {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');
 
             result = await executeMistralRequest(
                'clean-and-analyze',
                { modelSolution },
                apiKey,
                { isScan, model: settings.model }
            );
        } else if (settings.provider === 'openai-compatible') {
            const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

            result = await executeOpenAIRequest(
                'clean-and-analyze',
                { modelSolution },
                baseUrl,
                apiKey,
                { model }
            );
        } else {
            throw new Error(`Unbekannter Provider: ${settings.provider}`);
        }

        // --- BILLING & TRACKING ---
        await performBillingAction({
            logtoId,
            module: 'correction',
            inputTokens: result.usage?.prompt_tokens || 0,
            outputTokens: result.usage?.completion_tokens || 0,
            creditCost
        });

        // Cleanup usage from response
        delete result.usage;

        res.status(200).json(result);
    } catch (error) {
        logger.error('Analyze Model Error', { endpoint: req.url, message: toErrorMessage(error) });
        const { status, message } = resolveAiHttpError(error, 'Fehler beim Analysieren der Musterlösung.');
        res.status(status).json({ error: message });
    }
}, { isAi: true });
