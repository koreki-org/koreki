import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import { MISTRAL_MEDIUM_MODEL } from '@/lib/ai/constants';
import type { NextApiResponse } from 'next';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { parseGeneratedCalcTrace, TARGET_GOAL_SCHEMA } from '@/lib/grading/calc-trace-generator';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';
import { isLocalInstance } from '@/lib/env-context';
import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { z } from 'zod';
import { requireOpenAiConnection } from '@/lib/ai/provider-connection';
import { checkAiBudget, checkCreditsAvailable, performBillingAction } from '@/lib/billing';
import { toErrorMessage } from '@/lib/error-message';

/** Kosten eines Calc-Trace-Laufs. Vorpruefung und Abrechnung nutzen denselben Wert. */
const CREDIT_COST = 1;

const GenerateCalcTraceSchema = z.object({
    taskText: z.string().min(1, 'Aufgabentext darf nicht leer sein.'),
    userNotes: z.string().optional(),
    /** Punktzahl der Aufgabe aus der Oberflaeche — verhindert, dass das Modell sie raten muss. */
    maxPoints: z.number().positive().optional(),
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

        const { taskText, userNotes, maxPoints, settings: clientSettings } = validation.data;

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
        const useOpenAI = settings?.provider === 'openai-compatible';
        let rawResult: Record<string, unknown> | null = null;
        let trace: any = null;
        let attempts = 0;
        const maxAttempts = 2;
        let lastError: any = null;

        while (attempts < maxAttempts && !trace) {
            try {
                attempts++;
                
                // Inject the previous error into user notes for self-correction feedback
                let dynamicUserNotes = userNotes;
                if (attempts > 1 && lastError) {
                    dynamicUserNotes = (userNotes ? userNotes + "\n\n" : "") + 
                        `[KORREKTUR-HINWEIS: Der vorherige Generierungsversuch ist mit folgendem Fehler fehlgeschlagen. Bitte korrigiere diesen Fehler im neuen Versuch: ${lastError.message || lastError}]`;
                }

                if (settings?.provider === 'ollama') {
                    rawResult = await executeOllamaRequest(
                        'generate-calc-trace',
                        { taskText, userNotes: dynamicUserNotes, maxPoints },
                        settings as AppSettings,
                        undefined,
                        { responseSchema: TARGET_GOAL_SCHEMA }
                    );
                } else if (!useOpenAI) {
                    const apiKey = settings?.mistralKey || process.env.MISTRAL_API_KEY;
                    if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

                    // Always use the highly capable medium model for complex extraction tasks when using Mistral
                    const mistralModel = settings?.model || MISTRAL_MEDIUM_MODEL;

                    rawResult = await executeMistralRequest(
                        'generate-calc-trace',
                        { taskText, userNotes: dynamicUserNotes, maxPoints },
                        apiKey,
                        {
                            model: mistralModel,
                            enableThinking: settings?.enableThinking,
                            temperature: settings?.temperature ?? 0.0,
                            topP: settings?.topP ?? 0.9,
                            maxTokens: settings?.maxTokens ?? 4000,
                            responseSchema: TARGET_GOAL_SCHEMA
                        }
                    );
                } else {
                    const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

                    rawResult = await executeOpenAIRequest(
                        'generate-calc-trace',
                        { taskText, userNotes: dynamicUserNotes, maxPoints },
                        baseUrl,
                        apiKey,
                        {
                            model,
                            enableThinking: settings?.enableThinking,
                            temperature: settings?.temperature ?? 0.0,
                            topP: settings?.topP ?? 0.9,
                            maxTokens: settings?.maxTokens ?? 4000,
                            responseSchema: TARGET_GOAL_SCHEMA
                        }
                    );
                }

                if (rawResult) {
                    trace = parseGeneratedCalcTrace(JSON.stringify(rawResult), maxPoints);
                }
            } catch (err) {
                lastError = err;
                logger.warn(`[Server] TargetGoal generation attempt ${attempts} failed:`, toErrorMessage(err));
            }
        }

        if (!trace) {
            logger.error('[Server] TargetGoal generation failed after all attempts', { lastError: lastError?.message || lastError });
            return res.status(422).json({
                error: `Die KI konnte kein gültiges TargetGoal generieren. Letzter Fehler: ${lastError?.message || 'Ungültige Struktur'}`
            });
        }

        // Was hier zugesichert wird — und was NICHT.
        //
        // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand `dryRunChecked: true`,
        // darueber der Kommentar "Add dummy validation metadata". Genau das war
        // es: eine behauptete Verifikation, die nie stattgefunden hat.
        //
        // Beim Graphen bedeutet `dryRunChecked`, dass `validateGraphDeterminism`
        // ihn tatsaechlich durchgerechnet hat — das ist der Grund, warum ein
        // erzeugter Graph verlaesslich ist. Fuer eine Rechenkette gibt es dieses
        // Verfahren nicht: `validateCalcTraceDeterminism` ist ein Platzhalter,
        // der bedingungslos zustimmt (siehe Kopf von lib/ai/tool-validation.ts).
        // Geprueft wurde allein die STRUKTUR, durch `parseGeneratedCalcTrace`.
        //
        // Kein akuter Schaden: Zurzeit liest niemand `targetGoal.validation`,
        // der Kommentar "for frontend UI consumption" ging ins Leere. Aber die
        // Zusicherung steht in den Daten, und wer sie spaeter liest — ein
        // Export, eine neue Ansicht — bekaeme eine Falschaussage.
        //
        // `false` ist deshalb nicht bloss ehrlicher, sondern nutzt das
        // vorhandene UI-Muster richtig: Die Plakette "Plausibilitaet
        // verifiziert!" haengt an `{validation?.dryRunChecked && ...}` und
        // bleibt damit aus, solange nichts simuliert wurde.
        (trace as { validation?: unknown }).validation = {
            isValid: true,          // Struktur gelesen und angenommen
            error: '',
            retriesUsed: attempts - 1,
            dryRunChecked: false    // NICHT durchgerechnet — anders als beim Graphen
        };

        // --- ATOMIC BILLING (SaaS only) ---
        // 1 Credit pro Generierungs-Aufruf — also fuer die komplette Rechenkette inkl. aller
        // Meilensteine und Kriterien, nicht pro Teilziel. Bewusst hier unten platziert: die
        // Retry-Schleife oben kostet nichts extra, und ein gescheiterter Versuch (422) gar nichts.
        // Analog zur Bepreisung von generate-graph.ts fuer den strukturell gleichen PANG-Graphen.
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

        return res.status(200).json(trace);
    } catch (error) {
        logger.error('API Generate CalcTrace Fatal Error:', error);
        const { status, message } = resolveAiHttpError(error, 'Fehler beim Generieren des Rechenwegs.');
        return res.status(status).json({ error: message });
    }
}, { isAi: true });
