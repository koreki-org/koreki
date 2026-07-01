/**
 * CalcTrace Engine V6 — AST Extraction & Hybrid Grading
 *
 * Leichtgewichtige Sandbox für die Validierung von MINT/BWL Rechenwegen.
 * Kernfeature: Proof A (interne Rechenkonsistenz) & Proof B (Zielerreichung).
 *
 * @module CalcTrace
 */

import { create, all, type MathJsInstance } from 'mathjs';
import { logger } from '@/lib/logger';
import type {
  StudentASTStep,
  TargetGoal,
  CalcTraceResult
} from './calc-trace-types';

// ─── Sandboxed mathjs Instance ───────────────────────────────────────────────
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

function validateAST(formula: string): void {
  const node = math.parse(formula);
  node.traverse((n) => {
    if (!ALLOWED_NODE_TYPES.has(n.type)) {
      throw new Error(`Forbidden expression syntax: ${n.type}`);
    }
    if (n.type === 'FunctionNode') {
      // eslint-disable-next-line
      const funcNode = n as any;
      const name = typeof funcNode.name === 'string' ? funcNode.name : funcNode.name?.name;
      if (!ALLOWED_FUNCTIONS.has(name)) {
        throw new Error(`Forbidden function call: ${name}`);
      }
    }
  });
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

function isWithinTolerance(actual: number, expected: number, tolerance: number): boolean {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs((actual - expected) / expected) <= tolerance;
}
function normalizeTargetValues(targetVal: any): number[] {
  if (typeof targetVal === 'number') return [targetVal];
  if (Array.isArray(targetVal)) return targetVal.map(Number).filter(n => !isNaN(n));
  if (typeof targetVal === 'string') {
      const matches = targetVal.match(/-?\d+(?:[\.,]\d+)?(?:[eE][-+]?\d+)?/g);
      if (matches) {
          return matches.map(m => Number(m.replace(',', '.'))).filter(n => !isNaN(n));
      }
  }
  return [];
}

/**
 * Evaluiert den extrahierten AST in der Sandbox.
 *
 * @param ast - Der vom LLM extrahierte Rechenweg (Proof A)
 * @param target - Das Ziel (Proof B)
 * @returns CalcTraceResult (Sandbox Ergebnisse)
 */
export function evaluateCalcTrace(
  ast: StudentASTStep[],
  target: TargetGoal
): CalcTraceResult {
  const sandboxErrors: string[] = [];
  const context: Record<string, number> = {};
  
  let lastComputedVal: number | null = null;
  const TOLERANCE = 0.05; // 5% Abweichung für Folgefehler/Rundungen
  
  for (const step of ast) {
    try {
      validateAST(step.formula);
      const computed = math.evaluate(step.formula, context);
      
      if (typeof computed !== 'number' || !isFinite(computed)) {
         sandboxErrors.push(`Schritt ${step.id}: Resultat ist keine gültige Zahl.`);
      } else {
         if (!isWithinTolerance(step.result, computed, TOLERANCE)) {
            // Interner Verrechner
            sandboxErrors.push(`Rechenfehler in ${step.id}: Formel ergibt ${computed.toFixed(2)}, aber Schüler notierte ${step.result}`);
         }
         // Propagieren des Werts in den Kontext für Folgefehler
         context[step.id] = step.result;
         lastComputedVal = step.result;
      }
    } catch (e: any) {
       sandboxErrors.push(`Syntax-Fehler in ${step.id} (${step.formula}): ${e.message}`);
       context[step.id] = step.result;
       lastComputedVal = step.result;
    }
  }

  // Check Proof B
  let isGoalReached = false;
  const expectedValues = normalizeTargetValues(target.targetValue);
  
  if (expectedValues.length > 0 && ast.length > 0) {
      // The student must have computed ALL expected values at some point in their AST
      isGoalReached = expectedValues.every(expected => {
          return ast.some(step => isWithinTolerance(step.result, expected, TOLERANCE));
      });
  } else if (expectedValues.length === 0) {
      isGoalReached = false;
  }

  return {
    isGoalReached,
    sandboxErrors,
    ast,
    maxPoints: target.maxPoints,
    // Wenn alles stimmt, geben wir direkt volle Punkte. Sonst undefined (Hybrid-Grading LLM übernimmt).
    totalPoints: (isGoalReached && sandboxErrors.length === 0) ? target.maxPoints : undefined
  };
}

/**
 * Formatiert das Evaluierungsergebnis in einen robusten Prompt für das Hybrid-Grading LLM.
 */
export function formatCalcTraceForPrompt(result: CalcTraceResult, target: TargetGoal): string {
  const lines: string[] = ['--- DETERMINISTISCHER BEWEIS (SANDBOX) ---'];
  lines.push(`Muster-Zielwert: ${target.targetValue} ${target.unit || ''}`);
  
  lines.push(`\n[Proof A: Logik & Folgefehler-Test]`);
  if (result.ast.length === 0) {
      lines.push(`✗ Die KI konnte keinen gültigen mathematischen Rechenweg aus der Schülerantwort extrahieren (AST leer).`);
  } else if (result.sandboxErrors.length === 0) {
      lines.push(`✓ Der extrahierte Schüler-AST ist mathematisch in sich vollkommen fehlerfrei.`);
  } else {
      lines.push(`✗ Die Sandbox hat interne Verrechner im Weg des Schülers gefunden:`);
      result.sandboxErrors.forEach(err => lines.push(`  - ${err}`));
  }

  lines.push(`\n[Proof B: Ziel-Test]`);
  if (result.isGoalReached) {
      lines.push(`✓ Der Schüler hat das Endziel (${target.targetValue}) korrekt erreicht.`);
  } else {
      lines.push(`✗ Der Schüler hat das Endziel VERFEHLT.`);
  }
  
  if (target.gradingRubric && target.gradingRubric.trim().length > 0) {
      lines.push(`\n--- LEHRER-ERWARTUNGSHORIZONT ---`);
      lines.push(target.gradingRubric);
  }
  
  return lines.join('\n');
}
