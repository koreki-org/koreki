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
import { requireOpenAiConnection } from '../ai/provider-connection';

/**
 * Signalisiert, dass die Extraktion technisch fehlgeschlagen ist (API-Fehler, unlesbare
 * Antwort, fehlender Key) — im Unterschied zu einer erfolgreichen Extraktion ohne Schritte.
 *
 * Die Unterscheidung ist bewertungsrelevant: Ein leerer AST heisst "der Schueler hat nichts
 * gerechnet" und fuehrt zu 0 Punkten. Ein Fehler heisst "nicht pruefbar" und muss in die
 * manuelle Nachkontrolle laufen, statt als Schuelerversagen ausgewertet zu werden.
 */
export class CalcTraceExtractionError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'CalcTraceExtractionError';
    // tsconfig target ist es5 — ohne das schlaegt `instanceof` bei Error-Subklassen fehl.
    Object.setPrototypeOf(this, CalcTraceExtractionError.prototype);
  }
}

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
          formulaUnit: { type: "string", description: "The unit of the numeric result of 'formula' BEFORE converting to 'unit'. Required if formula is unitless but has different scale than result. E.g. 'A' for formula '12/6500' yielding 0.001846, where result is 1.846 mA." }
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
Wandle die Rechnungen in 'mathjs' kompatible Formeln um.
WICHTIG: Schreibe in 'formula' NUR den Rechenausdruck (z.B. '4 + 2.5' oder '4 kΩ + 2.5 kΩ'). Verwende KEINE Gleichheitszeichen oder Zuweisungen (wie 'R_ges =' oder 'x =') in der 'formula'!
WICHTIG: Nutze standardmäßige mathematische Funktionen (wie 'sqrt', 'sin', 'cos', 'tan') direkt ohne 'Math.'-Prefix (schreibe 'sqrt(100)' statt 'Math.sqrt(100)'), da dies zu Auswertungsfehlern führt.
WICHTIG: Verwende in Variablen keine geschweiften Klammern (nutze 'R_total' statt 'R_{total}').
WICHTIG (Einheiten-Umrechnungen & Ketten-Gleichungen):
- Eine Kettenrechnung (die in separate Schritte aufgeteilt werden MUSS) liegt NUR dann vor, wenn in derselben Zeile nacheinander verschiedene Berechnungen oder Einheitenumrechnungen durchgeführt werden (z. B. '2300 * 5/60 = 191.66 = 0.1916 kWh' hat zwei Schritte: erst Multiplikation, dann Division durch 1000).
- Eine einzelne Berechnung oder Zuweisung wie 'P = U * I = 23 V * 10 A = 2300 W' ist ein EINZELNER Schritt. Du darfst eine solche Zeile NIEMALS aufteilen (z. B. in einen ersten Teil '23 * 10 = 230' und einen zweiten Teil '= 2300'), nur weil das vom Schüler notierte Ergebnis mathematisch fehlerhaft ist ($23 \times 10 \neq 2300$). Die Erkennung von Rechenfehlern ist Aufgabe der Sandbox. Extrahiere dies zwingend als einen einzelnen Schritt: 'formula': '23 V * 10 A', 'result': 2300, 'unit': 'W'.
- Teile echte Kettenrechnungen (z. B. '2300 * 5/60 = 191.66 = 0.1916 kWh') in separate, aufeinanderfolgende Schritte auf:
  * Schritt 1: 'formula': '2300 * 5/60', 'result': 191.66
  * Schritt 2: 'formula': '191.66 / 1000', 'result': 0.1916, 'unit': 'kWh'
WICHTIG (Schritt-Referenzen): Nutze eine Schritt-ID-Referenz (z. B. 'step_1') in der Formel NUR, wenn der Schüler in diesem Schritt selbst KEINE explizite Zahl notiert hat, sondern implizit auf ein vorheriges Ergebnis verweist (z.B. bei 'I = U/R_ges = 12 / 6500' und später 'U1 = I * 4000'). Schreibt der Schüler hingegen eine explizite Zahl hin (z.B. 'U1 = 1.846 * 4000'), MUSST du genau diese Zahl wörtlich übernehmen, auch wenn sie aus einem vorherigen Schritt stammt!
WICHTIG (Dezimalpunkt, Einheiten in Formeln & formulaUnit):
- Verwende in 'formula' IMMER den Punkt (.) als Dezimaltrennzeichen, NIEMALS das Komma (,), selbst wenn der Schüler ein Komma notiert hat (z. B. '0,1916 * 0,30' -> formula: '0.1916 * 0.30').
- Schreibe in 'formula' die Einheiten und Präfixe direkt mit in die Formel, exakt so, wie sie der Schüler notiert hat (z. B. '4 kΩ * 1.846 mA' oder '230 V * 10 A'). 
  Erlaubt sind alle Standard-Abkürzungen wie 'V', 'A', 'W', 'ohm', 'kΩ', 'mA', 'kWh' etc.
  Beispiel: 'U1 = I*R1 = 4 kΩ * 1.846 * 10^-3 A' -> formula: '4 kΩ * 1.846 * 10^-3 A', result: 7.38, unit: 'V'.
  Beispiel: 'Rges = 4 kΩ + 2.5 kΩ = 6.5 kΩ' -> formula: '4 kΩ + 2.5 kΩ', result: 6.5, unit: 'kΩ'.
  Beispiel: 'W = P * t = 680 W * (30/60) h = 0.34 kWh' -> formula: '680 W * (30/60) h', result: 0.34, unit: 'kWh'.
  Auf diese Weise sind alle Formelberechnungen in der Sandbox automatisch einheiten-sensitiv!
