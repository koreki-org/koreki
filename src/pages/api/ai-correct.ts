import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { parseCorrectionResult, extractStudentAnswersWithLLM } from '@/lib/ai/ai-orchestrator';
import { executeMistralRequest } from '@/lib/ai/mistral-provider';
import { executeOpenAIRequest } from '@/lib/ai/openai-provider';
import { CorrectionSchema } from '@/lib/validation';
import { performBillingAction, resolveActiveWorkspace } from '@/lib/billing';
import { logger } from '@/lib/logger';
import { isLocalInstance } from '@/lib/env-context';
import { GraphRunner } from '@/lib/grading/GraphRunner';

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

        // --- COMPLIANCE EARLY GATEKEEPER ---
        await resolveActiveWorkspace(logtoId);

        // --- DETECT DETERMINISTIC GRAPH-BASED TASKS & EVALUATE LOCALLY (PANG Architecture) ---
        if (tasksLayout && Array.isArray(tasksLayout)) {
            const activeSkillIds = settings?.activeSkillIds || [];
            const customSkills = settings?.customSkills || {};
            
            for (const task of tasksLayout) {
                const isGraphTask = task.taskType && (
                    task.taskType === 'vlsm' || 
                    (activeSkillIds.includes(task.taskType) && (
                        task.taskType.startsWith('skill-calc-') || 
                        customSkills[task.taskType]?.isGraphBased
                    ))
                );

                if (isGraphTask && task.gradingGraph) {
                    try {
                        const studentValues = await extractStudentAnswersWithLLM(studentText, task.gradingGraph, 'STANDARD', settings as any, task.taskType);
                        const gradingResult = GraphRunner.grade(task.gradingGraph, studentValues);
                        task.gradingResult = gradingResult;
                        task.pointsObtained = gradingResult.totalPoints;
                        task.maxPoints = gradingResult.maxPoints;
                    } catch (err: any) {
                        logger.error('Error in local GraphRunner execution', { taskName: task.name, error: err.message });
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

        if (!useOpenAI) {
            const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Mistral API-Key fehlt.');

            // Use the new, math-optimized 'mistral-medium-2604' when "High Accuracy" is toggled.
            // Otherwise, respect the user's selected model from their profile settings (settings.model).
            const mistralModel = (isComplex && settings.provider === 'mistral') 
                ? 'mistral-medium-2604' 
                : settings.model;

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
