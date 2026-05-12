import { apiClient } from '../api-client';
import { Task, AppSettings } from '../../types';
import { executeMistralRequest } from './mistral-provider';
import { executeOllamaRequest } from './ollama-logic';
import { executeOpenAIRequest } from './openai-provider';
import { isLocalInstance } from '@/lib/env-context';

/**
 * Maps the AI raw JSON results back to the Koreki Task structure and calculates totals.
 */
export function parseCorrectionResult(analysis: any, tasksLayout?: Task[] | null, studentText?: string): any {
    if (tasksLayout && Array.isArray(tasksLayout) && tasksLayout.length > 0) {
        let totalObtained = 0;
        let totalMax = 0;

        tasksLayout.forEach((lt: any) => totalMax += Number(lt.maxPoints || 0));

        let hasMappingError = false;
        let hasMarkerIssue = false;

        const mappedTasks = tasksLayout.map((layoutTask: any) => {
            const aiTask = (analysis.tasks || []).find((t: any) => t.name === layoutTask.name);

            if (aiTask) {
                const obtained = Number(aiTask.pointsObtained || 0);
                totalObtained += obtained;
                
                let confidence = Number(aiTask.confidence || 0);
                
                // --- MARKER PENALTY ---
                // If the cleaned text contains (?) markers, confidence MUST be < 90
                if (aiTask.content?.includes('(?)')) {
                    hasMarkerIssue = true;
                    if (confidence >= 90) confidence = 89;
                }

                return {
                    name: layoutTask.name,
                    maxPoints: layoutTask.maxPoints,
                    pointsObtained: obtained,
                    feedback: aiTask.feedback || '',
                    confidence: confidence,
                    content: aiTask.content || ''
                };
            } else {
                const nearMiss = (analysis.tasks || []).find((t: any) => 
                    t.name?.toLowerCase().trim() === layoutTask.name.toLowerCase().trim()
                );

                if (nearMiss) {
                    // SOFT ERROR: Case mismatch or whitespace issues -> Keep Confidence, but show warning
                    const obtained = Number(nearMiss.pointsObtained || 0);
                    totalObtained += obtained;

                    return {
                        name: layoutTask.name,
                        maxPoints: layoutTask.maxPoints,
                        pointsObtained: obtained,
                        feedback: `[KI-FEHLER?] Name nicht exakt ("${nearMiss.name}" statt "${layoutTask.name}")\n\n${nearMiss.feedback || ''}`,
                        confidence: Number(nearMiss.confidence || 0),
                        content: nearMiss.content || ''
                    };
                } else {
                    // HARD ERROR: Task completely missing in AI response
                    hasMappingError = true;
                    return {
                        name: layoutTask.name,
                        maxPoints: layoutTask.maxPoints,
                        pointsObtained: 0,
                        feedback: 'Vom System nicht erkannt oder von der KI übersprungen.',
                        confidence: 0,
                        content: ''
                    };
                }
            }
        });

        analysis.tasks = mappedTasks;
        analysis.overallMatchPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        
        // --- INDUSTRIAL CONFIDENCE BRAKE ---
        // If the structure is broken (naming mismatch) or too many OCR problems, the entire document requires review.
        if (hasMappingError || hasMarkerIssue) {
            analysis.confidence = 0;
        } else {
            analysis.confidence = Number(analysis.confidence || 0);
        }
    } else if (analysis.tasks && Array.isArray(analysis.tasks)) {
        let totalObtained = 0;
        let totalMax = 0;
        analysis.tasks.forEach((task: any) => {
            totalObtained += Number(task.pointsObtained || 0);
            totalMax += Number(task.maxPoints || 0);
        });
        analysis.overallMatchPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    }

    return analysis;
}

/**
 * Parses mapping results (Clean & Map phase) to surface early mapping errors.
 */
export function parseMappingResult(result: any, tasksLayout?: Task[] | null): any {
    if (!tasksLayout || !Array.isArray(tasksLayout)) return result;

    const mappedTasks = tasksLayout.map((layoutTask: any) => {
        const aiTask = (result.tasks || []).find((t: any) => t.name === layoutTask.name);
        if (aiTask) {
            return aiTask;
        } else {
            const nearMiss = (result.tasks || []).find((t: any) => 
                t.name?.toLowerCase().trim() === layoutTask.name.toLowerCase().trim()
            );

            return {
                name: layoutTask.name,
                content: nearMiss 
                    ? `[KI-FEHLER?] Name nicht exakt ("${nearMiss.name}" statt "${layoutTask.name}")]\n\n${nearMiss.content}`
                    : '[unbeantwortet]'
            };
        }
    });

    result.tasks = mappedTasks;
    return result;
}

