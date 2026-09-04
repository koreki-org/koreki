/**
 * CalcTrace Engine V7 — Unit-Aware Grading Tests
 *
 * Tests cover:
 * - Proof A: Internal AST consistency (sandbox errors)
 * - Proof B: Goal reached with exact match, SI-equivalent match, unit mismatch
 * - 3-tier model: Perfect / Unit-Mismatch / Wrong
 */

import { evaluateCalcTrace, formatCalcTraceFeedback } from '@/lib/grading/CalcTrace';
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

  test('Falsche Einheitsbezeichnung: Zielwert gilt als nicht erreicht', () => {
    // Student: 12/6500 = 0.001846 mA (falsche Einheit! Richtig waere A)
    // Target: 1.846 mA
    // Die nackte Zahl 0.001846 passt zum SI-Basiswert, mit "mA" ist die Groesse aber um
    // Faktor 1000 daneben. Kein Treffer — aber der Zahlenwert-Befund bleibt erhalten.
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
    expect(result.isGoalReached).toBe(false);
    expect(result).not.toHaveProperty('totalPoints');
    expect(result.unitMismatch).toBe(true);
    expect(result.unitDetails).toBeDefined();
    expect(result.unitDetails![0].isUnitMismatch).toBe(true);
    // Die Tatsache "richtig gerechnet" darf nicht verloren gehen.
    expect(result.unitDetails![0].isValueMatch).toBe(true);
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

  test('Fehlende Einheit: Zielwert gilt als nicht erreicht — wie bei falscher Einheit', () => {
    // Student: 12/6500 = 0.001846 (KEINE Einheit notiert)
    // Target: 1.846 mA
    // Eine fehlende Angabe wird genauso behandelt wie eine falsche. Frueher zaehlte das
    // als voller Treffer — wer nichts hinschrieb, stand besser da als wer sich vertat.
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
    expect(result.isGoalReached).toBe(false);
    expect(result).not.toHaveProperty('totalPoints');
    expect(result.unitMismatch).toBe(true);
    expect(result.unitDetails![0].isMissingUnit).toBe(true);
    expect(result.unitDetails![0].isValueMatch).toBe(true);
  });

  test('Fehlende Einheit wird im Beweistext als solche benannt, nicht als Rechenfehler', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '12 / 6500', result: 0.001846 },
    ];

    const target: TargetGoal = { targetValue: 1.846, unit: 'mA', maxPoints: 3 };

    const text = formatCalcTraceFeedback(evaluateCalcTrace(ast, target), target);

    expect(text).toContain('OHNE EINHEIT');
    expect(text).toContain('NICHT erreicht');

    // Geprueft wird die AUSSAGE, nicht der Wortlaut: Der Text muss festhalten, dass
    // gerechnet richtig wurde, und darf keinen Rechenfehler behaupten. Hier stand bis
    // zum 04.09.2026 die woertliche Wendung "richtig gerechnet" — sie fiel, als der
    // Text von der Anweisung ans Modell ("Benenne im Feedback den fehlenden
    // Einheiten-Zusatz") auf eine Aussage an die Lehrkraft umgestellt wurde, obwohl
    // sich an der Bedeutung nichts geaendert hatte.
    expect(text).toMatch(/richtig gerechnet|[Gg]erechnet wurde richtig/);
    expect(text).not.toContain('Rechenfehler in step_1');
  });

  test('Ein gleichwertiger Zwischenschritt rettet keine einheitenlose Endantwort', () => {
    // Realfall: "1500000 x 512 = 768000000 Byte / 1024 = 750000 KiB / 1024 = 732,42"
    // step_2 (750000 KiB) ist physikalisch exakt 732,422 MiB und galt als Treffer — dadurch
    // wurde die Endantwort in step_3, die gar keine Einheit hat, nie geprueft.
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '1500000 * 512', result: 768000000, unit: 'Byte' },
      { id: 'step_2', formula: '768000000 / 1024', result: 750000, unit: 'KiB' },
      { id: 'step_3', formula: '750000 / 1024', result: 732.42 },
    ];

    const target: TargetGoal = { targetValue: 732.422, unit: 'MiB', maxPoints: 2 };
    const result = evaluateCalcTrace(ast, target);

    expect(result.sandboxErrors).toHaveLength(0);
    expect(result.isGoalReached).toBe(false);
    expect(result.unitDetails![0].stepId).toBe('step_3');
    expect(result.unitDetails![0].isMissingUnit).toBe(true);
    expect(result.unitDetails![0].isValueMatch).toBe(true);
  });

  test('Rechnet der Schüler durchgehend in einer gleichwertigen Einheit, zählt das weiterhin', () => {
    // Ohne einheitenlose Endantwort bleibt die Umrechnungs-Toleranz erhalten:
    // Wer sein Ergebnis in KiB statt MiB angibt, hat die Aufgabe gelöst.
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '1500000 * 512', result: 768000000, unit: 'Byte' },
      { id: 'step_2', formula: '768000000 / 1024', result: 750000, unit: 'KiB' },
    ];

    const target: TargetGoal = { targetValue: 732.422, unit: 'MiB', maxPoints: 2 };
    const result = evaluateCalcTrace(ast, target);

    expect(result.isGoalReached).toBe(true);
    expect(result.unitDetails![0].stepId).toBe('step_2');
  });

  test('Endantwort mit korrekter Einheit bleibt ein Treffer', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '768000000 / 1024', result: 750000, unit: 'KiB' },
      { id: 'step_2', formula: '750000 / 1024', result: 732.42, unit: 'MiB' },
    ];

    const target: TargetGoal = { targetValue: 732.422, unit: 'MiB', maxPoints: 2 };
    const result = evaluateCalcTrace(ast, target);

    expect(result.isGoalReached).toBe(true);
    expect(result.unitDetails![0].stepId).toBe('step_2');
  });

  test('Ohne erwartete Einheit bleibt der reine Zahlenvergleich unberührt', () => {
    // Kein Einheiten-Ziel -> die Verschaerfung darf hier nicht greifen.
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 12', result: 120 },
    ];

    const result = evaluateCalcTrace(ast, { targetValue: 120, maxPoints: 2 });

    expect(result.isGoalReached).toBe(true);
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
