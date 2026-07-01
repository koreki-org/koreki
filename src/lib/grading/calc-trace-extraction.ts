/**
 * CalcTrace Extraction — AI-Assisted Extraction of Student AST
 *
 * Extract student mathematical steps into an AST for Sandbox evaluation.
 * Pure logic module (no React, no State).
 */

import { executeMistralRequest } from '../ai/mistral-provider';
import { executeOllamaRequest } from '../ai/ollama-logic';
import { executeOpenAIRequest } from '../ai/openai-provider';
import { isDesktopTarget } from '@/lib/env-context';
import { logger } from '@/lib/logger';
import type { StudentASTStep } from './calc-trace-types';
import type { AppSettings } from '../../types';

export const STUDENT_AST_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "step_1, step_2, etc." },
          formula: { type: "string", description: "mathjs compatible formula string, referencing previous step ids if needed" },
          result: { type: "number", description: "the actual number the student wrote down as the result for this step" }
        },
        required: ["id", "formula", "result"]
      }
    }
  },
  required: ["steps"]
};

/**
 * Extracts student answers into an AST.
 */
export async function extractStudentAST(
  studentText: string,
  appMode: 'PURE' | 'STANDARD' | 'TRIAL' | undefined,
  settings: AppSettings,
  taskName?: string,
  previousAST?: StudentASTStep[],
  correctionInstruction?: string
): Promise<StudentASTStep[]> {
  try {
    const systemPrompt = `Du bist eine hochpräzise Extraktions-KI für mathematische Aufgaben.
Deine Aufgabe ist es, den Rechenweg des Schülers Schritt für Schritt zu extrahieren.
Wandle die Rechnungen in 'mathjs' kompatible Formeln um. WICHTIG: Nutze KEINE Einheiten in den Formeln!
WICHTIG: Schreibe in 'formula' NUR den Rechenausdruck (z.B. '4000 + 2500'). Verwende KEINE Gleichheitszeichen oder Zuweisungen (wie 'R_ges =' oder 'x =') in der 'formula'!
WICHTIG: Verwende in Variablen keine geschweiften Klammern (nutze 'R_total' statt 'R_{total}').
WICHTIG (Einheiten-Umrechnungen): Wenn der Schüler in seinem Ergebnis implizit eine andere Größenordnung verwendet (z.B. er rechnet numerisch in 'Wh', schreibt das Ergebnis aber als 'kWh', oder rechnet in 'A' und notiert 'mA'), MUSST du diesen Umrechnungsfaktor mathematisch zwingend an die Formel anhängen (z.B. '* 1000' oder '/ 1000' oder '* 10^-3'), damit die extrahierte Gleichung rein numerisch wieder korrekt ist!
Wenn der Schüler ein Zwischenergebnis nutzt, setze die 'id' des vorherigen Schritts (z.B. step_1) in die Formel ein.
Trage EXAKT das vom Schüler notierte Ergebnis als echte JSON-Zahl im Feld 'result' ein.
🚨 KRITISCH: KORRIGIERE NIEMALS DIE RECHNUNG ODER DAS ERGEBNIS DES SCHÜLERS! Wenn der Schüler z.B. "23 * 10 = 2300" schreibt, MUSST du "formula": "23 * 10" und "result": 2300 extrahieren, auch wenn das mathematisch völlig falsch ist! Du bist ein stumpfer Daten-Parser, KEIN Korrektor! Wenn du die Zahlen korrigierst, zerstörst du unser System!
WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Dieses Objekt MUSS genau einen Key namens "steps" enthalten. Der Wert von "steps" ist ein Array. Jedes Objekt in diesem Array MUSS exakt diese drei Keys haben: "id" (String), "formula" (String) und "result" (Number). Verwende keine anderen Keys!`;

    const payload = {
      studentText,
      taskName,
      systemPrompt,
      previousAST,
      correctionInstruction
    };

    let extracted: any = { steps: [] };

    const isClientSide = appMode === 'PURE' || isDesktopTarget();

    if (isClientSide) {
      if (settings?.provider === 'ollama') {
        extracted = await executeOllamaRequest('calc-trace-extraction', payload, settings, undefined, { responseSchema: STUDENT_AST_SCHEMA });
      } else if (settings?.provider === 'openai-compatible') {
        const baseUrl = settings.openaiUrl || '';
        const apiKey = settings.openaiKey || '';
        extracted = await executeOpenAIRequest('calc-trace-extraction', payload, baseUrl, apiKey, {
          model: settings.openaiModel,
          temperature: 0.0,
          topP: 0.1,
          maxTokens: 4000,
          responseSchema: STUDENT_AST_SCHEMA
        });
      } else {
        const mistralKey = settings?.mistralKey;
        if (!mistralKey) throw new Error('PURE_KEY_MISSING');
        extracted = await executeMistralRequest('calc-trace-extraction', payload, mistralKey, {
          model: settings?.model,
          temperature: 0.0,
          topP: 0.1,
          maxTokens: 1000,
          responseSchema: STUDENT_AST_SCHEMA
        });
      }
    } else {
      // Server-Side execution logic
      if (typeof window === 'undefined') {
        if (settings.provider === 'ollama') {
          extracted = await executeOllamaRequest('calc-trace-extraction', payload, settings, undefined, { responseSchema: STUDENT_AST_SCHEMA });
        } else if (settings.provider === 'mistral') {
          const apiKey = settings.mistralKey || process.env.MISTRAL_API_KEY;
          if (!apiKey) throw new Error('Mistral API-Key fehlt.');
          extracted = await executeMistralRequest('calc-trace-extraction', payload, apiKey, {
            model: settings.model,
            temperature: 0.0,
            topP: 0.1,
            maxTokens: 1000,
            responseSchema: STUDENT_AST_SCHEMA
          });
        } else {
          const baseUrl = settings.openaiUrl || process.env.OPENAI_API_BASE || process.env.OPENAI_API_URL || 'https://llm.aihosting.mittwald.de/v1';
          const apiKey = settings.openaiKey || process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
          const model = settings.openaiModel || process.env.OPENAI_API_MODEL || process.env.OPENAI_MODEL || 'Qwen3.6-35B-A3B-FP8';
          if (!apiKey) throw new Error('OpenAI/Mittwald API-Key fehlt.');

          extracted = await executeOpenAIRequest('calc-trace-extraction', payload, baseUrl, apiKey, {
            model,
            temperature: 0.0,
            topP: 0.1,
            maxTokens: 4000,
            responseSchema: STUDENT_AST_SCHEMA
          });
        }
      } else {
        return [];
      }
    }

    if (typeof extracted === 'string') {
        try {
            extracted = JSON.parse(extracted);
        } catch(e) {}
    }

    return extracted?.steps || [];
  } catch (err) {
    logger.error('[CalcTrace AST Extraction] LLM failed:', err);
    return [];
  }
}
