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

// ─── Custom Units (Currency) ─────────────────────────────────────────────────
try {
  math.createUnit('EUR', { aliases: ['euro', 'euros'] });
  math.createUnit('USD', { aliases: ['dollar', 'dollars'] });
  math.createUnit('CHF', { aliases: ['chf'] });
} catch (e) {
  // Ignore if already registered
}

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

const TOLERANCE = 0.05; // 5% tolerance for rounding/follow-up errors

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
  '€':   'EUR',
  'EUR': 'EUR',
  '$':   'USD',
  'USD': 'USD',
};

/** Normalize a unit string to a mathjs-compatible format */
function normalizeUnitString(unit: string): string {
  let u = unit.trim();
  // Globally normalize all ohm and currency symbols
  u = u.replace(/[ΩΩ]/g, 'ohm');
  u = u.replace(/\bOhm\b/g, 'ohm');
  u = u.replace(/€/g, 'EUR');
  u = u.replace(/\$/g, 'USD');
  return UNIT_ALIASES[u] || u;
}

/** Normalize unit symbols inside a formula string using UNIT_ALIASES */
function normalizeExpressionFormula(formula: string): string {
  let f = formula;
  const keys = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    f = f.split(key).join(UNIT_ALIASES[key]);
  }
  // Additionally clean up other Ohm variants, currency and standard unit capitals
  f = f.replace(/[ΩΩ]/g, 'ohm');
  f = f.replace(/\bOhm\b/g, 'ohm');
  f = f.replace(/\bVolt\b/g, 'volt');
  f = f.replace(/€/g, 'EUR');
  f = f.replace(/\$/g, 'USD');
  return f;
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
  const computedValues: Record<string, any> = {};

  // ── Proof A: Internal consistency ──────────────────────────────────────────
  for (const step of ast) {
    try {
      const normalizedFormula = normalizeExpressionFormula(step.formula);
      validateAST(normalizedFormula);
      const computed = math.evaluate(normalizedFormula, context);
      computedValues[step.id] = computed;

      const isNumber = typeof computed === 'number' && isFinite(computed);
      const isUnit = computed && typeof computed === 'object' && math.typeOf(computed) === 'Unit';

      if (!isNumber && !isUnit) {
        sandboxErrors.push(`Schritt ${step.id}: Resultat ist keine gültige Zahl oder physikalische Einheit.`);
      } else {
        let comparisonValue = NaN;
        const studentValue = step.result;

        if (isUnit) {
          if (step.unit) {
            const expectedUnitNormalized = normalizeUnitString(step.unit);
            try {
              const convertedUnit = computed.to(expectedUnitNormalized);
              comparisonValue = convertedUnit.toNumber();
            } catch {
              comparisonValue = NaN;
            }
          } else {
            try {
              comparisonValue = computed.toNumber();
            } catch {
              comparisonValue = NaN;
            }
          }
        } else {
          comparisonValue = computed as number;
          if (step.formulaUnit && step.unit && step.formulaUnit !== step.unit) {
            const converted = convertBetweenUnits(comparisonValue, step.formulaUnit, step.unit);
            if (converted !== null) {
              comparisonValue = converted;
            }
          }
        }

        if (!isWithinTolerance(studentValue, comparisonValue, TOLERANCE)) {
          let formulaResultDisplay = isUnit
            ? `${math.format(computed, { precision: 6 })}`
            : `${math.format(computed, { precision: 6 })}`;
          if (step.unit) {
            try {
              formulaResultDisplay = isUnit
                ? `${math.format(computed.to(normalizeUnitString(step.unit)), { precision: 6 })}`
                : `${math.format(computed, { precision: 6 })} ${step.unit}`;
            } catch {
              // Ignore conversion display error, use raw value
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
  const perTargetResult: Array<{
    targetIndex: number;
    reached: boolean;
    hasCorrectValues?: boolean;
    hasCalculationError: boolean;
    associatedStepIds: string[];
  }> = [];

  logger.debug(`[CalcTrace] naturalValues: ${JSON.stringify(naturalValues)}`);
  logger.debug(`[CalcTrace] unitsPerValue: ${JSON.stringify(unitsPerValue)}`);
  logger.debug(`[CalcTrace] AST steps: ${JSON.stringify(ast)}`);

  if (naturalValues.length > 0 && ast.length > 0) {
    naturalValues.forEach((expected, i) => {
      const expectedUnit = unitsPerValue[i];
      let bestMatch: UnitComparisonDetail | null = null;

      // 1. Check all steps for student result match
      for (const step of ast) {
        if (!expectedUnit) {
          const isMatch = isWithinTolerance(step.result, expected, TOLERANCE);
          if (isMatch) {
            bestMatch = {
              targetValue: expected,
              expectedUnit: '',
              studentUnit: step.unit,
              isValueMatch: true,
              isExactMatch: true,
              isUnitMismatch: false,
              stepId: step.id
            };
            break;
          }
        } else {
          const comparison = compareWithUnit(step.result, step.unit, expected, expectedUnit, TOLERANCE);
          if (comparison.isExactMatch) {
            if (!step.unit) {
              // Lenient exact match (value matches, student forgot unit) -> keep but keep looking for a better one with unit
              if (!bestMatch || !bestMatch.studentUnit) {
                bestMatch = { ...comparison, stepId: step.id };
              }
            } else {
              // True exact match with unit -> set and break
              bestMatch = { ...comparison, stepId: step.id };
              break;
            }
          }
          if (comparison.isPrefixError) {
            if (!bestMatch || (!bestMatch.isExactMatch || !bestMatch.studentUnit)) {
              bestMatch = { ...comparison, stepId: step.id };
            }
          }
          if (comparison.isValueMatch) {
            if (!bestMatch || (!bestMatch.isExactMatch && !bestMatch.isPrefixError && !bestMatch.isValueMatch)) {
              bestMatch = { ...comparison, stepId: step.id };
            }
          }
        }
      }

      // 2. Fallback: If student result didn't match, check computed values to find intended step
      let targetStepId = bestMatch?.stepId;
      if (!targetStepId) {
        for (const step of ast) {
          const computed = computedValues[step.id];
          if (computed === undefined) continue;

          let isMatch = false;
          const isUnit = computed && typeof computed === 'object' && math.typeOf(computed) === 'Unit';
          const numericVal = isUnit ? computed.toNumber() : computed;

          if (!expectedUnit) {
            isMatch = isWithinTolerance(numericVal, expected, TOLERANCE);
          } else {
            const comp = compareWithUnit(numericVal, isUnit ? step.unit : undefined, expected, expectedUnit, TOLERANCE);
            isMatch = comp.isValueMatch;
          }

          if (isMatch) {
            targetStepId = step.id;
            break;
          }
        }
      }

      // 3. Trace calculation chain and check for errors
      let reached = false;
      let hasCalculationError = false;
      let associatedStepIds: string[] = [];

      if (targetStepId) {
        const chain = traceStepChain(targetStepId, ast);
        associatedStepIds = Array.from(chain);
        hasCalculationError = associatedStepIds.some(id => 
          sandboxErrors.some(err => err.includes(id))
        );
      }

      if (bestMatch && bestMatch.isValueMatch) {
        reached = true;
        reachedTargets.push(roundSig(expected));
        if (bestMatch.isUnitMismatch) {
          hasUnitMismatch = true;
        }
        unitDetails.push(bestMatch);
      } else {
        missedTargets.push(roundSig(expected));
      }

      perTargetResult.push({
        targetIndex: i,
        reached,
        hasCorrectValues: !!targetStepId,
        hasCalculationError,
        associatedStepIds
      });
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
    perTargetResult
  };
}

export function traceStepChain(targetStepId: string, ast: StudentASTStep[]): Set<string> {
  const chain = new Set<string>([targetStepId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of ast) {
      if (chain.has(step.id)) continue;
      const isReferenced = Array.from(chain).some(id => {
        const referencingStep = ast.find(s => s.id === id);
        return referencingStep?.formula.includes(step.id);
      });
      if (isReferenced) {
        chain.add(step.id);
        changed = true;
      }
    }
  }
  return chain;
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
  const ast = result.ast || [];
  const sandboxErrors = result.sandboxErrors || [];

  if (ast.length === 0) {
    lines.push(`✗ Die KI konnte keinen gültigen mathematischen Rechenweg aus der Schülerantwort extrahieren (AST leer).`);
  } else if (sandboxErrors.length === 0) {
    lines.push(`✓ Der extrahierte Schüler-AST ist mathematisch in sich vollkommen fehlerfrei.`);
    lines.push(`  [DEBUG-AST]: ${JSON.stringify(ast)}`);
  } else {
    lines.push(`✗ Die Sandbox hat interne Verrechner im Weg des Schülers gefunden:\n`);
    sandboxErrors.forEach(err => lines.push(`* ${err}`));
  }

  // ── Proof B ──
  lines.push(`\n[Proof B: Ziel-Test & Einheiten-Abgleich]`);
  const naturalValues = parseTargetValues(target.targetValue);
  const unitsPerValue = parseUnitsPerValue(target.unit, naturalValues.length);

  naturalValues.forEach((expected, idx) => {
    const expectedUnit = unitsPerValue[idx] || '';
    const targetStr = `${expected} ${expectedUnit}`.trim();
    
    // Find if we have unit comparison details for this target
    const detail = result.unitDetails ? result.unitDetails.find(d => d.targetValue === expected && d.expectedUnit === expectedUnit) : null;
    
    if (detail) {
      const stepStr = detail.stepId ? ` in ${detail.stepId}` : '';
      const studentUnitStr = detail.studentUnit ? ` (Schüler notierte: ${detail.studentUnit})` : (detail.isExactMatch ? '' : ' (keine Einheit angegeben)');
      
      // Check if this specific step had a sandbox error
      const hasErrorInStep = detail.stepId ? sandboxErrors.some(err => err.includes(detail.stepId!)) : false;
      const logicIndicator = hasErrorInStep ? `⚠ Rechenweg für diesen Schritt enthält Rechenfehler (siehe Proof A)` : `✓ Rechenweg für diesen Schritt fehlerfrei`;

      if (detail.isExactMatch) {
        lines.push(`* Zielwert ${targetStr}: Gefunden${stepStr}${studentUnitStr} -> EXAKTER MATCH (Wert & Einheit physikalisch korrekt)`);
        lines.push(`  → ${logicIndicator}`);
      } else if (detail.isPrefixError) {
        lines.push(`* Zielwert ${targetStr}: Gefunden${stepStr}${studentUnitStr} -> PRÄFIX-FEHLER (Zahlenwert stimmt als nackte Zahl, aber SI-Präfix/Größenordnung ist falsch)`);
        lines.push(`  → ${logicIndicator}`);
        lines.push(`  → Prüfe die Einheitsbezeichnung im Schülertext. Rechenweg-Punkt: JA, Einheits-Punkt: abhängig vom Erwartungshorizont.`);
      } else if (detail.isUnitMismatch) {
        lines.push(`* Zielwert ${targetStr}: Gefunden${stepStr}${studentUnitStr} -> UNIT-MISMATCH (Zahlenwert stimmt physikalisch, aber Einheitsbezeichnung weicht ab)`);
        lines.push(`  → ${logicIndicator}`);
        lines.push(`  → Prüfe die Einheitsbezeichnung im Schülertext. Rechenweg-Punkt: JA, Einheits-Punkt: abhängig vom Erwartungshorizont.`);
      } else {
        lines.push(`* Zielwert ${targetStr}: NICHT erreicht oder übersprungen`);
      }
    } else {
      // Pure numeric target (no unit expected)
      const matchingStep = ast.find(step => isWithinTolerance(step.result, expected, TOLERANCE));
      if (matchingStep) {
        const hasErrorInStep = sandboxErrors.some(err => err.includes(matchingStep.id));
        const logicIndicator = hasErrorInStep ? `⚠ Rechenweg für diesen Schritt enthält Rechenfehler (siehe Proof A)` : `✓ Rechenweg für diesen Schritt fehlerfrei`;
        lines.push(`* Zielwert ${targetStr}: Gefunden in ${matchingStep.id} -> MATCH (Reiner Zahlenwert-Abgleich)`);
        lines.push(`  → ${logicIndicator}`);
      } else {
        lines.push(`* Zielwert ${targetStr}: NICHT erreicht oder übersprungen`);
      }
    }
  });

  // ── Grading Rubric ──
  if (target.gradingRubric && target.gradingRubric.trim().length > 0) {
    lines.push(`\n--- LEHRER-ERWARTUNGSHORIZONT ---`);
    lines.push(target.gradingRubric);
  }

  return lines.join('\n');
}
