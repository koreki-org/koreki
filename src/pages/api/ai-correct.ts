import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { parseCorrectionResult, extractStudentAnswersWithLLM, shouldDisablePoints } from '@/lib/ai/ai-orchestrator';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { executeOllamaRequest } from '@/lib/ai/ollama-logic';
import { CorrectionSchema } from '@/lib/validation';
import { AppSettings } from '@/types';
import { performBillingAction, resolveActiveWorkspace } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { isLocalInstance } from '@/lib/env-context';
import { GraphRunner } from '@/lib/grading/GraphRunner';
import { splitTextByTasks } from '@/lib/task-utils';
import { evaluateCalcTrace } from '@/lib/grading/CalcTrace';
import { extractStudentAST } from '@/lib/grading/calc-trace-extraction';

import { withSecurity, AuthenticatedRequest } from '@/lib/security';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
        const validation = CorrectionSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ error: validation.error.issues[0].message });
        }

        const { 
            modelSolution, 
            studentText, 
            settings, 
            tasksLayout, 
            pageCount, 
            expertProfileName,
            gradingMemory
        } = validation.data;

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
                        
                        
                        const studentValues = await extractStudentAnswersWithLLM(taskSpecificText, task.gradingGraph, 'STANDARD', settings as any, task.taskType, task.name);
                        
                        // Dump to file for agent to read
                        try {
                            const fs = require('fs');
                            const path = require('path');
                            fs.writeFileSync(path.join(process.cwd(), 'scratch', 'debug-pang.json'), JSON.stringify({
                                taskName: task.name,
                                taskSpecificText,
                                studentValues,
                                studentText: req.body.studentText || req.body.text || ""
                            }, null, 2));
                        } catch (e) {
                            logger.error(e);
                        }
                        
                        
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
                        
                        let astResult = await extractStudentAST(taskSpecificText, 'STANDARD', settings as any, task.name);
                        let calcTraceResult = evaluateCalcTrace(astResult, targetGoal);
                        
                        let retryCount = 0;
                        const isOllama = settings.provider === 'ollama';
                        const maxRetries = isOllama ? 1 : 2;
                        while (calcTraceResult.sandboxErrors.some(err => !err.startsWith('Rechenfehler')) && retryCount < maxRetries) {
                            const extractionErrors = calcTraceResult.sandboxErrors.filter(err => !err.startsWith('Rechenfehler'));
                            logger.warn(`[Server] CalcTrace Sandbox validation failed (extraction errors). Retrying self-correction (${retryCount + 1}/${maxRetries}):`, extractionErrors);
                            
                            const correctionInstruction = `Die mathematische Sandbox hat Fehler in deinem extrahierten AST gefunden:\n${extractionErrors.join('\n')}\nBitte extrahiere den AST neu, beachte die Syntax für mathjs, und erfinde keine Rechenschritte, die der Schüler nicht gemacht hat.`;
                            astResult = await extractStudentAST(taskSpecificText, 'STANDARD', settings as any, task.name, astResult, correctionInstruction);
                            calcTraceResult = evaluateCalcTrace(astResult, targetGoal);
                            retryCount++;
                        }
                        
                        task.calcTraceResult = calcTraceResult;
                        task.maxPoints = targetGoal.maxPoints || task.maxPoints;
                    } catch (err: any) {
                        logger.error('Error in server-side CalcTrace execution', { taskName: task.name, error: err.message });
                    }
                }
            }
        }

        const effectivePageCount = Math.max(1, pageCount || 1);
        const requiredCredits = effectivePageCount * 1;

        if (!settings) {
            return res.status(400).json({ error: 'Einstellungen fehlen.' });
        }

        // --- AI Cost Brake Check ---
        if (!isLocalInstance()) {
            const systemSettings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
            if (systemSettings) {
                const correctionCost = (systemSettings.correctionMonthlyUsage / 1_000_000) * systemSettings.correctionPricePerMillion;
                if (correctionCost >= systemSettings.correctionBudget) {
                    return res.status(429).json({ error: "Aktuell zu hohe Auslastung, bitte versuchen Sie es später erneut." });
                }
            }
        }

        let analysis: any;

        const isComplex = validation.data.isComplex === true;
        
        // In local instances (Desktop/Community), the "High Accuracy" toggle (isComplex)
        // should stay on Mistral (if Mistral is selected) but switch to the 'mistral-medium-latest' model.
        // In SaaS mode (where we manage centralized billing/scaling), we keep the default behavior of routing isComplex to OpenAI/Qwen.
        const useOpenAI = settings.provider === 'openai-compatible' || (isComplex && !isLocalInstance() && settings.provider !== 'mistral');

        if (settings.provider === 'ollama') {
            analysis = await executeOllamaRequest(
                'correction',
                { modelSolution, studentText, tasksLayout, expertProfileName, gradingMemory },
                settings as AppSettings
            );
        } else if (!useOpenAI) {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            // Use the math-optimized 'mistral-medium-2604' when "High Accuracy" is toggled.
            // Otherwise, respect the user's selected model from their profile settings (settings.model).
            const mistralModel = (isComplex && settings.provider === 'mistral') 
                ? 'mistral-medium-2604' 
                : (settings.model || 'mistral-medium-2604');

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
            const baseUrl = settings.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
            const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
            const model = settings.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';
            
            if (!apiKey) throw new Error('Mittwald/OpenAI API-Key fehlt.');
 
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
        const isComplianceError = error.message?.includes('Compliance') || error.message?.includes('AVV');
        const isCreditsError = error.message?.includes('Credits');
        const isRateLimit = error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit');

        const statusCode = isCreditsError ? 402 : isComplianceError ? 403 : isRateLimit ? 429 : 500;
        res.status(statusCode).json({ 
            error: isRateLimit 
                ? 'KI-Server überlastet. Bitte warten Sie ca. 30 Sekunden und versuchen es erneut.' 
                : (error.message || 'Fehler bei der KI-Analyse.')
        });
    }
});
