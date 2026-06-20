import { evaluateCalcTrace } from '../../../src/lib/grading/CalcTrace';
import type { CalcTrace } from '../../../src/lib/grading/calc-trace-types';

describe('CalcTrace Engine - Math/Physics Grading Tests', () => {
  // Physik-Aufgabe: W = P * t = 2300 W * 5/60 h = 191.59 Wh
  const physicsTrace: CalcTrace = {
    taskId: 'physics-power-1',
    steps: [
      { id: 'P', label: 'Leistung P', type: 'given', value: 2300, unit: 'W' },
      { id: 't', label: 'Zeit t', type: 'given', value: 0.0833, unit: 'h', tolerance: 0.01 },
      { id: 'W', label: 'Energie W', type: 'calc', value: 191.59, formula: 'P * t', unit: 'Wh', tolerance: 0.01, points: 2 }
    ]
  };

  test('Scenario 1: Perfect Solution (100% correct)', () => {
    const studentAnswers = {
      P: 2300,
      t: 0.0833,
      W: 191.59
    };

    const result = evaluateCalcTrace(physicsTrace, studentAnswers);

    expect(result.totalPoints).toBe(4); // 1 + 1 + 2
    expect(result.maxPoints).toBe(4);
    expect(result.primaryErrors).toBe(0);
    expect(result.consecutiveErrors).toBe(0);

    expect(result.results[0].status).toBe('correct');
    expect(result.results[1].status).toBe('correct');
    expect(result.results[2].status).toBe('correct');
  });

  test('Scenario 2: Primary Error in Given Step', () => {
    const studentAnswers = {
      P: 2300,
      t: 0.12, // Expected: 0.0833
      W: 191.59 // They didn't calculate with their wrong t=0.12, they just wrote the correct solution value from memory/copying
    };

    const result = evaluateCalcTrace(physicsTrace, studentAnswers);

    expect(result.results[0].status).toBe('correct');
    expect(result.results[1].status).toBe('error'); // Primary error in t
    expect(result.results[2].status).toBe('error'); // Inconsistent with wrong t=0.12
    expect(result.totalPoints).toBe(1); // P (1) + t (0) + W (0)
    expect(result.primaryErrors).toBe(2);
    expect(result.consecutiveErrors).toBe(0);
  });

  test('Scenario 3: Consecutive Error Compensation (Follow-Through)', () => {
    // The student makes a primary error in 't' (0.12 instead of 0.0833).
    // But they calculate W correctly using their wrong t: W = 2300 * 0.12 = 276.
    const studentAnswers = {
      P: 2300,
      t: 0.12, // Error
      W: 276 // Correctly calculated with t=0.12
    };

    const result = evaluateCalcTrace(physicsTrace, studentAnswers);

    expect(result.results[0].status).toBe('correct');
    expect(result.results[1].status).toBe('error'); // Primary error
    expect(result.results[2].status).toBe('consecutive'); // Compensated follow-through error
    expect(result.results[2].pointsAwarded).toBe(2); // Full points for correct calculation logic

    expect(result.totalPoints).toBe(3); // P (1) + t (0) + W (2)
    expect(result.primaryErrors).toBe(1);
    expect(result.consecutiveErrors).toBe(1);
  });

  test('Scenario 4: Multiple Independent Errors', () => {
    // Both P and t are wrong, and W is also wrong (doesn't match expected or computed).
    const studentAnswers = {
      P: 1000, // Expected: 2300
      t: 0.12, // Expected: 0.0833
      W: 500   // Expected: 191.59, computed: 120
    };

    const result = evaluateCalcTrace(physicsTrace, studentAnswers);

    expect(result.results[0].status).toBe('error');
    expect(result.results[1].status).toBe('error');
    expect(result.results[2].status).toBe('error');

    expect(result.totalPoints).toBe(0);
    expect(result.primaryErrors).toBe(3);
    expect(result.consecutiveErrors).toBe(0);
  });

  test('Scenario 5: Omission (Missing Value)', () => {
    const studentAnswers = {
      P: 2300,
      t: null, // Omitted
      W: 191.59
    };

    const result = evaluateCalcTrace(physicsTrace, studentAnswers);

    expect(result.results[0].status).toBe('correct');
    expect(result.results[1].status).toBe('omission');
    expect(result.results[2].status).toBe('error'); // Inconsistent due to omitted t

    expect(result.totalPoints).toBe(1); // P (1) + t (0) + W (0)
    expect(result.primaryErrors).toBe(1); // W is now a primary error
    expect(result.consecutiveErrors).toBe(0);
  });

  test('Scenario 6: Tolerance Matching', () => {
    // Within 1% tolerance: 2300 * 0.0833 = 191.59
    // Student writes 192 (difference is ~0.2%, within 1%)
    const studentAnswers = {
      P: 2300,
      t: 0.0833,
      W: 192
    };

    const result = evaluateCalcTrace(physicsTrace, studentAnswers);

    expect(result.results[2].status).toBe('correct');
    expect(result.totalPoints).toBe(4);
  });

  test('Scenario 7: Fraction Precision via mathjs', () => {
    // Formula with division: a / b
    const fractionTrace: CalcTrace = {
      taskId: 'fraction-task-1',
      steps: [
        { id: 'a', label: 'Wert a', type: 'given', value: 5 },
        { id: 'b', label: 'Wert b', type: 'given', value: 60 },
        { id: 'result', label: 'Division', type: 'calc', value: 0.08333, formula: 'a / b', tolerance: 0.001 }
      ]
    };

    const studentAnswers = {
      a: 5,
      b: 60,
      result: 0.08333
    };

    const result = evaluateCalcTrace(fractionTrace, studentAnswers);
    expect(result.results[2].status).toBe('correct');
  });
});
