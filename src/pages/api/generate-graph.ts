import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { parseGeneratedGraph, validateGraphDeterminism, GRADING_GRAPH_SCHEMA } from '@/lib/grading/graph-generator';
import { performBillingAction } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';
import { isLocalInstance } from '@/lib/env-context';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { z } from 'zod';
import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from '@/lib/ai/constants';

const GenerateGraphSchema = z.object({
    taskText: z.string().min(1, 'Aufgabentext darf nicht leer sein.'),
    discipline: z.string().optional(),
    userNotes: z.string().optional(),
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

        const validation = GenerateGraphSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { taskText, discipline, userNotes, settings: clientSettings } = validation.data;

        // Im SaaS stammen Anbieter-Endpunkt und -Schluessel ausschliesslich aus
        // der Server-Env; lokale Instanzen behalten ihre eigene Konfiguration.
        const settings = sanitizeClientAiSettings(clientSettings, req.url);



        // Provider routing — same pattern as ai-correct.ts
        const useOpenAI = settings?.provider === 'openai-compatible';
        let rawResult: Record<string, unknown>;

        if (settings?.provider === 'ollama') {
            rawResult = await executeOllamaRequest(
                'generate-graph',
                { taskText, discipline, userNotes },
                settings as AppSettings,
                undefined,
                { responseSchema: GRADING_GRAPH_SCHEMA }
            );
        } else if (!useOpenAI) {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

            rawResult = await executeMistralRequest(
                'generate-graph',
                { taskText, discipline, userNotes },
                apiKey,
                {
                    model: settings?.model,
                    enableThinking: settings?.enableThinking,
                    temperature: settings?.temperature ?? 0.2,
                    topP: settings?.topP ?? 0.9,
                    maxTokens: settings?.maxTokens ?? 4000,
                    responseSchema: GRADING_GRAPH_SCHEMA
                }
            );
        } else {
            const baseUrl = settings?.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || DEFAULT_OPENAI_COMPATIBLE_BASE_URL;
            const apiKey = settings?.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings?.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';

            if (!apiKey) throw new AIConfigError('Mittwald/OpenAI API-Key fehlt.');

            rawResult = await executeOpenAIRequest(
                'generate-graph',
                { taskText, discipline, userNotes },
                baseUrl,
                apiKey,
                {
                    model,
                    enableThinking: settings?.enableThinking,
                    temperature: settings?.temperature ?? 0.2,
                    topP: settings?.topP ?? 0.9,
                    maxTokens: settings?.maxTokens ?? 4000,
                    responseSchema: GRADING_GRAPH_SCHEMA
                }
            );
        }

        // 1. Initial Parsing of the LLM output into a strict GradingGraph
        let graph = parseGeneratedGraph(JSON.stringify(rawResult));

        if (!graph) {
            logger.warn('Graph generation: LLM returned invalid graph structure', {
                rawKeys: Object.keys(rawResult)
            });
            return res.status(422).json({
                error: 'Die KI konnte keinen gültigen Bewertungs-Graphen generieren. Bitte versuche es erneut oder passe den Aufgabentext an.'
            });
        }

        // 2. Perform Automated Dry-Run Verification
        let graphValidation = validateGraphDeterminism(graph);
        let retryCount = 0;
        const maxRetries = isLocalInstance() ? 3 : 1; // SaaS/Cloud gets 1 retry, Local/Desktop gets up to 3

        // 3. Auto-Correction Loop (SaaS & Desktop aware)
        while (!graphValidation.isValid && retryCount < maxRetries) {
            logger.warn(`PANG Dry-Run validation failed. Triggering automatic self-correction (Attempt ${retryCount + 1}/${maxRetries})`, {
                error: graphValidation.error
            });

            const userInstruction = `AUTOMATISCHE MATHEMATISCHE VALIDIERUNG FEHLGESCHLAGEN:
Der von dir generierte Graph ist mathematisch nicht konsistent auswertbar.
Folgender Fehler trat bei der Test-Simulation auf:
"${graphValidation.error}"

Bitte korrigiere den Graphen. Stelle sicher, dass:
1. Alle Formel-Ausdrücke syntaktisch korrekt sind und die richtigen Variablen-Namen referenzieren.
2. Keine fiktiven JavaScript-Funktionen verwendet werden (nutze nur Algebra oder registrierte Plugins).
3. Jede Formel-Variable mit den Default-Eingabewerten mathematisch exakt das Ergebnis der Musterlösung liefert.
4. Alle Variablen in snake_case benannt sind.

Gib AUSSCHLIESSLICH das korrigierte JSON-Objekt im bekannten Schema aus.`;

            try {
                if (settings?.provider === 'ollama') {
                    rawResult = await executeOllamaRequest(
                        'refine-graph',
                        { taskText, currentGraph: graph, userInstruction, discipline },
                        settings as AppSettings,
                        undefined,
                        { responseSchema: GRADING_GRAPH_SCHEMA }
                    );
                } else if (!useOpenAI) {
                    const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
                    if (apiKey) {
                        rawResult = await executeMistralRequest(
                            'refine-graph',
                            { taskText, currentGraph: graph, userInstruction, discipline },
                            apiKey,
                            {
                                model: settings?.model,
                                enableThinking: false, // Fast, low-latency correction
                                temperature: 0.0,
                                topP: 1.0,
                                maxTokens: settings?.maxTokens ?? 4000,
                                responseSchema: GRADING_GRAPH_SCHEMA
                            }
                        );
                    }
                } else {
                    const baseUrl = settings?.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || DEFAULT_OPENAI_COMPATIBLE_BASE_URL;
                    const apiKey = settings?.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
                    const model = settings?.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';

                    if (apiKey) {
                        rawResult = await executeOpenAIRequest(
                            'refine-graph',
                            { taskText, currentGraph: graph, userInstruction, discipline },
                            baseUrl,
                            apiKey,
                            {
                                model,
                                enableThinking: false, // Fast, low-latency correction
                                temperature: 0.0,
                                topP: 1.0,
                                maxTokens: settings?.maxTokens ?? 4000,
                                responseSchema: GRADING_GRAPH_SCHEMA
                            }
                        );
                    }
                }

                const correctedGraph = parseGeneratedGraph(JSON.stringify(rawResult));
                if (correctedGraph) {
                    graph = correctedGraph;
                    graphValidation = validateGraphDeterminism(graph);
                } else {
                    break;
                }
            } catch (err: any) {
                logger.error('Auto-correction request failed in loop', { error: err.message });
                break;
            }

            retryCount++;
        }

        // 4. Enrich payload with validation metadata for frontend UI consumption
        (graph as any).validation = {
            isValid: graphValidation.isValid,
            error: graphValidation.error,
            retriesUsed: retryCount,
            dryRunChecked: true
        };

        // --- ATOMIC BILLING (SaaS only) ---
        // 1 Credit per graph generation (local/community instances are exempt)
        if (!isLocalInstance()) {
            const logtoId = req.user.claims.sub;
            await performBillingAction({
                logtoId,
                module: 'correction',
                inputTokens: 0,
                outputTokens: 0,
                creditCost: 1
            });
        }

        return res.status(200).json(graph);

    } catch (err: unknown) {
        logger.error('Graph generation failed', { error: err instanceof Error ? err.message : String(err) });
        const { status, message } = resolveAiHttpError(err, 'Graph-Generierung fehlgeschlagen.');
        return res.status(status).json({ error: message });
    }
}, { isAi: true });
