/**
 * CalcTrace Generator — AI-Assisted CalcTrace Synthesis
 *
 * Pure logic module (no React, no State).
 * Builds LLM prompts from task text, parses and validates the generated
 * CalcTrace JSON against the CalcTrace Engine schema.
 *
 * Architecture: src/lib/ (Pure Logic Layer)
 * @see CalcTrace.ts for the execution engine
 */

import type { CalcTrace, CalcStep } from './calc-trace-types';
import { evaluateCalcTrace } from './CalcTrace';
import { StructuredPrompt } from '../ai/prompt-builder';
import calcGenSystemDefault from '../../prompts/calc-trace/system.md';
import calcGenUserDefault from '../../prompts/calc-trace/user.md';
import { logger } from '@/lib/logger';

// ──────────────────────────────────────────────────────────────────────────
// 1. Prompt Builder — Constructs the system + user prompts for the LLM
// ──────────────────────────────────────────────────────────────────────────

const CALC_TRACE_SYSTEM_PROMPT = calcGenSystemDefault;
const CALC_TRACE_USER_PROMPT = calcGenUserDefault;

/**
 * Builds the structured prompt for AI-assisted CalcTrace generation.
 *
 * @param taskText - The model solution text for the specific task
 * @param discipline - Optional hint for the discipline
 * @param userNotes - Optional notes from the teacher
 */
export function buildCalcTraceGenerationPrompt(
  taskText: string,
  discipline?: string,
  userNotes?: string
): StructuredPrompt {
  const disciplineHint = discipline
    ? `Hinweis: Diese Aufgabe gehört zum Fachgebiet "${discipline}".`
    : '';

  let user = CALC_TRACE_USER_PROMPT
    .replace('{{TASK_TEXT}}', taskText)
    .replace('{{DISCIPLINE_HINT}}', disciplineHint);

  if (userNotes && userNotes.trim()) {
    user += `\n\nZUSÄTZLICHE BEDIENER-ANMERKUNGEN UND SPEZIFISCHE ANFORDERUNGEN AN DIE RECHENKETTE:\n${userNotes.trim()}\n\nBerücksichtige diese Anmerkungen strikt bei der Strukturierung der Rechenkette!`;
  }

  return {
    system: CALC_TRACE_SYSTEM_PROMPT,
    user,
    options: {
      temperature: 0.2,
      topP: 0.9,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Schema Definition for LLM Tool Calling
// ──────────────────────────────────────────────────────────────────────────

export const CALC_TRACE_SCHEMA = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          type: { type: 'string', enum: ['given', 'calc'] },
          value: { type: 'number' },
          formula: { type: ['string', 'null'] },
          tolerance: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'] },
          points: { type: ['number', 'null'] },
        },
        required: ['id', 'label', 'type', 'value'],
        additionalProperties: false,
      },
    },
  },
  required: ['taskId', 'steps'],
  additionalProperties: false,
};

export const VALIDATE_CALC_TRACE_TOOL = {
  type: 'function',
  function: {
    name: 'validate_calc_trace',
    description: 'Validates a CalcTrace for mathematical determinism. Use this to test your trace before returning the final result. If the validation fails, you will receive an error message explaining what needs to be fixed. Once you are confident the trace is correct, just output the final trace as JSON.',
    parameters: {
      type: 'object',
      properties: {
        trace: CALC_TRACE_SCHEMA,
      },
      required: ['trace'],
      additionalProperties: false,
    },
  },
};

// ──────────────────────────────────────────────────────────────────────────
// 3. Response Parser & Determinism Validation
// ──────────────────────────────────────────────────────────────────────────

/**
 * Parses the raw LLM response string into a validated CalcTrace.
 */
