/**
 * CalcTrace Engine — Deterministic Math/Physics Grading
 *
 * Leichtgewichtige Alternative zu PANG für Mathe/Physik-Aufgaben.
 * Nutzt mathjs mit Sandbox-Konfiguration (keine eval-ähnlichen Funktionen).
 * Kernfeature: Folgefehler-Kompensation via Dual-Context-Propagierung.
 *
 * @module CalcTrace
 */

import { create, all, type MathJsInstance } from 'mathjs';
import { logger } from '@/lib/logger';
import type {
  CalcTrace,
  CalcTraceResult,
  StepResult,
  StepStatus,
} from './calc-trace-types';

// ─── Sandboxed mathjs Instance ───────────────────────────────────────────────
// Nutzen AST-Validierung vor der Ausführung, um Prompt-Injection/Sicherheitsrisiken
// bei KI-generierten Formeln zu verhindern.
const math: MathJsInstance = create(all);

const ALLOWED_NODE_TYPES = new Set([
  'SymbolNode',
  'ConstantNode',
  'OperatorNode',
  'ParenthesisNode',
  'FunctionNode',
]);

const ALLOWED_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'log', 'log10', 'ln', 'exp',
  'sqrt', 'cbrt', 'abs', 'sign', 'round', 'floor', 'ceil',
  'min', 'max', 'pow', 'sum',
]);

/**
 * Validates the AST of a mathjs formula against allowed node types and functions.
 * Throws an error if any forbidden syntax or function is found.
 */
function validateAST(formula: string): void {
  const node = math.parse(formula);
  node.traverse((n) => {
    if (!ALLOWED_NODE_TYPES.has(n.type)) {
      throw new Error(`[CalcTrace Security] Forbidden expression syntax: ${n.type}`);
    }
    if (n.type === 'FunctionNode') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const funcNode = n as any;
      const name = typeof funcNode.name === 'string' ? funcNode.name : funcNode.name?.name;
      if (!ALLOWED_FUNCTIONS.has(name)) {
        throw new Error(`[CalcTrace Security] Forbidden function call: ${name}`);
      }
    }
  });
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

/**
 * Evaluiert eine mathjs-Formel mit gegebenem Variablen-Kontext.
 * Gibt `null` zurück wenn die Evaluation fehlschlägt.
 */
