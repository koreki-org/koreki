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
    expect(result.totalPoints).toBe(5);
  });

  it('should detect a sandbox error if the internal math is wrong (Proof A fails)', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 10', result: 120 } // 10*10 = 100, but student claims 120
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(1);
    expect(result.sandboxErrors[0]).toContain('Rechenfehler');
    expect(result.totalPoints).toBeUndefined(); // Leaves for LLM
  });

  it('should detect if the math is correct but target is missed (Proof B fails)', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 10', result: 100 } // student did correctly 10*10=100
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(0); // Internally consistent
    expect(result.isGoalReached).toBe(false); // But 100 !== 120
    expect(result.totalPoints).toBeUndefined(); // LLM gives partial points
  });

  it('should allow consecutive calculations referencing previous step ids', () => {
    const ast: StudentASTStep[] = [
      { id: 'step_1', formula: '10 * 2', result: 20 },
      { id: 'step_2', formula: 'step_1 * 6', result: 120 }
    ];

    const result = evaluateCalcTrace(ast, target);
    
    expect(result.sandboxErrors.length).toBe(0);
    expect(result.isGoalReached).toBe(true);
    expect(result.totalPoints).toBe(5);
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
});
