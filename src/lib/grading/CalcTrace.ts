/**
 * CalcTrace Engine V7 — Unit-Aware Grading
 *
 * Based on industry best practices from STACK/Maxima, WeBWorK, Numbas:
 * Physical quantity = Tuple(value, unit). Both dimensions checked separately.
 *
 * Uses mathjs unit() API for deterministic SI normalization.
 * No custom prefix tables — mathjs handles all SI prefixes and compound units.
 *
 * @module CalcTrace
 */

import { create, all, type MathJsInstance } from 'mathjs';
import { logger } from '@/lib/logger';
import type {
  StudentASTStep,
  TargetGoal,
  CalcTraceResult,
  UnitComparisonDetail
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isWithinTolerance(actual: number, expected: number, tolerance: number): boolean {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs((actual - expected) / expected) <= tolerance;
}

/** Round to N significant figures to avoid floating-point display noise */
function roundSig(v: number, sig = 8): number {
  if (v === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(v)));
  const power = sig - d;
  const magnitude = Math.pow(10, power);
  const result = Math.round(v * magnitude) / magnitude;
  return result;
}

// ─── Unit-Aware Comparison (mathjs-based) ────────────────────────────────────

/** Map of common non-standard unit strings to mathjs-compatible unit strings */
const UNIT_ALIASES: Record<string, string> = {
  'Ohm': 'ohm',
  'Ω':   'ohm',
  'kΩ':  'kohm',
  'MΩ':  'Mohm',
  'kOhm': 'kohm',
  'MOhm': 'Mohm',
  'mΩ':  'mohm',
};

/** Normalize a unit string to a mathjs-compatible format */
function normalizeUnitString(unit: string): string {
  let u = unit.trim();
  // Globally normalize all ohm symbols (handles compound units like kΩ*mA or kΩ*A)
  u = u.replace(/[ΩΩ]/g, 'ohm');
  u = u.replace(/\bOhm\b/g, 'ohm');
  return UNIT_ALIASES[u] || u;
}

/**
 * Converts a value+unit pair to its SI base value using mathjs unit().
 * Returns null if the unit is not recognized by mathjs.
 *
 * Example: toSIBaseValue(1.846, "mA") → 0.001846
 * Example: toSIBaseValue(6.5, "kohm") → 6500
 */
function toSIBaseValue(value: number, unit: string): number | null {
  try {
    const normalized = normalizeUnitString(unit);
    const u = math.unit(value, normalized);
    const si = u.toSI();
    return si.toNumber();
  } catch {
    logger.debug(`[CalcTrace] mathjs could not parse unit: "${unit}"`);
    return null;
  }
}

/**
 * Checks if two unit strings represent the same physical dimension.
 * e.g. "mA" and "A" are both current → true
 *      "mA" and "V" are different → false
 */
function isSameBaseDimension(unitA: string, unitB: string): boolean {
  try {
    const a = math.unit(1, normalizeUnitString(unitA));
    const b = math.unit(1, normalizeUnitString(unitB));
    return a.equalBase(b);
  } catch {
    return false;
  }
}

/**
 * Core unit-aware comparison: checks a student's value+unit against a target value+unit.
 * 
 * Returns a detailed result indicating:
 * - Exact match (value AND unit match)
 * - Unit mismatch (value matches after SI normalization, but different prefix/unit)
 * - No match
 */
