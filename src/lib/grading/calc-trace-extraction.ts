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
          unit: { type: "string", description: "the physical unit the student wrote next to the result (e.g. 'mA', 'kΩ', 'W', 'V'). Omit if no unit was written." },
          formulaUnit: { type: "string", description: "the physical unit the raw numbers in the 'formula' correspond to (e.g. 'cm', 'kΩ'). Omit if same scale as 'unit' or no difference." }
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
WICHTIG: Schreibe in 'formula' NUR den Rechenausdruck (z.B. '4 + 2.5'). Verwende KEINE Gleichheitszeichen oder Zuweisungen (wie 'R_ges =' oder 'x =') in der 'formula'!
WICHTIG: Nutze standardmäßige mathematische Funktionen (wie 'sqrt', 'sin', 'cos', 'tan') direkt ohne 'Math.'-Prefix (schreibe 'sqrt(100)' statt 'Math.sqrt(100)'), da dies zu Auswertungsfehlern führt.
WICHTIG: Verwende in Variablen keine geschweiften Klammern (nutze 'R_total' statt 'R_{total}').
WICHTIG (Einheiten-Umrechnungen & Ketten-Gleichungen): Wenn der Schüler Kettenrechnungen durchführt (z.B. '2300 * 5/60 = 191.66 = 0.1916 kWh' oder 'A = B = C'), darfst du NIEMALS versuchen, alles in eine einzige Formel zu pressen. Du MUSST solche Ketten in MEHRERE sequentielle 'steps' aufteilen!
Beispiel für '2300 * 5/60 = 191.66 = 0.1916 kWh':
- Schritt 1: 'formula': '2300 * 5/60', 'result': 191.66
Auf diese Weise bleibt die Mathematik pro Schritt (Proof A) immer zu 100% korrekt.
WICHTIG (Schritt-Referenzen): Nutze eine Schritt-ID-Referenz (z. B. 'step_1') in der Formel NUR, wenn der Schüler in diesem Schritt selbst KEINE explizite Zahl notiert hat, sondern implizit auf ein vorheriges Ergebnis verweist (z.B. bei 'I = U/R_ges = 12 / 6500' und später 'U1 = I * 4000'). Schreibt der Schüler hingegen eine explizite Zahl hin (z.B. 'U1 = 1.846 * 4000'), MUSST du genau diese Zahl wörtlich übernehmen, auch wenn sie aus einem vorherigen Schritt stammt!
WICHTIG (Dezimalpunkt, Einheiten in Formeln & formulaUnit):
- Verwende in 'formula' IMMER den Punkt (.) als Dezimaltrennzeichen, NIEMALS das Komma (,), selbst wenn der Schüler ein Komma notiert hat (z. B. '0,1916 * 0,30' -> formula: '0.1916 * 0.30').
- Schreibe in 'formula' die Einheiten und Präfixe direkt mit in die Formel, exakt so, wie sie der Schüler notiert hat (z. B. '4 kΩ * 1.846 mA' oder '230 V * 10 A'). 
  Erlaubt sind alle Standard-Abkürzungen wie 'V', 'A', 'W', 'ohm', 'kΩ', 'mA', 'kWh' etc.
  Beispiel: 'U1 = I*R1 = 4 kΩ * 1.846 * 10^-3 A' -> formula: '4 kΩ * 1.846 * 10^-3 A', result: 7.38, unit: 'V'.
  Beispiel: 'Rges = 4 kΩ + 2.5 kΩ = 6500 Ω' -> formula: '4 kΩ + 2.5 kΩ', result: 6500, unit: 'Ω'.
  Beispiel: 'W = P * t = 680 W * (30/60) h = 0.34 kWh' -> formula: '680 W * (30/60) h', result: 0.34, unit: 'kWh'.
  Auf diese Weise sind alle Formelberechnungen in der Sandbox automatisch einheiten-sensitiv!
- Falls der Schüler in seiner Formel KEINE Einheiten notiert hat (z. B. 'R = 3 + 1.5 = 4.5 kΩ'), schreibe die Formel ohne Einheiten ('3 + 1.5').
  Falls das Ergebnis eine andere Einheit/Skalierung hat als die Formelzahlen (z. B. Formelzahlen in kΩ, aber Ergebnis in Ω; oder Formelzahlen in cm, aber Ergebnis in m), trage im Feld 'formulaUnit' die Einheit der Formelzahlen (z. B. 'kΩ' oder 'cm') ein. Dies dient der Sandbox als Fallback zur korrekten Skalierungs-Umrechnung.
  Beispiel: 'R = 3 + 1.5 = 4500 Ω' (wo 3 und 1.5 für kΩ stehen) -> formula: '3 + 1.5', formulaUnit: 'kΩ', result: 4500, unit: 'Ω'.
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
❌ FALSCHE EXTRAKTION (Erfinde keine Formeln, wenn der Schüler keine Rechenoperation notiert hat!):
{"id":"step_1", "original_text": "2.5 GHz", "formula":"2.5 * 10^9", "result": 2500000000, "unit":"Hz"}
✅ KORREKTE EXTRAKTION (Nimm einfach die nackte Zahl als Formel, da es keinen Rechenausdruck gab):
{"id":"step_1", "original_text": "2.5 GHz", "formula":"2.5", "result": 2.5, "unit":"GHz"}

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Dieses Objekt MUSS genau einen Key namens "steps" enthalten. Der Wert von "steps" ist ein Array. Jedes Objekt in diesem Array MUSS die Keys "id", "original_text", "formula" und "result" haben. Optional: "unit", "formulaUnit". Verwende keine anderen Keys!`;

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