function evalFormula(
  formula: string,
  context: Record<string, number>
): number | null {
  try {
    // Zuerst die Formel syntaktisch/sicherheitstechnisch prüfen
    validateAST(formula);

    const result = math.evaluate(formula, { ...context });
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    }
    // mathjs kann Unit-Objekte o.ä. zurückgeben — nur reine Zahlen akzeptieren
    const numeric = Number(result);
    return isFinite(numeric) ? numeric : null;
  } catch (err) {
    logger.warn('[CalcTrace] Formula evaluation failed', {
      formula,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Prüft ob zwei Werte innerhalb der gegebenen Toleranz übereinstimmen.
 */
function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number
): boolean {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs((actual - expected) / expected) <= tolerance;
}

/**
 * Evaluiert eine CalcTrace gegen Schüler-Antworten.
 * Implementiert Dual-Context-Propagierung für Folgefehler-Kompensation.
 *
 * @param trace - Die CalcTrace-Definition (Musterlösung)
 * @param studentAnswers - Vom Schüler extrahierte Werte (nur `given`-Steps)
 * @returns CalcTraceResult mit Bewertung pro Step
 */
export function evaluateCalcTrace(
  trace: CalcTrace,
  studentAnswers: Record<string, number | null>
): CalcTraceResult {
  const expectedCtx: Record<string, number> = {};
  const studentCtx: Record<string, number> = {};
  const results: StepResult[] = [];
  let primaryErrors = 0;
  let consecutiveErrors = 0;

  for (const step of trace.steps) {
    const tolerance = step.tolerance ?? 0.01;
    const pointsMax = step.points ?? 1;

    let expectedVal = step.value;
    let computedVal: number | null = null;
    let studentVal: number | null = null;
    let status: StepStatus;
    let pointsAwarded = 0;

    if (step.type === 'given') {
      // ── Given Step: Wert direkt vom Schüler ──
      studentVal = studentAnswers[step.id] ?? null;

      if (studentVal === null) {
        // Schüler hat keinen Wert angegeben → Omission
        status = 'omission';
      } else if (isWithinTolerance(studentVal, expectedVal, tolerance)) {
        status = 'correct';
        pointsAwarded = pointsMax;
      } else {
        status = 'error';
        primaryErrors++;
      }
    } else {
      // ── Calc Step: Wert aus Formel berechnen ──
      studentVal = studentAnswers[step.id] ?? null;

      if (step.formula) {
        // Erwarteter Wert: Formel mit Musterlösungs-Kontext
        const formulaExpected = evalFormula(step.formula, expectedCtx);
        if (formulaExpected !== null) {
          expectedVal = formulaExpected;
        }

        // Berechneter Wert: Formel mit Schüler-Kontext (für Folgefehler)
        computedVal = evalFormula(step.formula, studentCtx);
      }

      if (studentVal === null) {
        status = 'omission';
      } else {
        let isMatched = false;
        if (step.formula) {
          if (computedVal !== null && isWithinTolerance(studentVal, computedVal, tolerance)) {
            if (isWithinTolerance(computedVal, expectedVal, tolerance)) {
              status = 'correct';
              pointsAwarded = pointsMax;
            } else {
              status = 'consecutive';
              pointsAwarded = pointsMax;
              consecutiveErrors++;
            }
            isMatched = true;
          }
        } else {
          if (isWithinTolerance(studentVal, expectedVal, tolerance)) {
            status = 'correct';
            pointsAwarded = pointsMax;
            isMatched = true;
          }
        }

        if (!isMatched) {
          status = 'error';
          primaryErrors++;
        }
      }
    }

    // ── Kontext-Propagierung (Dual-Context) ──
    expectedCtx[step.id] = expectedVal;
    studentCtx[step.id] = studentVal ?? computedVal ?? NaN;

    results.push({
      id: step.id,
      label: step.label,
      unit: step.unit,
      expected: expectedVal,
      studentValue: studentVal,
      computed: computedVal,
      status,
      pointsAwarded,
      pointsMax,
    });
  }

  const totalPoints = results.reduce((sum, r) => sum + r.pointsAwarded, 0);
  const maxPoints = results.reduce((sum, r) => sum + r.pointsMax, 0);

  return {
    results,
    totalPoints,
    maxPoints,
    primaryErrors,
    consecutiveErrors,
    disablePoints: typeof trace.disablePoints === 'boolean' ? trace.disablePoints : true,
  };
}

/**
 * Formatiert ein CalcTraceResult als menschenlesbaren String
 * für den Korrektur-Prompt an das LLM (Hybrid-Modus).
 */
export function formatCalcTraceForPrompt(result: CalcTraceResult): string {
  const lines: string[] = ['RECHNERISCHE ANALYSE (CalcTrace):'];

  for (const r of result.results) {
    const unitSuffix = r.unit ? ` ${r.unit}` : '';
    const studentStr = r.studentValue !== null
      ? `${r.studentValue}${unitSuffix}`
      : 'NICHT ANGEGEBEN';

    switch (r.status) {
      case 'correct':
        lines.push(`  ✓ ${r.label} = ${studentStr} → KORREKT`);
        break;
      case 'consecutive':
        lines.push(
          `  ✓ ${r.label} = ${studentStr} → FOLGEFEHLER-KOMPENSATION ` +
          `(korrekt weitergerechnet, erwartet: ${r.expected}${unitSuffix})`
        );
        break;
      case 'error':
        lines.push(
          `  ✗ ${r.label} = ${studentStr} → PRIMÄRFEHLER ` +
          `(erwartet: ${r.expected}${unitSuffix})`
        );
        break;
      case 'omission':
        lines.push(
          `  ○ ${r.label} = NICHT ANGEGEBEN → AUSLASSUNG ` +
          `(erwartet: ${r.expected}${unitSuffix})`
        );
        break;
    }
  }

  if (result.disablePoints) {
    lines.push(
      `Fazit: ${result.primaryErrors} Primärfehler, ` +
      `${result.consecutiveErrors} Folgefehler-Kompensation(en)`
    );
  } else {
    lines.push(
      `Fazit: ${result.primaryErrors} Primärfehler, ` +
      `${result.consecutiveErrors} Folgefehler-Kompensation(en), ` +
      `${result.totalPoints}/${result.maxPoints} Punkte`
    );
  }

  return lines.join('\n');
}
