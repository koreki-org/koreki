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

  describe('traceStepChain and perTargetResult (Deterministic Criteria-JSON v4)', () => {
    it('1. Shared Step dependency: helper step referenced by two targets propagates errors and step IDs to both', () => {
      const targetGoals: TargetGoal = {
        targetValue: '20, 200', // Two target values
        maxPoints: 4,
        unit: 'm, cm'
      };
      const ast: StudentASTStep[] = [
        { id: 'step_1', formula: '10 + 5', result: 20 }, // 10+5=15, but student wrote 20 (sandbox error!)
        { id: 'step_2', formula: 'step_1 * 1', result: 20, unit: 'm' }, // Target 0 (20 m)
        { id: 'step_3', formula: 'step_1 * 10', result: 200, unit: 'cm' } // Target 1 (200 cm)
      ];

      const result = evaluateCalcTrace(ast, targetGoals);

      expect(result.sandboxErrors.length).toBe(1); // Error in step_1
      expect(result.perTargetResult).toBeDefined();
      expect(result.perTargetResult!.length).toBe(2);

      const pt0 = result.perTargetResult![0];
      const pt1 = result.perTargetResult![1];

      // Both targets should have the error in step_1 because both steps depend on step_1
      expect(pt0.reached).toBe(true);
      expect(pt0.hasCalculationError).toBe(true);
      expect(pt0.associatedStepIds).toContain('step_1');
      expect(pt0.associatedStepIds).toContain('step_2');

      expect(pt1.reached).toBe(true);
      expect(pt1.hasCalculationError).toBe(true);
      expect(pt1.associatedStepIds).toContain('step_1');
      expect(pt1.associatedStepIds).toContain('step_3');
    });

    it('2. Orphaned step error isolation: calculation error in orphaned step does not affect any target', () => {
      const targetGoals: TargetGoal = {
        targetValue: '50',
        maxPoints: 2,
        unit: 'kg'
      };
      const ast: StudentASTStep[] = [
        { id: 'step_1', formula: '25 * 2', result: 50, unit: 'kg' }, // Target reached!
        { id: 'step_orphaned', formula: '100 / 0.5', result: 50 } // 100 / 0.5 = 200, result is 50. Sandbox error!
      ];

      const result = evaluateCalcTrace(ast, targetGoals);

      // Orphaned step has a calculation error, which is caught globally
      expect(result.sandboxErrors.length).toBe(1);
      expect(result.sandboxErrors[0]).toContain('step_orphaned');

      // The target result for Target 0 should NOT have a calculation error or associated step ID
      expect(result.perTargetResult).toBeDefined();
      expect(result.perTargetResult!.length).toBe(1);

      const pt = result.perTargetResult![0];
      expect(pt.reached).toBe(true);
      expect(pt.hasCalculationError).toBe(false);
      expect(pt.associatedStepIds).toContain('step_1');
      expect(pt.associatedStepIds).not.toContain('step_orphaned');
    });
  });

  describe('Regex-Fast-Path and parseGeneratedCalcTrace (calc-trace-generator)', () => {
    const { compileRubricRegex, parseGeneratedCalcTrace } = require('../../src/lib/grading/calc-trace-generator');

    it('should successfully compile rubric via Regex-Fast-Path Pattern A (pro Meilenstein)', () => {
      const target: TargetGoal = {
        targetValue: '12, 24, 36',
        maxPoints: 3,
        unit: 'm, m, m'
      };
      const criteria = compileRubricRegex('1P pro Meilenstein', target);
      expect(criteria).toBeDefined();
      expect(criteria!.length).toBe(3);
      expect(criteria![0].punktwert).toBe(1);
      expect(criteria![0].source).toBe('proofB');
      expect(criteria![0].targetIndex).toBe(0);
      expect(criteria![2].targetIndex).toBe(2);
    });

    it('should successfully compile rubric via Regex-Fast-Path Pattern B (Formel, Einsetzen, Ergebnis)', () => {
      const target: TargetGoal = {
        targetValue: '42',
        maxPoints: 5,
        unit: 'kg'
      };
      const criteria = compileRubricRegex('1P für Formel, 1P Einsetzen, 3P Ergebnis', target);
      expect(criteria).toBeDefined();
      expect(criteria!.length).toBe(3);
      expect(criteria![0].id).toBe('formel');
      expect(criteria![0].punktwert).toBe(1);
      expect(criteria![0].source).toBe('llm');
      expect(criteria![1].id).toBe('einsetzen');
      expect(criteria![2].id).toBe('ergebnis');
      expect(criteria![2].punktwert).toBe(3);
      expect(criteria![2].source).toBe('proofB');
    });

    it('should fallback to parseGeneratedCalcTrace and apply regex if criteria is missing', () => {
      const rawOutput = JSON.stringify({
        targetValue: '42',
        maxPoints: 5,
        unit: 'kg',
        gradingRubric: '1P für Formel, 1P Einsetzen, 3P Ergebnis'
      });
      const target = parseGeneratedCalcTrace(rawOutput);
      expect(target).toBeDefined();
      expect(target.criteria).toBeDefined();
      expect(target.criteria!.length).toBe(3);
      expect(target.criteria![0].id).toBe('formel');
    });
  });

  describe('prompt-builder.ts structured criteria injection', () => {
    const { buildCorrectionPrompt } = require('../../src/lib/ai/prompt-builder');

    it('should pre-resolve and inject structured criteria into system prompt', () => {
      const task = {
        name: 'Kondensatorenergie',
        maxPoints: 3,
        targetGoal: {
          targetValue: '78.5, 785',
          maxPoints: 3,
          unit: 'cm², cm³',
          criteria: [
            { id: 'flaeche_formel', label: 'Formel für Fläche korrekt', punktwert: 1, source: 'llm' },
            { id: 'volumen_formel', label: 'Formel für Volumen korrekt', punktwert: 0, source: 'llm' },
            { id: 'volumen_ergebnis', label: 'Ergebnis Volumen erreicht', punktwert: 2, source: 'proofB', targetIndex: 1 }
          ]
        },
        calcTraceResult: {
          isGoalReached: false,
          sandboxErrors: ['Rechenfehler in step_1: ...'],
          reachedTargets: [78.5],
          missedTargets: [785],
          ast: [
            { id: 'step_1', formula: '3.14 * 5^2', result: 78.5 },
            { id: 'step_2', formula: 'step_1 * 10', result: 785 }
          ],
          perTargetResult: [
            { targetIndex: 0, reached: true, hasCalculationError: true, associatedStepIds: ['step_1'] },
            { targetIndex: 1, reached: false, hasCalculationError: true, associatedStepIds: ['step_2', 'step_1'] }
          ]
        }
      } as any;

      const prompt = buildCorrectionPrompt(
        'Model solution',
        'Student text',
        [task]
      );

      // Verify that the structured criteria block is injected into the system prompt!
      expect(prompt.system).toContain('### STRUKTURIERTE BEWERTUNGSKRITERIEN FÜR "Kondensatorenergie"');
      expect(prompt.system).toContain('- Kriterium "flaeche_formel" (Formel für Fläche korrekt - 1 Punkte): [von dir zu beurteilen anhand der Schritte: step_1]');
      expect(prompt.system).toContain('- Kriterium "volumen_ergebnis" (Ergebnis Volumen erreicht - 2 Punkte): ✗ NICHT ERFÜLLT (Zielwert nicht erreicht/nicht notiert)');
    });
  });
});
