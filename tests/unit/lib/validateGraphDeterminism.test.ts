import { validateGraphDeterminism } from '../../../src/lib/grading/graph-generator';
import { GradingGraph } from '../../../src/lib/grading/types';

describe('validateGraphDeterminism', () => {
  test('should pass validation for a valid math graph', () => {
    const validGraph: GradingGraph = {
      taskId: 'test-task',
      discipline: 'mathematics',
      variables: [
        { id: 'laenge', type: 'input', defaultValue: 10, validationType: 'exact', maxPoints: 0 },
        { id: 'breite', type: 'input', defaultValue: 5, validationType: 'exact', maxPoints: 0 },
        { id: 'volumen', type: 'formula', expression: 'laenge * breite', validationType: 'exact', maxPoints: 2 }
      ]
    };

    const result = validateGraphDeterminism(validGraph);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should fail validation if graph has no variables', () => {
    const invalidGraph: GradingGraph = {
      taskId: 'test-task',
      discipline: 'mathematics',
      variables: []
    };

    const result = validateGraphDeterminism(invalidGraph);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('keine Variablen');
  });

  test('should fail validation if input variable lacks defaultValue', () => {
    const invalidGraph: GradingGraph = {
      taskId: 'test-task',
      discipline: 'mathematics',
      variables: [
        { id: 'laenge', type: 'input', validationType: 'exact', maxPoints: 0 }
      ]
    };

    const result = validateGraphDeterminism(invalidGraph as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('keinen Standardwert');
  });

  test('should fail validation if formula has syntactical syntax error', () => {
    const invalidGraph: GradingGraph = {
      taskId: 'test-task',
      discipline: 'mathematics',
      variables: [
        { id: 'laenge', type: 'input', defaultValue: 10, validationType: 'exact', maxPoints: 0 },
        { id: 'volumen', type: 'formula', expression: 'laenge * * 2', validationType: 'exact', maxPoints: 2 }
      ]
    };

    const result = validateGraphDeterminism(invalidGraph);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Auswertungsfehler bei Formel');
  });
});
