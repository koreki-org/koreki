import { logger } from '@/lib/logger';
import { AppSettings } from '../../types';
import { executeMistralRequest } from './mistral-provider';
import { executeOllamaRequest } from './ollama-logic';
import { executeOpenAIRequest } from './openai-provider';
import { isDesktopTarget } from '@/lib/env-context';
import { GradingGraph, GradingScalar } from '../grading/types';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { splitSkillSnippet } from './prompt-library';
import { requireOpenAiConnection } from './provider-connection';
import { apiClient } from '../api-client';

/**
 * Robustly extracts student answers from free-text using a dedicated, fast LLM call (variable-extraction).
 * If the LLM extraction fails or returns incomplete values, it seamlessly merges/falls back to the legacy heuristics.
 */
export async function extractStudentAnswersWithLLM(
    studentText: string,
    graph: GradingGraph,
    appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
    settings: AppSettings,
    taskType?: string,
    taskName?: string
): Promise<Record<string, GradingScalar>> {
    // 1. Establish baseline (Deactivated legacy "Schicht A" regex-based heuristics per user & architectural requirement)
    if (!settings) {
        return {};
    }

    // Look up extraction instructions from the modular skill if taskType is specified
    let extractionInstructions: string | undefined;
    if (taskType) {
        let skillKey = taskType;
        if (skillKey === 'vlsm') {
            skillKey = 'skill-calc-vlsm';
        }
        
        const skillEntry = SKILL_REGISTRY[skillKey];
        if (skillEntry) {
            const { extractionSnippet } = splitSkillSnippet(skillEntry.promptSnippet);
            if (extractionSnippet) {
                extractionInstructions = extractionSnippet;
            }
        }
    }

    // [INDUSTRIAL DETERMINISTIC FALLBACK]
    // If taskType was missing, rely on the explicitly defined discipline in the GradingGraph.
    // This is mathematically safer than guessing by variable names (SOLID).
    if (!extractionInstructions && graph.discipline) {
        let skillKey = '';
        if (graph.discipline === 'networking') skillKey = 'skill-calc-vlsm';
        // Add more disciplines here as the system grows
        
        if (skillKey) {
            const skillEntry = SKILL_REGISTRY[skillKey];
            if (skillEntry) {
                const { extractionSnippet } = splitSkillSnippet(skillEntry.promptSnippet);
                if (extractionSnippet) {
                    extractionInstructions = extractionSnippet;
                }
            }
        }
    }

    try {
        let extracted: Record<string, unknown> = {};
        // Strip defaultValues to eliminate any force-fitting bias towards the expected master key
        const strippedVariables = graph.variables.map(v => {
            const copy = { ...v };
            delete copy.defaultValue;
            return copy;
        });

        const payload = {
            studentText,
            variables: strippedVariables,
            extractionInstructions,
            taskName
        };

        // 2. Perform Isomorphic Provider Call
        if (appMode === 'PURE' || isDesktopTarget()) {
            // Client-Side (PURE or local Ollama)
            if (settings?.provider === 'ollama') {
                extracted = await executeOllamaRequest('variable-extraction', payload, settings);
            } else if (settings?.provider === 'openai-compatible') {
                const baseUrl = settings.openaiUrl || '';
                const apiKey = settings.openaiKey || '';
                extracted = await executeOpenAIRequest('variable-extraction', payload, baseUrl, apiKey, {
                    model: settings.openaiModel,
                    temperature: 0.0,
                    topP: 0.1,
                    maxTokens: 4000
                });
            } else {
                const mistralKey = settings?.mistralKey;
                if (!mistralKey) throw new Error("PURE_KEY_MISSING");
                extracted = await executeMistralRequest('variable-extraction', payload, mistralKey, {
                    model: settings?.model,
                    temperature: 0.0,
                    topP: 0.1,
                    maxTokens: 1000
                });
            }
        } else {
            // Server-Side (STANDARD mode execution) - directly invoke provider (isomorphic optimization)
            if (typeof window === 'undefined') {
                if (settings.provider === 'ollama') {
                    extracted = await executeOllamaRequest('variable-extraction', payload, settings);
                } else if (settings.provider === 'mistral') {
                    const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
                    if (!apiKey) throw new Error('Mistral API-Key fehlt.');
                    extracted = await executeMistralRequest(
                        'variable-extraction',
                        payload,
                        apiKey,
                        {
                            model: settings.model,
                            temperature: 0.0,
                            topP: 0.1,
                            maxTokens: 1000
                        }
                    );
                } else {
                    const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

                    extracted = await executeOpenAIRequest(
                        'variable-extraction',
                        payload,
                        baseUrl,
                        apiKey,
                        {
                            model,
                            temperature: 0.0,
                            topP: 0.1,
                            maxTokens: 4000
                        }
                    );
                }
            } else {
                return {};
            }
        }



        // 3. Robust Filtering & Type-safe Normalization
        const merged: Record<string, GradingScalar> = {};

        if (extracted && typeof extracted === 'object') {
            for (const variable of graph.variables) {
                const rawVal = extracted[variable.id];
                if (rawVal === undefined || rawVal === null) continue;

                if (typeof rawVal === 'string') {
                    const trimmed = rawVal.trim();
                    const isNumber = /^-?\d+(\.\d+)?$/.test(trimmed);
                    merged[variable.id] = isNumber ? parseFloat(trimmed) : trimmed;
                } else if (typeof rawVal === 'number' || typeof rawVal === 'boolean') {
                    merged[variable.id] = rawVal;
                } else {
                    // Objekt oder Liste. Die Engine vergleicht Skalare — ein Objekt
                    // haette dort still jeden Vergleich verloren und die Aufgabe als
                    // falsch bewertet. Vorher landete es trotzdem in der Auswertung,
                    // weil der Typ `any` war und niemand hinsah.
                    logger.warn('Variablen-Extraktion: unerwarteter Werttyp verworfen', {
                        variableId: variable.id,
                        typ: Array.isArray(rawVal) ? 'array' : typeof rawVal
                    });
                }
            }
        }



        return merged;
    } catch (err) {
        logger.error('LLM Variable Extraction failed:', err);

        return {};
    }
}
