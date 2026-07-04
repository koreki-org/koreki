/**
 * CalcTrace Engine V7 — Unit-Aware Grading Tests
 *
 * Tests cover:
 * - Proof A: Internal AST consistency (sandbox errors)
 * - Proof B: Goal reached with exact match, SI-equivalent match, unit mismatch
 * - 3-tier model: Perfect / Unit-Mismatch / Wrong
 */

import { evaluateCalcTrace } from '@/lib/grading/CalcTrace';
import type { StudentASTStep, TargetGoal } from '@/lib/grading/calc-trace-types';

describe('CalcTrace Engine V7 - Core (Proof A & B)', () => {

  test('Scenario 1: Perfect Solution — exact value match, no units', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '230 * 10', result: 2300 },
    ];

    const target: TargetGoal = {
      targetValue: 2300,
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    expect(result).not.toHaveProperty('totalPoints');
    expect(result.unitMismatch).toBeUndefined();
  });

  test('Scenario 2: Wrong values — goal missed', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '23 * 10', result: 230 },
    ];

    const target: TargetGoal = {
      targetValue: 2300,
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(false);
    expect(result).not.toHaveProperty('totalPoints');
  });

  test('Scenario 3: Folgefehler — Proof A clean, Proof B missed', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '23 * 10', result: 230 },
    ];

    const target: TargetGoal = {
      targetValue: 2300,
      maxPoints: 3,
      unit: 'W',
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0); // Proof A clean
    expect(result.isGoalReached).toBe(false);      // Proof B missed
    expect(result).not.toHaveProperty('totalPoints');     // LLM decides via Folgefehler rule
  });

  test('Scenario 4: Internal calculation error — Proof A fails', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '230 * 10', result: 2500 }, // 230*10=2300, not 2500
    ];

    const target: TargetGoal = {
      targetValue: 2300,
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors.length).toBeGreaterThan(0);
    expect(result.isGoalReached).toBe(false);
  });

  test('Scenario 5: 5% tolerance — close result accepted', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '230 * 10', result: 2300 },
    ];

    const target: TargetGoal = {
      targetValue: 2310, // Within 5% of 2300
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    expect(result).not.toHaveProperty('totalPoints');
  });

  test('Scenario 6: Empty AST — no student steps', () => {
    const ast: StudentASTStep[] = [];

    const target: TargetGoal = {
      targetValue: 2300,
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.isGoalReached).toBe(false);
    expect(result.missedTargets).toEqual([2300]);
  });

  test('Scenario 7: Multi-step chain with intermediate milestone', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '5 / 60', result: 0.08333 },
      { id: 'step_2', formula: '2300 * step_1', result: 191.67 },
    ];

    const target: TargetGoal = {
      targetValue: 191.67,
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    expect(result).not.toHaveProperty('totalPoints');
  });
});

describe('CalcTrace Engine V7 — Unit-Aware Grading (3-Tier Model)', () => {

  test('Tier A: Perfect match — value AND unit both exact', () => {
    // Student writes 1.846 mA, target is 1.846 mA → exact match
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '12 / 6.5', result: 1.846, unit: 'mA' },
    ];

    const target: TargetGoal = {
      targetValue: 1.846,
      unit: 'mA',
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    expect(result).not.toHaveProperty('totalPoints'); // Auto-assigned (exact match)
    expect(result.unitMismatch).toBeUndefined();
  });

  test('Tier B: Unit mismatch — student computes in A, target is mA', () => {
    // Student: 12/6500 = 0.001846 mA (wrong unit! should be A)
    // Target: 1.846 mA
    // The raw number 0.001846 matches the SI base of 1.846 mA
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '12 / 6500', result: 0.001846, unit: 'mA' },
    ];

    const target: TargetGoal = {
      targetValue: 1.846,
      unit: 'mA',
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    // NOT auto-assigned because unit label is wrong
    expect(result).not.toHaveProperty('totalPoints');
    expect(result.unitMismatch).toBe(true);
    expect(result.unitDetails).toBeDefined();
    expect(result.unitDetails![0].isUnitMismatch).toBe(true);
  });

  test('Tier B: Student computes in A (correct), target is mA', () => {
    // Student: 12/6500 = 0.001846 A (physically correct!)
    // Target: 1.846 mA
    // math.unit(0.001846, "A").toSI() = 0.001846 A = 1.846 mA ✓
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '12 / 6500', result: 0.001846, unit: 'A' },
    ];

    const target: TargetGoal = {
      targetValue: 1.846,
      unit: 'mA',
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    // Physically correct → exact match (after unit normalization)
    expect(result).not.toHaveProperty('totalPoints');
  });

  test('Tier B: Student computes in Ω, target is kΩ', () => {
    // Student: 4000 + 2500 = 6500 Ω
    // Target: 6.5 kΩ
    // math.unit(6500, "ohm").toSI() = math.unit(6.5, "kohm").toSI() ✓
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '4000 + 2500', result: 6500, unit: 'Ω' },
    ];

    const target: TargetGoal = {
      targetValue: 6.5,
      unit: 'kΩ',
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    // 6500 Ω = 6.5 kΩ → physically equivalent, exact match
    expect(result).not.toHaveProperty('totalPoints');
  });

  test('Tier C: Value completely wrong', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '23 * 10', result: 230, unit: 'W' },
    ];

    const target: TargetGoal = {
      targetValue: 2300,
      unit: 'W',
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.isGoalReached).toBe(false);
    expect(result).not.toHaveProperty('totalPoints');
    expect(result.unitMismatch).toBeUndefined();
  });

  test('No unit on target: pure numeric comparison', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '23 * 10', result: 230 },
    ];

    const target: TargetGoal = {
      targetValue: 2300,
      maxPoints: 3,
      // No unit → no SI expansion → 230 ≠ 2300
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.isGoalReached).toBe(false);
    expect(result.sandboxErrors).toHaveLength(0);
  });

  test('No unit on student step: SI-only match defers to LLM', () => {
    // Student: 12/6500 = 0.001846 (NO unit written)
    // Target: 1.846 mA
    // Value matches SI base but no student unit to verify
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '12 / 6500', result: 0.001846 },
    ];

    const target: TargetGoal = {
      targetValue: 1.846,
      unit: 'mA',
      maxPoints: 3,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(true);
    // No student unit → can't verify label → unitMismatch, defer to LLM
    expect(result).not.toHaveProperty('totalPoints');
    expect(result.unitMismatch).toBe(true);
  });

  test('Multi-target with mixed units (Rges + I)', () => {
    // Rges = 4+2.5 = 6.5 kΩ → student writes 6500 Ω
    // I = 12/6500 = 0.001846 → student writes mA (wrong: should be A)
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '4 + 2.5', result: 6.5 },
      { id: 'step_2', formula: 'step_1 * 1000', result: 6500, unit: 'Ω' },
      { id: 'step_3', formula: '12 / step_2', result: 0.001846, unit: 'mA' },
    ];

    const target: TargetGoal = {
      targetValue: [6.5, 1.846],
      unit: 'kΩ, mA',
      maxPoints: 6,
    };

    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    // 6.5 is found directly (step_1), 6500 Ω = 6.5 kΩ also valid
    expect(result.reachedTargets).toContain(6.5);
    // 0.001846 mA ≠ 1.846 mA → unit mismatch detected
    expect(result.unitMismatch).toBe(true);
  });
});
