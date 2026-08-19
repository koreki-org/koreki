import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import type { NextApiResponse } from 'next';
import { z } from 'zod';
import { executeMistralRequest } from '../../lib/ai/mistral-provider';
import { executeOpenAIRequest } from '../../lib/ai/openai-provider';
import { executeOllamaRequest } from '../../lib/ai/ollama-logic';
import { logger } from '../../lib/logger';
import { withSecurity, AuthenticatedRequest } from '../../lib/security';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { checkAiBudget, checkAndDeductCredits, resolveActiveWorkspace } from '../../lib/billing';
import { isLocalInstance } from '../../lib/env-context';
import { requireOpenAiConnection } from '../../lib/ai/provider-connection';
import { toErrorMessage } from '../../lib/error-message';

/**
 * Pedagogical Double-Check API (Zweitblick)
 * 🏮🛡️🏛️
 * Resolves grading doubt for teachers by executing a structured high-fidelity JSON critique.
 * Charges 1 Credit for Standard Mode SaaS.
 */

const secondOpinionSchema = z.object({
    taskName: z.string().min(1, 'Aufgabenname ist erforderlich'),
    taskInstructions: z.string().optional(),
    sampleSolution: z.string().optional(),
    maxPoints: z.number().nonnegative(),
    studentText: z.string().min(1, 'Schülerantwort ist erforderlich'),
    currentPoints: z.number(),
    currentFeedback: z.string(),
    teacherDoubt: z.string().optional(),
    chatHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
    })).optional(),
    activeSkillIds: z.array(z.string()).optional(),
    correctionPrompt: z.string().optional(),
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
        const validation = secondOpinionSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const {
            taskName,
            taskInstructions,
            sampleSolution,
            maxPoints,
            studentText,
            currentPoints,
            currentFeedback,
            teacherDoubt,
            chatHistory,
            activeSkillIds,
            correctionPrompt,
            settings: clientSettings
        } = validation.data;

        // Im SaaS stammen Anbieter-Endpunkt und -Schluessel ausschliesslich aus
        // der Server-Env; lokale Instanzen behalten ihre eigene Konfiguration.
        const settings = sanitizeClientAiSettings(clientSettings, req.url);

        const { claims } = req.user;
        const userId = claims?.sub;

        // --- AI Cost Brake (Saeule 7): absoluter Monatsdeckel der Instanz ---
        // --- COMPLIANCE EARLY GATEKEEPER ---
        //
        // GEFUNDEN BEIM LESEN, 19.08.2026: Diese Route war die einzige der
        // vier, die SCHUELERTEXT verarbeiten, ohne eigenen Compliance-Gate.
        // Sie verliess sich auf `checkAndDeductCredits` weiter unten — und das
        // wird bei Rueckfragen ABSICHTLICH uebersprungen, weil eine Rueckfrage
        // nichts kosten soll. Die Kulanz-Entscheidung hat damit nebenbei die
        // AVV-Pruefung abgeschaltet: Ein Folge-Aufruf schickte Schuelertext an
        // den Anbieter, ohne dass die Zustimmung der Schulleitung geprueft war.
        //
        // Kein offenes Tor — die ERSTE Nachricht eines Gespraechs wird
        // weiterhin geprueft, ein Folge-Aufruf setzt sie also voraus. Aber die
        // Pruefung darf nicht an der Abrechnung haengen, sonst nimmt jede
        // kuenftige Kostenbefreiung sie wieder mit.
        //
        // Behandlung woertlich wie in clean-and-analyze.ts, damit dieselbe Lage
        // nicht zwei verschiedene Antworten erzeugt. An den Kosten aendert sich
        // nichts: `resolveActiveWorkspace` bucht nicht.
        try {
            await resolveActiveWorkspace(userId ?? '');
        } catch (error) {
            const message = toErrorMessage(error);
            return res
                .status(message.includes('Compliance') || message.includes('AVV') ? 403 : 500)
                .json({ error: message });
        }

        const budgetError = await checkAiBudget('correction');
        if (budgetError) {
            return res.status(429).json({ error: budgetError });
        }

        if (!isLocalInstance()) {
            if (!userId) throw new Error('Nutzer-ID fehlt.');
            // 1 Credit Flatrate: Nur abbuchen, wenn es die ERSTE Nachricht im Chat-Verlauf ist.
            // Anschlussfragen im selben Chat-Sparring sind komplett kostenlos!
            const isFollowUp = chatHistory && chatHistory.length >= 2;
            if (!isFollowUp) {
                await checkAndDeductCredits(userId, 1);
            }
        }

        let result: any;
        const payload = {
            taskName,
            taskInstructions,
            sampleSolution,
            maxPoints,
            studentText,
            currentPoints,
            currentFeedback,
            teacherDoubt,
            chatHistory,
            activeSkillIds,
            correctionPrompt
        };

        if (settings.provider === 'ollama') {
            result = await executeOllamaRequest(
                'second-opinion',
                payload,
                settings
            );
        } else if (settings.provider === 'openai-compatible') {
            const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

            result = await executeOpenAIRequest(
                'second-opinion',
                payload,
                baseUrl,
                apiKey,
                { model }
            );
        } else {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

            result = await executeMistralRequest(
                'second-opinion',
                payload,
                apiKey,
                { model: settings.model }
            );
        }

        // Extrahiere die rohe Textantwort des KI-Sparringspartners
        const rawResponse = result.response || result.text || (typeof result === 'string' ? result : JSON.stringify(result));
        return res.status(200).json({ response: rawResponse });

    } catch (error) {
        logger.error('[API:SecondOpinion] Error', { endpoint: req.url, message: toErrorMessage(error) });
        const { status, message } = resolveAiHttpError(error, 'Fehler beim Einholen der Zweitmeinung.');
        return res.status(status).json({ error: message });
    }
}, { isAi: true });
