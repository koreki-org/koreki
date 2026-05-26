import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { parseGeneratedGraph } from '@/lib/grading/graph-generator';
import { logger } from '@/lib/logger';
import { isLocalInstance } from '@/lib/env-context';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { z } from 'zod';

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

        const { taskText, discipline, userNotes, settings } = validation.data;

        // Provider routing — same pattern as ai-correct.ts
        const useOpenAI = settings?.provider === 'openai-compatible';
        let rawResult: Record<string, unknown>;

        if (!useOpenAI) {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            rawResult = await executeMistralRequest(
                'generate-graph',
                { taskText, discipline, userNotes },
                apiKey,
                {
                    model: settings?.model,
                    enableThinking: settings?.enableThinking,
                    temperature: settings?.temperature ?? 0.2,
                    topP: settings?.topP ?? 0.9,
                    maxTokens: settings?.maxTokens ?? 4000
                }
            );
        } else {
            const baseUrl = settings?.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
            const apiKey = settings?.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings?.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';

            if (!apiKey) throw new Error('Mittwald/OpenAI API-Key fehlt.');

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
                    maxTokens: settings?.maxTokens ?? 4000
                }
            );
        }

        // Parse and validate the LLM output into a strict GradingGraph
        const graph = parseGeneratedGraph(JSON.stringify(rawResult));

        if (!graph) {
            logger.warn('Graph generation: LLM returned invalid graph structure', {
                rawKeys: Object.keys(rawResult)
            });
            return res.status(422).json({
                error: 'Die KI konnte keinen gültigen Bewertungs-Graphen generieren. Bitte versuche es erneut oder passe den Aufgabentext an.'
            });
        }

        // Billing for SaaS mode
        if (!isLocalInstance()) {
            // ARCH: Lightweight billing — graph generation counts as 1 page equivalent
            // Future: could be tracked separately via a 'graph-generation' billing action
        }

        return res.status(200).json(graph);

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        logger.error('Graph generation failed', { error: message });
        return res.status(500).json({ error: `Graph-Generierung fehlgeschlagen: ${message}` });
    }
});
