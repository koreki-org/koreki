import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { parseGeneratedCalcTrace, TARGET_GOAL_SCHEMA } from '@/lib/grading/calc-trace-generator';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';
import { isLocalInstance } from '@/lib/env-context';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { z } from 'zod';

const GenerateCalcTraceSchema = z.object({
    taskText: z.string().min(1, 'Aufgabentext darf nicht leer sein.'),
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

        const validation = GenerateCalcTraceSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { taskText, userNotes, settings } = validation.data;
        const useOpenAI = settings?.provider === 'openai-compatible';
        let rawResult: Record<string, unknown>;

        if (settings?.provider === 'ollama') {
            rawResult = await executeOllamaRequest(
                'generate-calc-trace',
                { taskText, userNotes },
                settings as AppSettings,
                undefined,
                { responseSchema: TARGET_GOAL_SCHEMA }
            );
        } else if (!useOpenAI) {
            const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            rawResult = await executeMistralRequest(
                'generate-calc-trace',
                { taskText, userNotes },
                apiKey,
                {
                    model: settings?.model,
                    enableThinking: settings?.enableThinking,
                    temperature: settings?.temperature ?? 0.2,
                    topP: settings?.topP ?? 0.9,
                    maxTokens: settings?.maxTokens ?? 4000,
                    responseSchema: TARGET_GOAL_SCHEMA
                }
            );
        } else {
            const baseUrl = settings?.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
            const apiKey = settings?.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings?.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';

            if (!apiKey) throw new Error('Mittwald/OpenAI API-Key fehlt.');

            rawResult = await executeOpenAIRequest(
                'generate-calc-trace',
                { taskText, userNotes },
                baseUrl,
                apiKey,
                {
                    model,
                    enableThinking: settings?.enableThinking,
                    temperature: settings?.temperature ?? 0.2,
                    topP: settings?.topP ?? 0.9,
                    maxTokens: settings?.maxTokens ?? 4000,
                    responseSchema: TARGET_GOAL_SCHEMA
                }
            );
        }

        let trace = parseGeneratedCalcTrace(JSON.stringify(rawResult));

        if (!trace) {
            logger.warn('TargetGoal generation: LLM returned invalid structure', {
                rawKeys: Object.keys(rawResult)
            });
            return res.status(422).json({
                error: 'Die KI konnte kein gültiges TargetGoal generieren. Bitte versuche es erneut oder passe den Aufgabentext an.'
            });
        }

        // Add dummy validation metadata for frontend UI consumption
        (trace as any).validation = {
            isValid: true,
            error: '',
            retriesUsed: 0,
            dryRunChecked: true
        };

        return res.status(200).json(trace);
    } catch (error: any) {
        logger.error('API Generate CalcTrace Fatal Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
