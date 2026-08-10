import { AIConfigError, resolveAiHttpError } from '@/lib/ai/provider-error';
import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { parseCorrectionResult, extractStudentAnswersWithLLM, shouldDisablePoints } from '@/lib/ai/ai-orchestrator';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { CorrectionSchema } from '@/lib/validation';
import { AppSettings } from '@/types';
import { checkAiBudget, checkCreditsAvailable, performBillingAction, resolveActiveWorkspace } from '@/lib/billing';
import { sanitizeClientAiSettings } from '@/lib/ai/client-settings-gate';
import { logger } from '@/lib/logger';
import { isLocalInstance } from '@/lib/env-context';
import { GraphRunner } from '@/lib/grading/GraphRunner';
import { splitTextByTasks } from '@/lib/task-utils';
import { evaluateCalcTrace } from '@/lib/grading/CalcTrace';
import { extractStudentAST } from '@/lib/grading/calc-trace-extraction';

import { withSecurity, AuthenticatedRequest } from '@/lib/security';
import { requireOpenAiConnection } from '@/lib/ai/provider-connection';

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

        const { claims } = req.user;
        const logtoId = claims.sub;

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

        // --- DETECT DETERMINISTIC GRAPH-BASED TASKS & EVALUATE LOCALLY (PANG Architecture) ---
        if (tasksLayout && Array.isArray(tasksLayout)) {
            const activeSkillIds = settings?.activeSkillIds || [];
            const customSkills = settings?.customSkills || {};
            
            // Partition student text by tasks
            const rawSplit = splitTextByTasks(studentText, tasksLayout);

            for (let i = 0; i < tasksLayout.length; i++) {
                const task = tasksLayout[i];
                const hasAttachedGraph = !!task.gradingGraph;
                const isGraphSkill = task.taskType && (
                    task.taskType === 'vlsm' || 
                    (activeSkillIds.includes(task.taskType) && (
                        task.taskType.startsWith('skill-calc-') || 
                        customSkills[task.taskType]?.isGraphBased
                    ))
                );

                const hasAttachedCalcTrace = !!task.calcTrace; // Fallback
                const hasTargetGoal = !!task.targetGoal;
                const isCalcTraceSkill = task.taskType === 'calc-trace' || (task.taskType && (
                    customSkills[task.taskType]?.isCalcTrace
                ));

                if (hasAttachedGraph) {
                    try {
                        const studentTaskText = rawSplit[i] || "";
                        const taskSpecificText = (studentTaskText && studentTaskText.trim().length > 0) ? studentTaskText : studentText;
                        
                        
                        const studentValues = await extractStudentAnswersWithLLM(taskSpecificText, task.gradingGraph, 'STANDARD', settings as unknown as AppSettings, task.taskType, task.name);

                        const gradingResult = GraphRunner.grade(task.gradingGraph, studentValues);
                        task.gradingResult = gradingResult;

                        const disablePointsActive = shouldDisablePoints(task.taskType, task.gradingGraph);
                        if (!disablePointsActive) {
                            task.pointsObtained = gradingResult.totalPoints;
                            task.maxPoints = gradingResult.maxPoints;
                        }
                    } catch (err: any) {
                        logger.error('Error in local GraphRunner execution', { taskName: task.name, error: err.message });
                    }
                } else if (hasTargetGoal || hasAttachedCalcTrace || isCalcTraceSkill) {
                    try {
                        const studentTaskText = rawSplit[i] || "";
                        const taskSpecificText = (studentTaskText && studentTaskText.trim().length > 0) ? studentTaskText : studentText;
                        
                        const targetGoal = task.targetGoal || customSkills[task.taskType]?.targetGoal || { targetValue: 0, maxPoints: task.maxPoints || 0 };
                        
                        let astResult = await extractStudentAST(taskSpecificText, 'STANDARD', settings as unknown as AppSettings, task.name);
                        let calcTraceResult = evaluateCalcTrace(astResult, targetGoal);
                        
                        let retryCount = 0;
                        const isOllama = settings.provider === 'ollama';
                        const maxRetries = isOllama ? 1 : 2;
                        const shouldRetryCalcTrace = () => 
                            !calcTraceResult?.isGoalReached && 
                            calcTraceResult?.ast && calcTraceResult.ast.length > 0 && 
                            calcTraceResult?.sandboxErrors && calcTraceResult.sandboxErrors.some(err => !err.startsWith('Rechenfehler'));

                        while (shouldRetryCalcTrace() && retryCount < maxRetries) {
                            const extractionErrors = calcTraceResult.sandboxErrors.filter(err => !err.startsWith('Rechenfehler'));
                            logger.warn(`[Server] CalcTrace Sandbox validation failed (extraction errors). Retrying self-correction (${retryCount + 1}/${maxRetries}):`, extractionErrors);
                            
                            const correctionInstruction = `Die mathematische Sandbox hat Fehler in deinem extrahierten AST gefunden:\n${extractionErrors.join('\n')}\nBitte extrahiere den AST neu, beachte die Syntax für mathjs, und erfinde keine Rechenschritte, die der Schüler nicht gemacht hat.`;
                            try {
                                astResult = await extractStudentAST(taskSpecificText, 'STANDARD', settings as unknown as AppSettings, task.name, astResult, correctionInstruction);
                            } catch (retryErr: unknown) {
                                // Der erste Durchlauf hat ein verwertbares Ergebnis geliefert. Ein
                                // gescheiterter Nachbesserungsversuch darf es nicht verwerfen.
                                const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
                                logger.warn('[Server] CalcTrace self-correction retry failed, keeping previous result.', { taskName: task.name, error: retryMessage });
                                break;
                            }
                            calcTraceResult = evaluateCalcTrace(astResult, targetGoal);
                            retryCount++;
                        }
                        
                        task.calcTraceResult = calcTraceResult;

                        // Vorrang hat die in der Oberflaeche gesetzte Punktzahl der Aufgabe.
                        const eigenePunkte = Number(task.maxPoints ?? 0);
                        if (eigenePunkte > 0) {
                            if (targetGoal.maxPoints && targetGoal.maxPoints !== eigenePunkte) {
                                logger.warn(`[Server] TargetGoal nennt ${targetGoal.maxPoints} Punkte, die Aufgabe ${eigenePunkte}. Es gilt die Aufgabe.`, { taskName: task.name });
                            }
                        } else {
                            task.maxPoints = targetGoal.maxPoints || task.maxPoints;
                        }
                    } catch (err: any) {
                        // Kein calcTraceResult -> die Aufgabe laeuft in den Warnhinweis "ohne
                        // Sandbox-Pruefung, bitte manuell gegenpruefen" statt in 0 Punkte.
                        logger.error('[Server] CalcTrace execution failed — task falls back to manual review.', { taskName: task.name, error: err.message });
                    }
                }
            }
        }

        const effectivePageCount = Math.max(1, pageCount || 1);
        const requiredCredits = effectivePageCount * 1;

        if (!settings) {
            return res.status(400).json({ error: 'Einstellungen fehlen.' });
        }

        // Guthaben VOR dem Anbieter-Aufruf pruefen — die Abrechnung unten laeuft
        // erst danach und wuerde die Kosten sonst bereits ausgeloest haben.
        const creditError = await checkCreditsAvailable(logtoId!, requiredCredits);
        if (creditError) {
            return res.status(402).json({ error: creditError });
        }

        // --- AI Cost Brake (Saeule 7): absoluter Monatsdeckel der Instanz ---
        const budgetError = await checkAiBudget('correction');
        if (budgetError) {
            return res.status(429).json({ error: budgetError });
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

    } catch (error: any) {
        logger.error('AI Correct Error', { endpoint: req.url, message: error instanceof Error ? error.message : String(error) });
        const { status, message } = resolveAiHttpError(error, 'Fehler bei der KI-Analyse.');
        res.status(status).json({ error: message });
    }
}, { isAi: true });
