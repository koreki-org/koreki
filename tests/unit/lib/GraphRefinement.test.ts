import { buildGraphRefinementPrompt } from '../../../src/lib/grading/graph-generator';
import { GradingGraph } from '../../../src/lib/grading/types';

describe('GradingGraph AI Refinement — Prompt Builder Tests', () => {
  const currentGraph: GradingGraph = {
    taskId: 'quader-volumen-123',
    discipline: 'mathematics',
    variables: [
      { id: 'laenge', type: 'input', defaultValue: 10, validationType: 'exact', maxPoints: 1 },
      { id: 'breite', type: 'input', defaultValue: 5, validationType: 'exact', maxPoints: 1 },
      { id: 'volumen', type: 'formula', expression: 'math.multiply(laenge, breite)', validationType: 'exact', maxPoints: 2 }
    ]
  };

  const taskText = "Berechne das Volumen eines Quaders mit Länge=10 und Breite=5.";
  const userInstruction = "Füge eine Variable für die Höhe hinzu und multipliziere sie.";

  test('should correctly build refinement prompt with strictly hardened greedy options', () => {
    const prompt = buildGraphRefinementPrompt(taskText, currentGraph, userInstruction, 'mathematics');

    // 1. Verify structure
    expect(prompt.system).toBeDefined();
    expect(prompt.user).toBeDefined();

    // 2. Verify strict parameter hardening (temperature 0.0, topP 1.0)
    expect(prompt.options).toBeDefined();
    expect(prompt.options?.temperature).toBe(0.0);
    expect(prompt.options?.topP).toBe(1.0);

    // 3. Verify user instruction interpolation
    expect(prompt.user).toContain(taskText);
    expect(prompt.user).toContain(userInstruction);
    expect(prompt.user).toContain('quader-volumen-123'); // Contains graph ID
    expect(prompt.user).toContain('math.multiply(laenge, breite)'); // Contains existing expression
  });

  test('should handle optional discipline hints in user prompt', () => {
    const promptWithDiscipline = buildGraphRefinementPrompt(taskText, currentGraph, userInstruction, 'computer-science');
    expect(promptWithDiscipline.user).toContain('computer-science');

    const promptWithoutDiscipline = buildGraphRefinementPrompt(taskText, currentGraph, userInstruction);
    expect(promptWithoutDiscipline.user).not.toContain('computer-science');
  });
});
