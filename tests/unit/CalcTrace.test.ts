import { evaluateCalcTrace, formatCalcTraceForPrompt } from '../../src/lib/grading/CalcTrace';
import type { StudentASTStep, TargetGoal } from '../../src/lib/grading/calc-trace-types';

describe('CalcTrace Sandbox V6', () => {

  const target: TargetGoal = {
    targetValue: 120,
    maxPoints: 5,
    unit: 'V',
    gradingRubric: '1P Formel, 1P Einsetzen, 3P Ergebnis.'
  };

  it('should grant full points if the math is correct and matches the target', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 12', result: 120 }
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(0);
    expect(result.isGoalReached).toBe(true);
    expect(result).not.toHaveProperty('totalPoints');
  });

  it('should detect a sandbox error if the internal math is wrong (Proof A fails)', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 10', result: 120 } // 10*10 = 100, but student claims 120
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(1);
    expect(result.sandboxErrors[0]).toContain('Rechenfehler');
    expect(result).not.toHaveProperty('totalPoints'); // Leaves for LLM
  });

  it('should detect if the math is correct but target is missed (Proof B fails)', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 10', result: 100 } // student did correctly 10*10=100
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(0); // Internally consistent
    expect(result.isGoalReached).toBe(false); // But 100 !== 120
    expect(result).not.toHaveProperty('totalPoints'); // LLM gives partial points
  });

  it('should allow consecutive calculations referencing previous step ids', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 2', result: 20 },
      { id: 'step_2', formula: 'step_1 * 6', result: 120 }
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(0);
    expect(result.isGoalReached).toBe(true);
    expect(result).not.toHaveProperty('totalPoints');
  });

  it('should block unsafe mathjs syntax', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: 'import("fs")', result: 0 } // Malicious intent
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(1);
    expect(result.sandboxErrors[0]).toContain('Forbidden');
    expect(result.isGoalReached).toBe(false);
  });

  describe('Unit-Aware Proof A (formulaUnit)', () => {
    it('Case 1: Geometrie (legitim)', () => {
      const ast: StudentASTStep[] = [
        { id: 'step_1', formula: '50+30', formulaUnit: 'cm', result: 0.8, unit: 'm' }
      ];
      const result = evaluateCalcTrace(ast, { targetValue: 0.8, maxPoints: 1 });
      expect(result.sandboxErrors.length).toBe(0); // 80 cm == 0.8 m
    });

    it('Case 2: Wasserkocher (Tippfehler)', () => {
      const ast: StudentASTStep[] = [
        { id: 'step_1', formula: '23*10', result: 2300, unit: 'W' } // no formulaUnit
      ];
      const result = evaluateCalcTrace(ast, { targetValue: 2300, maxPoints: 1 });
      expect(result.sandboxErrors.length).toBe(1); // 230 != 2300
      expect(result.sandboxErrors[0]).toContain('Rechenfehler');
    });

    it('Case 3: Reihenschaltung (legitimer Präfix-Wechsel)', () => {
      const ast: StudentASTStep[] = [
        { id: 'step_1', formula: '4+2.5', formulaUnit: 'kΩ', result: 6500, unit: 'Ω' }
      ];
      const result = evaluateCalcTrace(ast, { targetValue: 6500, maxPoints: 1 });
      expect(result.sandboxErrors.length).toBe(0); // 6.5 kOhm == 6500 Ohm
    });

    it('Case 4: Reihenschaltung (echt inkonsistent, nur ein Term skaliert)', () => {
      const ast: StudentASTStep[] = [
        { id: 'step_1', formula: '4000+2.5', result: 6500, unit: 'Ω' } // no formulaUnit
      ];
      const result = evaluateCalcTrace(ast, { targetValue: 6500, maxPoints: 1 });
      expect(result.sandboxErrors.length).toBe(1); // 4002.5 != 6500
      expect(result.sandboxErrors[0]).toContain('Rechenfehler');
    });

    it('Case 5: Context Propagation with formulaUnit', () => {
      const ast: StudentASTStep[] = [
        { id: 'step_1', formula: '50+30', formulaUnit: 'cm', result: 0.8, unit: 'm' },
        { id: 'step_2', formula: 'step_1 * 1000', result: 800, unit: 'mm' }
      ];
      const result = evaluateCalcTrace(ast, { targetValue: 800, maxPoints: 1 });
      expect(result.sandboxErrors.length).toBe(0);
      // context['step_1'] should be 0.8 (the explicitly declared result), so 0.8 * 1000 = 800.
    });
  });
});