function compareWithUnit(
  studentValue: number,
  studentUnit: string | undefined,
  expectedValue: number,
  expectedUnit: string,
  tolerance: number
): UnitComparisonDetail {
  const base: UnitComparisonDetail = {
    targetValue: expectedValue,
    expectedUnit,
    studentUnit: studentUnit,
    isValueMatch: false,
    isExactMatch: false,
    isUnitMismatch: false,
  };

  // 1. Exact numeric match (same prefix) — check if units also match
  const isExactNumeric = isWithinTolerance(studentValue, expectedValue, tolerance);
  if (isExactNumeric) {
    // If no student unit extracted, or units match → exact match
    if (!studentUnit || normalizeUnitString(studentUnit) === normalizeUnitString(expectedUnit)) {
      return { ...base, isValueMatch: true, isExactMatch: true };
    }
    // Same number but different unit (e.g. student wrote "230 mA" but target is "230 V")
    // Check if they're even the same dimension
    if (!isSameBaseDimension(studentUnit, expectedUnit)) {
      return { ...base, isValueMatch: false, isExactMatch: false };
    }
    // Same dimension, same number, different prefix (e.g. 6.5 Ω vs 6.5 kΩ)
    // → the student clearly has the wrong magnitude
    return { ...base, isValueMatch: false, isExactMatch: false, isUnitMismatch: true, isPrefixError: true };
  }

  // 2. SI normalization: check if value matches after unit conversion
  const siExpected = toSIBaseValue(expectedValue, expectedUnit);
  if (siExpected === null) return base; // Can't parse unit → no SI comparison possible

  const isSIMatch = isWithinTolerance(studentValue, siExpected, tolerance);
  if (isSIMatch) {
    // Student's raw number matches the SI base value of the target
    // e.g. student wrote 0.001846, target is 1.846 mA → 0.001846 A
    if (studentUnit && isSameBaseDimension(studentUnit, expectedUnit)) {
      // Student wrote a unit in the same dimension — check if it's correct
      const siStudent = toSIBaseValue(studentValue, studentUnit);
      if (siStudent !== null && isWithinTolerance(siStudent, siExpected, tolerance)) {
        // Full physical equivalence: 0.001846 A = 1.846 mA ✓
        return { ...base, isValueMatch: true, isExactMatch: true };
      }
      // Student's unit makes the value wrong (e.g. 0.001846 mA ≠ 1.846 mA)
      return { ...base, isValueMatch: true, isExactMatch: false, isUnitMismatch: true };
    }
    // No student unit → value matches SI base, but we can't confirm the unit label
    return { ...base, isValueMatch: true, isExactMatch: false, isUnitMismatch: true };
  }

  // 3. If student provided a unit, try full physical comparison
  if (studentUnit && isSameBaseDimension(studentUnit, expectedUnit)) {
    const siStudent = toSIBaseValue(studentValue, studentUnit);
    if (siStudent !== null && isWithinTolerance(siStudent, siExpected, tolerance)) {
      // e.g. student: 1846 µA, target: 1.846 mA → both = 0.001846 A ✓
      return { ...base, isValueMatch: true, isExactMatch: true };
    }
  }

  return base; // No match
}

// ─── Target Value Parsing ────────────────────────────────────────────────────

