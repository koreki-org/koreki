/**
 * CalcTrace Extraction — AI-Assisted Extraction of Given Steps
 *
 * Extract student values for the 'given' steps using LLMs.
 * Pure logic module (no React, no State).
 *
 * Architecture: src/lib/ (Pure Logic Layer)
 */

import { executeMistralRequest } from '../ai/mistral-provider';
import { executeOllamaRequest } from '../ai/ollama-logic';
import { executeOpenAIRequest } from '../ai/openai-provider';
import { isDesktopTarget } from '@/lib/env-context';
import { logger } from '@/lib/logger';
import type { CalcTrace } from './calc-trace-types';
import type { AppSettings } from '../../types';

/**
 * Extracts student answers for the 'given' steps of a CalcTrace from the student's text.
 * Runs isomorphically on client or server depending on environment and settings.
 */
export async function extractCalcTraceValues(
  studentText: string,
  trace: CalcTrace,
  appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
  settings: AppSettings,
  taskName?: string
): Promise<Record<string, number | null>> {
  try {
    if (!trace || !Array.isArray(trace.steps) || trace.steps.length === 0) {
      return {};
    }

    const payload = {
      studentText,
      expectedValues: trace.steps.map((s) => ({
        id: s.id,
        label: s.label,
        unit: s.unit || null,
      })),
      taskName,
    };

    let extracted: Record<string, any> = {};

    // 1. Perform Isomorphic Provider Call
    const isClientSide = appMode === 'PURE' || isDesktopTarget();

    if (isClientSide) {
      // Client-Side (PURE or local Desktop Ollama)
      if (settings?.provider === 'ollama') {
        extracted = await executeOllamaRequest('calc-trace-extraction', payload, settings);
      } else if (settings?.provider === 'openai-compatible') {
        const baseUrl = settings.openaiUrl || '';
        const apiKey = settings.openaiKey || '';
        extracted = await executeOpenAIRequest('calc-trace-extraction', payload, baseUrl, apiKey, {
          model: settings.openaiModel,
          temperature: 0.0,
          topP: 0.1,
          maxTokens: 4000,
        });
      } else {
        const mistralKey = settings?.mistralKey;
        if (!mistralKey) throw new Error('PURE_KEY_MISSING');
        extracted = await executeMistralRequest('calc-trace-extraction', payload, mistralKey, {
          model: settings?.model,
          temperature: 0.0,
          topP: 0.1,
          maxTokens: 1000,
        });
      }
    } else {
      // Server-Side (STANDARD mode execution)
      if (typeof window === 'undefined') {
        if (settings.provider === 'ollama') {
          extracted = await executeOllamaRequest('calc-trace-extraction', payload, settings);
        } else if (settings.provider === 'mistral') {
          const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
          if (!apiKey) throw new Error('Mistral API-Key fehlt.');
          extracted = await executeMistralRequest('calc-trace-extraction', payload, apiKey, {
            model: settings.model,
            temperature: 0.0,
            topP: 0.1,
            maxTokens: 1000,
          });
        } else {
          const baseUrl =
            settings.openaiUrl ||
            process.env.OPENAI_API_BASE ||
            process.env.OPENAI_API_URL ||
            'https://llm.aihosting.mittwald.de/v1';
          const apiKey =
            settings.openaiKey ||
            process.env.OPENAI_API_KEY ||
            process.env.MITTWALD_API_KEY;
          const model =
            settings.openaiModel ||
            process.env.OPENAI_API_MODEL ||
            process.env.OPENAI_MODEL ||
            'Qwen3.6-35B-A3B-FP8';
          if (!apiKey) throw new Error('OpenAI/Mittwald API-Key fehlt.');

          extracted = await executeOpenAIRequest('calc-trace-extraction', payload, baseUrl, apiKey, {
            model,
            temperature: 0.0,
            topP: 0.1,
            maxTokens: 4000,
          });
        }
      } else {
        return {};
      }
    }

    // 2. Normalization: Clean extracted values to numbers or nulls
    const result: Record<string, number | null> = {};
    for (const step of trace.steps) {
      const raw = extracted[step.id];
      if (raw !== undefined && raw !== null) {
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
        result[step.id] = isNaN(num) ? null : num;
      } else {
        result[step.id] = null;
      }
    }

    return result;
  } catch (err) {
    logger.error('[CalcTrace Extraction] LLM Variable Extraction failed:', err);
    return {};
  }
}
