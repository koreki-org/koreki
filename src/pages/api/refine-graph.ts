import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { parseGeneratedGraph } from '@/lib/grading/graph-generator';
import { logger } from '@/lib/logger';
import { isLocalInstance } from '@/lib/env-context';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { z } from 'zod';

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

        const { taskText, currentGraph, userInstruction, discipline, settings } = validation.data;

        // Provider routing
        const useOpenAI = settings?.provider === 'openai-compatible';
        let rawResult: Record<string, unknown>;

        // Strict Parameter Hardening for maximum determinism and zero creativity (JSON-Refinement)
        const temperature = 0.0;
        const topP = 1.0;
        const presencePenalty = 0.0;

        if (!useOpenAI) {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            rawResult = await executeMistralRequest(
                'refine-graph',
                { taskText, currentGraph, userInstruction, discipline },
                apiKey,
                {
                    model: settings?.model,
                    enableThinking: settings?.enableThinking ?? false, // Disabled thinking for fast simple JSON modifications
                    temperature,
                    topP,
                    maxTokens: settings?.maxTokens ?? 4000
                }
            );
        } else {
            const baseUrl = settings?.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
            const apiKey = settings?.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings?.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';

            if (!apiKey) throw new Error('Mittwald/OpenAI API-Key fehlt.');

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
                    maxTokens: settings?.maxTokens ?? 4000
                }
            );
        }

        // Parse and validate the LLM output into a strict GradingGraph
        const graph = parseGeneratedGraph(JSON.stringify(rawResult));

        if (!graph) {
            logger.warn('Graph refinement: LLM returned invalid graph structure', {
                rawKeys: Object.keys(rawResult)
            });
            return res.status(422).json({
                error: 'Die KI konnte keinen gültigen Bewertungs-Graphen generieren. Bitte passe deine Anweisung an oder versuche es erneut.'
            });
        }

        const explanation = typeof rawResult.explanation === 'string' ? rawResult.explanation : '';

        return res.status(200).json({
            graph,
            explanation: explanation || `Graph erfolgreich verfeinert!\nEs wurden ${graph.variables.length} Variablen deklariert.`
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        logger.error('Graph refinement failed', { error: message });
        return res.status(500).json({ error: `Graph-Verfeinerung fehlgeschlagen: ${message}` });
    }
});
