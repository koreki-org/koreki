import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { parseGeneratedCalcTrace, validateCalcTraceDeterminism, CALC_TRACE_SCHEMA } from '@/lib/grading/calc-trace-generator';
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
                { responseSchema: CALC_TRACE_SCHEMA }
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
                    responseSchema: CALC_TRACE_SCHEMA
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
                    responseSchema: CALC_TRACE_SCHEMA
                }
            );
        }

        let trace = parseGeneratedCalcTrace(JSON.stringify(rawResult));

        if (!trace) {
            logger.warn('CalcTrace generation: LLM returned invalid trace structure', {
                rawKeys: Object.keys(rawResult)
            });
            return res.status(422).json({
                error: 'Die KI konnte keine gültige Rechenkette generieren. Bitte versuche es erneut oder passe den Aufgabentext an.'
            });
        }

        let traceValidation = validateCalcTraceDeterminism(trace);
        let retryCount = 0;
        const maxRetries = isLocalInstance() ? 3 : 1;

        while (!traceValidation.isValid && retryCount < maxRetries) {
            logger.warn(`CalcTrace Dry-Run validation failed. Triggering automatic self-correction (Attempt ${retryCount + 1}/${maxRetries})`, {
                error: traceValidation.error
            });

            const userInstruction = `AUTOMATISCHE MATHEMATISCHE VALIDIERUNG FEHLGESCHLAGEN:
Der von dir generierte Rechenweg (CalcTrace) ist mathematisch nicht konsistent auswertbar.
Folgender Fehler trat bei der Test-Simulation auf:
"${traceValidation.error}"

Bitte korrigiere die Rechenkette. Stelle sicher, dass:
1. Alle Formel-Ausdrücke syntaktisch korrekt sind und die richtigen Variablen-Namen/Schritt-IDs referenzieren.
2. Alle Schritte in der korrekten Reihenfolge deklariert sind (keine Vorwärtsreferenzen).
3. Jeder berechnete Schritt (type === 'calc') mit den gegebenen Werten mathematisch exakt das erwartete Ergebnis der Musterlösung liefert.

Gib AUSSCHLIESSLICH das korrigierte JSON-Objekt im bekannten Schema aus.`;

            try {
                if (settings?.provider === 'ollama') {
                    rawResult = await executeOllamaRequest(
                        'refine-calc-trace',
                        { taskText, currentTrace: trace, userInstruction },
                        settings as AppSettings,
                        undefined,
                        { responseSchema: CALC_TRACE_SCHEMA }
                    );
                } else if (!useOpenAI) {
                    const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
                    if (apiKey) {
                        rawResult = await executeMistralRequest(
                            'refine-calc-trace',
                            { taskText, currentTrace: trace, userInstruction },
                            apiKey,
                            {
                                model: settings?.model,
                                temperature: 0.0,
                                topP: 1.0,
                                maxTokens: 4000,
                                responseSchema: CALC_TRACE_SCHEMA
                            }
                        );
                    }
                } else {
                    const baseUrl = settings?.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
                    const apiKey = settings?.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
                    const model = settings?.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';

                    if (apiKey) {
                        rawResult = await executeOpenAIRequest(
                            'refine-calc-trace',
                            { taskText, currentTrace: trace, userInstruction },
                            baseUrl,
                            apiKey,
                            {
                                model,
                                temperature: 0.0,
                                topP: 1.0,
                                maxTokens: 4000,
                                responseSchema: CALC_TRACE_SCHEMA
                            }
                        );
                    }
                }

                const correctedTrace = parseGeneratedCalcTrace(JSON.stringify(rawResult));
                if (correctedTrace) {
                    trace = correctedTrace;
                    traceValidation = validateCalcTraceDeterminism(trace);
                } else {
                    break;
                }
            } catch (err) {
                logger.error('Auto-correction request failed in loop', err);
                break;
            }
            retryCount++;
        }

        // 4. Enrich payload with validation metadata for frontend UI consumption
        (trace as any).validation = {
            isValid: traceValidation.isValid,
            error: traceValidation.error,
            retriesUsed: retryCount,
            dryRunChecked: true
        };

        return res.status(200).json(trace);
    } catch (error: any) {
        logger.error('API Generate CalcTrace Fatal Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