export function parseGeneratedCalcTrace(
  llmResponse: string
): CalcTrace | null {
  if (!llmResponse || !llmResponse.trim()) return null;

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(llmResponse.trim());
  } catch (e) {
    logger.warn('[CalcTrace Generator] JSON.parse failed. Expected structured JSON output.', {
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }

  // Smart recovery: If the LLM response is wrapped in { trace: ... }
  let targetData = parsed;
  if (
    parsed.trace &&
    typeof parsed.trace === 'object' &&
    Array.isArray(parsed.trace.steps)
  ) {
    targetData = parsed.trace;
  }

  if (!targetData.taskId || typeof targetData.taskId !== 'string') {
    targetData.taskId = `generated-trace-${Date.now()}`;
  }

  if (!Array.isArray(targetData.steps) || targetData.steps.length === 0) {
    return null;
  }

  const validatedSteps: CalcStep[] = [];

  for (const s of targetData.steps) {
    if (!s.id || typeof s.id !== 'string') continue;
    if (s.type !== 'given' && s.type !== 'calc') continue;
    if (typeof s.value !== 'number') continue;

    const step: CalcStep = {
      id: s.id,
      label: s.label || s.id,
      type: s.type,
      value: s.value,
    };

    if (s.type === 'calc' && typeof s.formula === 'string') {
      // Validate formula syntax superficially (mathjs AST check happens in dry-run/evaluation)
      step.formula = s.formula;
    }

    if (typeof s.tolerance === 'number') {
      step.tolerance = s.tolerance;
    }

    if (typeof s.unit === 'string') {
      step.unit = s.unit;
    }

    if (typeof s.points === 'number') {
      step.points = s.points;
    }

    validatedSteps.push(step);
  }

  if (validatedSteps.length === 0) return null;

  return {
    taskId: targetData.taskId as string,
    steps: validatedSteps,
  };
}

/**
 * Performs an automated mathematical plausibility dry-run on the generated CalcTrace.
 * Simulates engine execution using the expected values for the given steps and validates that
 * all formulas compile, evaluate, and yield correct results matching their expected values.
 */
export function validateCalcTraceDeterminism(
  trace: CalcTrace
): { isValid: boolean; error?: string } {
  if (!trace || !Array.isArray(trace.steps) || trace.steps.length === 0) {
    return { isValid: false, error: 'Die generierte Rechenkette enthält keine Schritte.' };
  }

  // 1. Gather all step values as perfect student answers
  const mockStudentAnswers: Record<string, number | null> = {};
  for (const step of trace.steps) {
    mockStudentAnswers[step.id] = step.value;
  }

  // 2. Perform dry-run evaluation
  try {
    const result = evaluateCalcTrace(trace, mockStudentAnswers);

    // 3. Every step must be 'correct' in a perfect dry-run
    for (const r of result.results) {
      if (r.status !== 'correct') {
        const step = trace.steps.find((s) => s.id === r.id);
        const formulaStr = step?.formula ? ` mit Formel "${step.formula}"` : '';
        return {
          isValid: false,
          error: `Formelfehler bei Schritt "${r.label}" (${r.id})${formulaStr}: ` +
            `Erwartet wurde ${r.expected}, berechnet wurde jedoch ${r.computed}. ` +
            `Bitte überprüfe die mathematische Korrektheit der Formel.`,
        };
      }
    }

    return { isValid: true };
  } catch (err) {
    return {
      isValid: false,
      error: `Unerwarteter Fehler während der CalcTrace-Simulation: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/**
 * Builds the structured prompt for AI-assisted CalcTrace refinement (self-correction).
 *
 * @param taskText - The model solution text
 * @param currentTrace - The existing CalcTrace to refine
 * @param userInstruction - The natural language instruction / validation error
 * @param discipline - Optional discipline hint
 */
export function buildCalcTraceRefinementPrompt(
  taskText: string,
  currentTrace: CalcTrace,
  userInstruction: string,
  discipline?: string
): StructuredPrompt {
  const disciplineHint = discipline
    ? `Hinweis: Diese Aufgabe gehört zum Fachgebiet "${discipline}".`
    : '';

  const system = CALC_TRACE_SYSTEM_PROMPT;

  const user = `Hier ist die Aufgabe und Musterlösung:
${taskText}
${disciplineHint}

Es wurde bereits eine Rechenkette generiert, die jedoch ungültig oder mathematisch nicht korrekt ist:
${JSON.stringify(currentTrace, null, 2)}

Fehler/Korrekturanweisung:
${userInstruction}

Bitte korrigiere die Rechenkette basierend auf der obigen Fehlermeldung/Korrekturanweisung. Gib ausschließlich das korrigierte JSON-Objekt im bekannten Schema aus.`;

  return {
    system,
    user,
    options: {
      temperature: 0.0,
      topP: 1.0,
    },
  };
}

