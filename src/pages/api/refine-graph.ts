import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { parseGeneratedGraph, validateGraphDeterminism, GRADING_GRAPH_SCHEMA } from '@/lib/grading/graph-generator';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';
import { isLocalInstance } from '@/lib/env-context';
import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { z } from 'zod';
import { requireOpenAiConnection } from '@/lib/ai/provider-connection';
import { checkAiBudget, checkCreditsAvailable, performBillingAction } from '@/lib/billing';
import { toErrorMessage } from '@/lib/error-message';

/** Kosten eines Verfeinerungs-Laufs. Vorpruefung und Abrechnung nutzen denselben Wert. */
const CREDIT_COST = 1;

const RefineGraphSchema = z.object({
    taskText: z.string().optional().default(''),
    currentGraph: z.object({
        taskId: z.string().min(1),
        discipline: z.string().min(1),
        variables: z.array(z.any()).min(0)
    }).passthrough(),
    userInstruction: z.string().min(1, 'Änderungsanweisung darf nicht leer sein.'),
    discipline: z.string().optional(),
    settings: z.object({
        provider: z.string().optional(),
        mistralKey: z.string().optional(),
        model: z.string().optional(),
        openaiUrl: z.string().optional(),
        openaiKey: z.string().optional(),
        openaiModel: z.string().optional(),
        enableThinking: z.boolean().optional(),
        temperature: z.number().optional(),
        topP: z.number().optional(),
        maxTokens: z.number().optional()
    }).passthrough().optional()
});

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const validation = RefineGraphSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { taskText, currentGraph, userInstruction, discipline, settings: clientSettings } = validation.data;

        // Im SaaS stammen Anbieter-Endpunkt und -Schluessel ausschliesslich aus
        // der Server-Env; lokale Instanzen behalten ihre eigene Konfiguration.
        const settings = sanitizeClientAiSettings(clientSettings, req.url);

        // --- AI Cost Brake (Saeule 7) + Guthaben VOR dem Anbieter-Aufruf ---
        // Beide Pruefungen steigen bei lokalen Instanzen von selbst aus, der
        // isLocalInstance-Guard der Abrechnung unten wird hier nicht gebraucht.
        const budgetError = await checkAiBudget('correction');
        if (budgetError) {
            return res.status(429).json({ error: budgetError });
        }

        const creditError = await checkCreditsAvailable(requireUserId(req), CREDIT_COST);
        if (creditError) {
            return res.status(402).json({ error: creditError });
        }



        // Provider routing
        const useOpenAI = settings?.provider === 'openai-compatible';
        let rawResult: Record<string, unknown>;

        // Strict Parameter Hardening for maximum determinism and zero creativity (JSON-Refinement)
        const temperature = 0.0;
        const topP = 1.0;
        const presencePenalty = 0.0;

        if (settings?.provider === 'ollama') {
            rawResult = await executeOllamaRequest(
                'refine-graph',
                { taskText, currentGraph, userInstruction, discipline },
                settings as AppSettings,
                undefined,
                { responseSchema: GRADING_GRAPH_SCHEMA }
            );
        } else if (!useOpenAI) {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

            rawResult = await executeMistralRequest(
                'refine-graph',
                { taskText, currentGraph, userInstruction, discipline },
                apiKey,
                {
                    model: settings?.model,
                    enableThinking: settings?.enableThinking ?? false, // Disabled thinking for fast simple JSON modifications
                    temperature,
                    topP,
                    maxTokens: settings?.maxTokens ?? 4000,
                    responseSchema: GRADING_GRAPH_SCHEMA
                }
            );
        } else {
            const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

            rawResult = await executeOpenAIRequest(
                'refine-graph',
                { taskText, currentGraph, userInstruction, discipline },
                baseUrl,
                apiKey,
                {
                    model,
                    enableThinking: settings?.enableThinking ?? false, // Disabled thinking for fast simple JSON modifications
                    temperature,
                    topP,
                    presencePenalty,
                    maxTokens: settings?.maxTokens ?? 4000,
                    responseSchema: GRADING_GRAPH_SCHEMA
                }
            );
        }

        // Parse and validate the LLM output into a strict GradingGraph
        // Wir deaktivieren hier die automatische Punkte-Hygiene (skipSanitization: true),
        // damit vom Lehrer explizit angeforderte Punkteverteilungen (z.B. Dezimalzahlen
        // oder 0-Punkte für Input-Werte) nicht vom System überschrieben werden.
        const graph = parseGeneratedGraph(JSON.stringify(rawResult), { skipSanitization: true });

        if (!graph) {
            logger.warn('Graph refinement: LLM returned invalid graph structure', {
                rawKeys: Object.keys(rawResult)
            });
            return res.status(422).json({
                error: 'Die KI konnte keinen gültigen Bewertungs-Graphen generieren. Bitte passe deine Anweisung an oder versuche es erneut.'
            });
        }

        // Validate the refined graph's determinism
        const graphValidation = validateGraphDeterminism(graph);

        // Enrich graph with validation metadata for frontend UI consumption
        (graph as any).validation = {
            isValid: graphValidation.isValid,
            error: graphValidation.error,
            dryRunChecked: true
        };

        const explanation = typeof rawResult.explanation === 'string' ? rawResult.explanation : '';

        // --- ATOMIC BILLING (SaaS only) ---
        // 1 Credit pro Verfeinerungs-Anweisung (local/community Instanzen sind befreit).
        if (!isLocalInstance()) {
            const logtoId = requireUserId(req);
            await performBillingAction({
                logtoId,
                module: 'correction',
                inputTokens: 0,
                outputTokens: 0,
                creditCost: CREDIT_COST
            });
        }

        return res.status(200).json({
            graph,
            explanation: explanation || `Graph erfolgreich verfeinert!\nEs wurden ${graph.variables.length} Variablen deklariert.`
        });

    } catch (err: unknown) {
        logger.error('Graph refinement failed', { error: toErrorMessage(err) });
        const { status, message } = resolveAiHttpError(err, 'Graph-Verfeinerung fehlgeschlagen.');
        return res.status(status).json({ error: message });
    }
}, { isAi: true });