/** Parse target values into an array of numbers (no unit expansion, just raw values) */
function parseTargetValues(targetVal: number | number[] | string): number[] {
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

/** Parse a unit string into per-value units (e.g. "kΩ, mA" → ["kΩ", "mA"]) */
function parseUnitsPerValue(unit: string | undefined, valueCount: number): (string | undefined)[] {
  if (!unit) return new Array(valueCount).fill(undefined);
  const parsed = unit.split(/[,;]+/).map(u => u.trim()).filter(u => u.length > 0);
  if (parsed.length === 1) {
    // Single unit → apply to last value (the final target)
    return new Array(valueCount).fill(undefined).map((_, i) => i === valueCount - 1 ? parsed[0] : undefined);
  }
  // Multiple units → pair by index
  return new Array(valueCount).fill(undefined).map((_, i) => parsed[i]);
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

function convertBetweenUnits(value: number, fromUnit: string, toUnit: string): number | null {
  try {
    return math.unit(value, normalizeUnitString(fromUnit)).toNumber(normalizeUnitString(toUnit));
  } catch {
    return null; // inkompatible Dimensionen → kein legitimer Umrechnungsfall, Fehler bleibt bestehen
  }
}

/**
 * Evaluiert den extrahierten AST in der Sandbox.
 *
 * Proof A: Interne Rechenkonsistenz (jeder Schritt mathematisch korrekt?)
 * Proof B: Zielerreichung (Endziel erreicht? Unit-aware!)
 *
 * @param ast - Der vom LLM extrahierte Rechenweg
 * @param target - Das Ziel (Erwartungshorizont)
 * @returns CalcTraceResult
 */
export function evaluateCalcTrace(
  ast: StudentASTStep[],
  target: TargetGoal
): CalcTraceResult {
  const sandboxErrors: string[] = [];
  const context: Record<string, number> = {};
  const TOLERANCE = 0.05; // 5% tolerance for rounding/follow-up errors

  // ── Proof A: Internal consistency ──────────────────────────────────────────
  for (const step of ast) {
    try {
      validateAST(step.formula);
      const computed = math.evaluate(step.formula, context);

      if (typeof computed !== 'number' || !isFinite(computed)) {
        sandboxErrors.push(`Schritt ${step.id}: Resultat ist keine gültige Zahl.`);
      } else {
        let comparisonValue = computed;
        let studentValue = step.result;

        if (step.formulaUnit && step.unit && step.formulaUnit !== step.unit) {
          const converted = convertBetweenUnits(computed, step.formulaUnit, step.unit);
          if (converted !== null) {
            comparisonValue = converted;
          }
        } else if (step.unit) {
          // Generic fallback: convert student result to SI and compare to computed SI (since formula is in SI base units)
          const siStudent = toSIBaseValue(step.result, step.unit);
          if (siStudent !== null) {
            studentValue = siStudent;
          }
        }

        if (!isWithinTolerance(studentValue, comparisonValue, TOLERANCE)) {
          let formulaResultDisplay = `${computed.toFixed(2)}`;
          if (step.unit) {
            const scaleFactor = toSIBaseValue(1, step.unit);
            if (scaleFactor !== null && scaleFactor !== 0) {
              const valInStudentUnit = computed / scaleFactor;
              formulaResultDisplay = `${valInStudentUnit.toFixed(2)} ${step.unit}`;
            } else {
              formulaResultDisplay = `${computed.toFixed(2)} ${step.unit}`;
            }
          }
          sandboxErrors.push(`Rechenfehler in ${step.id}: Formel ergibt ${formulaResultDisplay}, aber Schüler notierte ${step.result} ${step.unit ?? ''}`.trim());
        }
        // Save the explicitly stated student result in context, so subsequent formulas use the scaled value
        context[step.id] = step.result;
      }
    } catch (e: any) {
      sandboxErrors.push(`Syntax-Fehler in ${step.id} (${step.formula}): ${e.message}`);
      context[step.id] = step.result;
    }
  }

  // ── Proof B: Goal reached? (Unit-aware) ────────────────────────────────────
  let isGoalReached = false;
  let hasUnitMismatch = false;

  const naturalValues = parseTargetValues(target.targetValue);
  const unitsPerValue = parseUnitsPerValue(target.unit, naturalValues.length);

  const reachedTargets: number[] = [];
  const missedTargets: number[] = [];
  const unitDetails: UnitComparisonDetail[] = [];

  logger.debug(`[CalcTrace] naturalValues: ${JSON.stringify(naturalValues)}`);
  logger.debug(`[CalcTrace] unitsPerValue: ${JSON.stringify(unitsPerValue)}`);
  logger.debug(`[CalcTrace] AST steps: ${JSON.stringify(ast)}`);

  if (naturalValues.length > 0 && ast.length > 0) {
    naturalValues.forEach((expected, i) => {
      const expectedUnit = unitsPerValue[i];

      if (!expectedUnit) {
        // No unit → pure numeric comparison
        const reached = ast.some(step => isWithinTolerance(step.result, expected, TOLERANCE));
        if (reached) {
          reachedTargets.push(roundSig(expected));
        } else {
          missedTargets.push(roundSig(expected));
        }
        return;
      }

      // Unit-aware comparison: check each AST step
      let bestMatch: UnitComparisonDetail | null = null;
      for (const step of ast) {
        const comparison = compareWithUnit(step.result, step.unit, expected, expectedUnit, TOLERANCE);
        
        if (comparison.isExactMatch) {
          bestMatch = comparison;
          break; // Exact match found, no need to check further
        }
        
        // If the student explicitly made a prefix error (e.g. 1.846 A instead of 1.846 mA),
        // this is their final WRONG answer. It overrides any earlier weak SI-match without unit.
        if (comparison.isPrefixError) {
          if (!bestMatch || !bestMatch.isExactMatch) {
            bestMatch = comparison;
          }
        }
        
        // If we found a valid SI match (e.g. 0.001846 without unit), we only keep it
        // if we haven't found a prefix error or exact match yet.
        if (comparison.isValueMatch) {
          if (!bestMatch || (!bestMatch.isExactMatch && !bestMatch.isPrefixError && !bestMatch.isValueMatch)) {
            bestMatch = comparison;
          }
        }
      }

      if (bestMatch && bestMatch.isValueMatch) {
        reachedTargets.push(roundSig(expected));
        if (bestMatch.isUnitMismatch) {
          hasUnitMismatch = true;
        }
      } else {
        missedTargets.push(roundSig(expected));
      }

      if (bestMatch) {
        unitDetails.push(bestMatch);
      }
    });

    // Goal is reached if ALL natural values were found
    isGoalReached = missedTargets.length === 0 && reachedTargets.length > 0;
  } else if (ast.length === 0) {
    missedTargets.push(...naturalValues.map(v => roundSig(v)));
  }

  return {
    isGoalReached,
    sandboxErrors,
    reachedTargets,
    missedTargets,
    ast,
    maxPoints: target.maxPoints,
    unitMismatch: hasUnitMismatch || undefined,
    unitDetails: unitDetails.length > 0 ? unitDetails : undefined,
  };
}

// ─── Prompt Formatter ────────────────────────────────────────────────────────

/**
 * Formatiert das Evaluierungsergebnis in einen robusten Prompt für das Hybrid-Grading LLM.
 */
export function formatCalcTraceForPrompt(result: CalcTraceResult, target: TargetGoal): string {
  const lines: string[] = ['--- DETERMINISTISCHER BEWEIS (SANDBOX) ---'];
  let targetDisplay = `${target.targetValue} ${target.unit || ''}`;
  if (Array.isArray(target.targetValue) && target.unit && target.unit.includes(',')) {
    const units = target.unit.split(',').map(u => u.trim());
    if (units.length === target.targetValue.length) {
      targetDisplay = target.targetValue.map((v, i) => `${v} ${units[i]}`).join(', ');
    }
  }
  lines.push(`Muster-Zielwert: ${targetDisplay}`);

  // ── Proof A ──
  lines.push(`\n[Proof A: Logik & Folgefehler-Test]`);
  if (result.ast.length === 0) {
    lines.push(`✗ Die KI konnte keinen gültigen mathematischen Rechenweg aus der Schülerantwort extrahieren (AST leer).`);
  } else if (result.sandboxErrors.length === 0) {
    lines.push(`✓ Der extrahierte Schüler-AST ist mathematisch in sich vollkommen fehlerfrei.`);
    lines.push(`  [DEBUG-AST]: ${JSON.stringify(result.ast)}`);
  } else {
    lines.push(`✗ Die Sandbox hat interne Verrechner im Weg des Schülers gefunden:\n`);
    result.sandboxErrors.forEach(err => lines.push(`* ${err}`));
  }

  // ── Proof B ──
  lines.push(`\n[Proof B: Ziel-Test]`);
  if (result.isGoalReached && !result.unitMismatch) {
    if (result.sandboxErrors.length === 0) {
      lines.push(`✓ Der Schüler hat das Endziel komplett fehlerfrei erreicht.`);
    } else {
      lines.push(`⚠ Der Schüler hat den Endziel-Zahlenwert zwar notiert, ABER der Rechenweg dorthin enthält Rechenfehler (siehe Proof A)!`);
    }
  } else if (result.isGoalReached && result.unitMismatch) {
    lines.push(`⚠ Der berechnete Zahlenwert stimmt (evtl. korrekte SI-Normalisierung), aber die vom Schüler notierte Einheitsbezeichnung weicht ab oder ist physikalisch falsch. Details siehe [Einheiten-Analyse].`);
  } else {
    lines.push(`✗ Der Schüler hat das Endziel verfehlt oder nicht vollständig gelöst.`);
  }

  // Reached/missed targets (only natural values, not SI-expanded)
  if (result.reachedTargets && result.reachedTargets.length > 0) {
    if (result.sandboxErrors.length === 0) {
      lines.push(`✓ Folgende Meilensteine/Teilziele wurden im Rechenweg fehlerfrei gefunden: ${result.reachedTargets.join(', ')}`);
    } else {
      lines.push(`⚠ Folgende Meilensteine/Teilziele wurden als Zahl notiert (Achtung, evtl. fiktiv/unlogisch durch obige Rechenfehler!): ${result.reachedTargets.join(', ')}`);
    }
  }
  if (result.missedTargets && result.missedTargets.length > 0) {
    lines.push(`✗ Folgende Meilensteine/Teilziele wurden NICHT erreicht oder übersprungen: ${result.missedTargets.join(', ')}`);
  }

  // ── Unit Analysis (NEW in V7) ──
  if (result.unitMismatch && result.unitDetails) {
    lines.push(`\n[Einheiten-Analyse]`);
    result.unitDetails.forEach(detail => {
      if (detail.isUnitMismatch) {
        const studentUnitStr = detail.studentUnit ? ` (Schüler notierte: ${detail.studentUnit})` : '';
        lines.push(`⚠ Zielwert ${detail.targetValue} ${detail.expectedUnit}: Der berechnete nackte Zahlenwert stimmt (entspricht ggf. der SI-Basiseinheit), aber die notierte Einheit ist physikalisch falsch oder passt nicht zum Wert${studentUnitStr}.`);
        lines.push(`  → Prüfe die Einheitsbezeichnung im Schülertext. Rechenweg-Punkt: JA, Einheits-Punkt: abhängig vom Erwartungshorizont.`);
      }
    });
  }

  // ── Grading Rubric ──
  if (target.gradingRubric && target.gradingRubric.trim().length > 0) {
    lines.push(`\n--- LEHRER-ERWARTUNGSHORIZONT ---`);
    lines.push(target.gradingRubric);
  }

  return lines.join('\n');
}