/**
 * Orchestrates AI requests (Correction, Layout, Vision), choosing between direct Mistral API (PURE) or Koreki Backend (STANDARD).
 */
export async function performAIRequest(
    action: 'correction' | 'clean-and-analyze' | 'vision' | 'clean-and-map',
    payload: any, // ARCH: any required because payload structure varies by action (Correction vs Layout)
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
    settings: AppSettings
): Promise<any> {
    // --- HYBRID ORCHESTRATION ---
    // Rule: Ollama always runs client-side (PURE) even in STANDARD mode, 
    // because the backend cannot reach the user's local network.
    if (appMode === 'PURE' || settings?.provider === 'ollama') {
        const mistralKey = settings?.mistralKey;
        if (!mistralKey && settings?.provider === 'mistral') throw new Error("PURE_KEY_MISSING");

        let result: any;

        if (action === 'vision') {
            let combinedText = "";
            for (let i = 0; i < payload.buffers.length; i++) {
                const b64 = payload.buffers[i];
                // Throttling for vision requests (Industrial Grade)
                if (i > 0) await new Promise(r => setTimeout(r, 800));

                let ocrData;
                if (settings?.provider === 'ollama') {
                    ocrData = await executeOllamaRequest('vision', { ...payload, buffer: b64 }, settings);
                } else if (settings?.provider === 'openai-compatible') {
                    const baseUrl = settings.openaiUrl || '';
                    const apiKey = settings.openaiKey || '';
                    ocrData = await executeOpenAIRequest('vision', { ...payload, buffer: b64 }, baseUrl, apiKey, {
                        model: settings.openaiModel,
                        temperature: settings.visionTemperature,
                        topP: settings.visionTopP,
                        maxTokens: settings.visionMaxTokens,
                        presencePenalty: settings.visionPresencePenalty
                    });
                } else {
                    ocrData = await executeMistralRequest('vision', { ...payload, buffer: b64 }, mistralKey);
                }
                combinedText += (combinedText ? "\n\n" : "") + (ocrData.text || "");
            }
            result = { text: combinedText };
        } else {
            // General AI Actions (Correction, Analyze, Map)
            if (settings?.provider === 'ollama') {
                result = await executeOllamaRequest(action, payload, settings);
            } else if (settings?.provider === 'openai-compatible') {
                const baseUrl = settings.openaiUrl || '';
                const apiKey = settings.openaiKey || '';
                result = await executeOpenAIRequest(action, payload, baseUrl, apiKey, {
                    model: settings.openaiModel,
                    enableThinking: settings.enableThinking,
                    temperature: settings.temperature,
                    topP: settings.topP,
                    maxTokens: settings.maxTokens,
                    presencePenalty: settings.presencePenalty,
                    customPrompt: settings?.correctionPrompt,
                    gradingMemory: payload.gradingMemory
                });
            } else {
                result = await executeMistralRequest(action, payload, mistralKey, {
                    customPrompt: settings?.correctionPrompt,
                    gradingMemory: payload.gradingMemory,
                    model: settings?.model,
                    enableThinking: settings?.enableThinking,
                    temperature: settings?.temperature,
                    topP: settings?.topP,
                    maxTokens: settings?.maxTokens
                });
            }

            if (action === 'correction') {
                result = parseCorrectionResult(result, payload.tasksLayout);
                if (payload.expertProfileName) {
                    result.expertProfile = payload.expertProfileName;
                }
            } else if (action === 'clean-and-map') {
                result = parseMappingResult(result, payload.tasksLayout);
            }
        }

        // Billing for PURE mode (Ping only, no data)
        // SKIPPED IN BYPASS MODE (Desktop/Community) or OLLAMA MODE
        if (!isLocalInstance() && settings?.provider !== 'ollama') {
            await apiClient.post('/api/billing/pure-deduct', {
                pageCount: payload.pageCount || (payload.buffers?.length) || 1,
                action: action
            });
        }

        return result;
    } else {
        const endpoint = action === 'correction' ? '/api/ai-correct' :
            action === 'clean-and-analyze' ? '/api/clean-and-analyze' :
                action === 'clean-and-map' ? '/api/clean-and-map' :
                    '/api/extract-image';

        const res = await apiClient.post(endpoint, { 
            ...payload, 
            studentText: payload.studentText || payload.text, 
            settings, 
            isComplex: payload.isComplex ?? (action === 'vision') 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'KI Anfrage fehlgeschlagen');

        if (action === 'correction') {
            const parsed = parseCorrectionResult(data, payload.tasksLayout);
            if (payload.expertProfileName) {
                parsed.expertProfile = payload.expertProfileName;
            }
            return parsed;
        } else if (action === 'clean-and-map') {
            return parseMappingResult(data, payload.tasksLayout);
        }

        return data;
    }
}
