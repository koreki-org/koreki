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
          original_text: { type: "string", description: "The EXACT raw text the student wrote for this step (e.g. '23 V x 10 A = 2300 W'). MUST be extracted 1:1." },
          formula: { type: "string", description: "mathjs compatible formula string, referencing previous step ids if needed" },
          result: { type: "number", description: "the actual number the student wrote down as the result for this step" },
          unit: { type: "string", description: "the physical unit the student wrote next to the result (e.g. 'mA', 'kΩ', 'W', 'V'). Omit if no unit was written." }
        },
        required: ["id", "original_text", "formula", "result"]
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
WICHTIG (Einheiten-Umrechnungen & Ketten-Gleichungen): Wenn der Schüler Kettenrechnungen durchführt (z.B. '2300 * 5/60 = 191.66 = 0.1916 kWh' oder 'A = B = C'), darfst du NIEMALS versuchen, alles in eine einzige Formel zu pressen. Du MUSST solche Ketten in MEHRERE sequentielle 'steps' aufteilen!
Beispiel für '2300 * 5/60 = 191.66 = 0.1916 kWh':
- Schritt 1: 'formula': '2300 * 5/60', 'result': 191.66
- Schritt 2 (Einheitenumrechnung): 'formula': 'step_1 / 1000', 'result': 0.1916, 'unit': 'kWh'
Auf diese Weise bleibt die Mathematik pro Schritt (Proof A) immer zu 100% korrekt.
Wenn der Schüler ein Zwischenergebnis nutzt, setze die 'id' des vorherigen Schritts (z.B. step_1) in die Formel ein.
Trage EXAKT das vom Schüler notierte Ergebnis als echte JSON-Zahl im Feld 'result' ein.
WICHTIG (Einheiten): Wenn der Schüler eine physikalische Einheit neben dem Ergebnis notiert hat (z.B. '= 6500 Ω' oder '= 0,001846 mA'), extrahiere diese Einheit im Feld 'unit'. Verwende die Standardabkürzung (z.B. 'A', 'mA', 'V', 'kΩ', 'W', 'kWh'). Wenn KEINE Einheit notiert wurde, lasse das Feld 'unit' weg.

🚨 KRITISCH: KORRIGIERE NIEMALS DIE RECHNUNG DES SCHÜLERS! Du bist ein stumpfer Daten-Parser!
Wenn der Schüler einen offensichtlichen Rechenfehler macht (z.B. 12 * 4 = 50), MUSST du genau diese falschen Zahlen extrahieren!
Es ist ABSOLUT VERBOTEN, das 'result' an die 'formula' anzupassen, oder die 'formula' an das 'result' anzupassen. Schreibe STUMPF ab, was der Schüler notiert hat.

BEISPIEL FÜR RECHENFEHLER DES SCHÜLERS:
Schülertext: "F = m * a = 12 kg * 4 m/s² = 50 N"
❌ FALSCHE EXTRAKTION (Du hast das Ergebnis korrigiert, damit die Mathe stimmt! Das zerstört unser Fehlererkennungs-System!): 
{"id":"step_1", "original_text": "F = m * a = 12 kg * 4 m/s² = 50 N", "formula":"12 * 4", "result": 48, "unit":"N"}
✅ KORREKTE EXTRAKTION (Stumpf abgetippt was dort steht, auch wenn es mathematisch falsch ist):
{"id":"step_1", "original_text": "F = m * a = 12 kg * 4 m/s² = 50 N", "formula":"12 * 4", "result": 50, "unit":"N"}

BEISPIEL FÜR NACKTES ENDERGEBNIS (Kein Rechenweg):
Schülertext: "2.5 GHz"
❌ FALSCHE EXTRAKTION (Erfinde keine Formeln oder löse SI-Präfixe auf!):
{"id":"step_1", "original_text": "2.5 GHz", "formula":"2.5 * 10^9", "result": 2500000000, "unit":"Hz"}
✅ KORREKTE EXTRAKTION (Nimm einfach die nackte Zahl als Formel):
{"id":"step_1", "original_text": "2.5 GHz", "formula":"2.5", "result": 2.5, "unit":"GHz"}

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Dieses Objekt MUSS genau einen Key namens "steps" enthalten. Der Wert von "steps" ist ein Array. Jedes Objekt in diesem Array MUSS die Keys "id", "original_text", "formula" und "result" haben. Optional: "unit". Verwende keine anderen Keys!`;

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
            model: 'mistral-medium-2604', // Always use the highly capable medium model for extraction
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