- Falls der Schüler in seiner Formel KEINE Einheiten notiert hat (z. B. 'R = 3 + 1.5 = 4.5 kΩ'), schreibe die Formel ohne Einheiten ('3 + 1.5').
  Falls das Ergebnis eine andere Skalierung/Einheit hat als das rein mathematische Ergebnis der Formel (z. B. wenn die Formel '12 / 6500' lautet, was 0.001846 ergibt, das Ergebnis aber als '1.846 mA' geschrieben wird), trage im Feld 'formulaUnit' die physikalische Einheit des mathematischen Formelergebnisses ein (in diesem Fall 'A' für Ampere). Dies ermöglicht der Sandbox die automatische Umrechnung.
  Beispiel: 'I = 12 / 6500 = 1.846 mA' -> formula: '12 / 6500', result: 1.846, unit: 'mA', formulaUnit: 'A'.
  Beispiel: 'R = 3 + 1.5 = 4500 Ω' (wo 3 und 1.5 für kΩ stehen) -> formula: '3 + 1.5', result: 4500, unit: 'Ω', formulaUnit: 'kΩ'.
Trage EXAKT das vom Schüler notierte Ergebnis als echte JSON-Zahl im Feld 'result' ein.
STRIKTE REGEL: Konvertiere oder skaliere den Wert NIEMALS! Wenn der Schüler "6.5" schreibt, extrahiere 6.5. Rechne es NIEMALS in "6500" um. Wenn keine Einheit dasteht, trage KEINE Einheit ein (unit: null/weglassen).
Beispiel: "R = 6,5" -> result: 6.5, unit: null (FALSCH: result: 6500, unit: Ω)
Beispiel: "R = 6,5 kΩ" -> result: 6.5, unit: "kΩ" (FALSCH: result: 6500, unit: Ω)

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

WICHTIG: Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Dieses Objekt MUSS genau einen Key namens "steps" enthalten. Der Wert von "steps" is ein Array. Jedes Objekt in diesem Array MUSS die Keys "id", "original_text", "formula" und "result" haben. Optional: "unit", "formulaUnit". Verwende keine anderen Keys!`;

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
          model: settings?.model || 'mistral-medium-latest',
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
            model: settings?.model || 'mistral-medium-latest', // Always use the highly capable medium model for extraction by default
            temperature: 0.0,
            topP: 0.1,
            maxTokens: 1000,
            responseSchema: STUDENT_AST_SCHEMA
          });
        } else {
          const { baseUrl, apiKey, model } = requireOpenAiConnection(settings);

          extracted = await executeOpenAIRequest('calc-trace-extraction', payload, baseUrl, apiKey, {
            model,
            temperature: 0.0,
            topP: 0.1,
            maxTokens: 4000,
            responseSchema: STUDENT_AST_SCHEMA
          });
        }
      } else {
        throw new CalcTraceExtractionError('Serverseitige Extraktion wurde im Browser aufgerufen.');
      }
    }

    if (typeof extracted === 'string') {
        try {
            extracted = JSON.parse(extracted);
        } catch (e) {
            throw new CalcTraceExtractionError('Antwort der Extraktions-KI ist kein gueltiges JSON.', e);
        }
    }

    // Ein leeres steps-Array ist ein gueltiges Ergebnis (Schueler hat nicht gerechnet).
    // Eine Antwort ohne steps-Array ist dagegen kaputt und darf nicht als solches gelten.
    if (!extracted || !Array.isArray(extracted.steps)) {
      throw new CalcTraceExtractionError('Antwort der Extraktions-KI enthaelt kein "steps"-Array.');
    }

    return extracted.steps;
  } catch (err) {
    logger.error('[CalcTrace AST Extraction] LLM failed:', err);
    throw err instanceof CalcTraceExtractionError
      ? err
      : new CalcTraceExtractionError('Die Extraktion des Rechenwegs ist fehlgeschlagen.', err);
  }
}
