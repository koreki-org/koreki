import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { parseCorrectionResult } from '@/lib/ai/ai-orchestrator';
import { runLocalGradingEngines } from '@/lib/ai/local-grading-pass';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { CorrectionSchema } from '@/lib/validation';
import { AppSettings } from '@/types';
import { checkAiBudget, checkCreditsAvailable, performBillingAction, resolveActiveWorkspace } from '@/lib/billing';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { logger } from '@/lib/logger';
import { isLocalInstance } from '@/lib/env-context';

import { withSecurity, requireUserId, AuthenticatedRequest } from '@/lib/security';
import { requireOpenAiConnection } from '@/lib/ai/provider-connection';
import { toErrorMessage } from '@/lib/error-message';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        const validation = CorrectionSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const {
            modelSolution,
            studentText,
            settings: clientSettings,
            tasksLayout,
            pageCount,
            expertProfileName,
            gradingMemory
        } = validation.data;

        // Im SaaS stammen Anbieter-Endpunkt und -Schluessel ausschliesslich aus
        // der Server-Env; lokale Instanzen behalten ihre eigene Konfiguration.
        const settings = sanitizeClientAiSettings(clientSettings, req.url);

        const logtoId = requireUserId(req);

        logger.info('[API:ai-correct] Received correction request', {
            hasModelSolution: !!modelSolution,
            studentTextLength: studentText?.length || 0,
            tasksCount: tasksLayout?.length || 0,
            expertProfileName,
            hasGradingMemory: !!gradingMemory,
            gradingMemoryCasesCount: gradingMemory?.length || 0
        });



        // --- COMPLIANCE EARLY GATEKEEPER ---
        await resolveActiveWorkspace(logtoId);

        const effectivePageCount = Math.max(1, pageCount || 1);
        const requiredCredits = effectivePageCount * 1;

        if (!settings) {
            return res.status(400).json({ error: 'Einstellungen fehlen.' });
        }

        // Guthaben VOR dem Anbieter-Aufruf pruefen — die Abrechnung unten laeuft
        // erst danach und wuerde die Kosten sonst bereits ausgeloest haben.
        //
        // GEFUNDEN BEIM LESEN, 18.08.2026: Genau das stimmte nicht. Diese beiden
        // Sperren standen HINTER `runLocalGradingEngines` — und dieser Lauf ruft
        // selbst den Anbieter, einmal je Rechenketten- oder Graph-Aufgabe, plus
        // Nachbesserungsversuche. Eine Lehrkraft ohne Guthaben loeste damit die
        // gesamte Extraktion aus und bekam ERST DANACH die 402. Die
        // Kostenbremse der Instanz (Saeule 7) war fuer dieselben Aufrufe
        // ebenfalls wirkungslos, obwohl sie als absoluter Monatsdeckel gedacht
        // ist.
        //
        // Das Geschwister-Modul `clean-and-analyze.ts` hatte die Reihenfolge von
        // Anfang an richtig. Wieder dieselbe Klasse: die Regel galt an einer
        // Stelle und an der Nachbarstelle nicht.
        const creditError = await checkCreditsAvailable(logtoId!, requiredCredits);
        if (creditError) {
            return res.status(402).json({ error: creditError });
        }

        // --- AI Cost Brake (Saeule 7): absoluter Monatsdeckel der Instanz ---
        const budgetError = await checkAiBudget('correction');
        if (budgetError) {
            return res.status(429).json({ error: budgetError });
        }

        // Wo Graph oder Rechenkette hinterlegt sind, rechnet Koreki selbst — vor dem
        // KI-Aufruf. Denselben Lauf macht der Client-Weg im ai-orchestrator.
        //
        // Steht BEWUSST hinter den beiden Sperren: Der Lauf kostet echte
        // Anbieter-Aufrufe (siehe oben).
        if (tasksLayout && Array.isArray(tasksLayout)) {
            await runLocalGradingEngines({
                tasksLayout,
                studentText,
                appMode: 'STANDARD',
                settings: settings as unknown as AppSettings,
                herkunft: 'Server'
            });
        }

        let analysis: any;

        const isComplex = validation.data.isComplex === true;
        
        // In local instances (Desktop/Community), the "High Accuracy" toggle (isComplex)
        // should stay on Mistral (if Mistral is selected) but switch to the 'mistral-medium-latest' model.
        // In SaaS mode (where we manage centralized billing/scaling), we keep the default behavior of routing isComplex to OpenAI/Qwen.
        const useOpenAI = settings.provider === 'openai-compatible' || (isComplex && !isLocalInstance());

        if (settings.provider === 'ollama') {
            analysis = await executeOllamaRequest(
                'correction',
                { modelSolution, studentText, tasksLayout, expertProfileName, gradingMemory },
                settings as AppSettings
            );
        } else if (!useOpenAI) {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new AIConfigError('Mistral API-Key fehlt.');

            const mistralModel = 'mistral-medium-latest';

            analysis = await executeMistralRequest(
                'correction',
                { modelSolution, studentText, tasksLayout, expertProfileName },
                apiKey,
                { 
                    customPrompt: settings.correctionPrompt,
                    model: mistralModel,
                    enableThinking: settings.enableThinking,
                    temperature: settings.temperature,
                    topP: settings.topP,
                    maxTokens: settings.maxTokens,
                    gradingMemory,
                    activeSkillIds: settings.activeSkillIds,
                    customSkills: settings.customSkills
                }
            );
        } else {
            const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

            analysis = await executeOpenAIRequest(
                'correction',
                { modelSolution, studentText, tasksLayout, expertProfileName },
                baseUrl,
                apiKey,
                { 
                    model,
                    enableThinking: settings.enableThinking,
                    temperature: settings.temperature,
                    topP: settings.topP,
                    maxTokens: settings.maxTokens,
                    customPrompt: settings.correctionPrompt,
                    gradingMemory,
                    activeSkillIds: settings.activeSkillIds,
                    customSkills: settings.customSkills
                }
            );
        }

        // --- ATOMIC BILLING & TRACKING ---
        await performBillingAction({
            logtoId,
            module: 'correction',
            inputTokens: analysis.usage?.prompt_tokens || 0,
            outputTokens: analysis.usage?.completion_tokens || 0,
            creditCost: requiredCredits
        });

        // Cleanup usage from response before returning to client if desired
        delete analysis.usage;

        // Apply task mapping
        analysis = parseCorrectionResult(analysis, tasksLayout);
        if (expertProfileName) {
            analysis.expertProfile = expertProfileName;
        }
        res.status(200).json(analysis);

    } catch (error) {
        logger.error('AI Correct Error', { endpoint: req.url, message: toErrorMessage(error) });
        const { status, message } = resolveAiHttpError(error, 'Fehler bei der KI-Analyse.');
        res.status(status).json({ error: message });
    }
}, { isAi: true });
