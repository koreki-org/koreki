import { buildStudentSimulatorPrompt } from '../../src/lib/ai/prompt-builder';
import { Task } from '../../src/types';

describe('GradingMemory Prompt Builder - Unit Tests (Layer 1)', () => {
    const mockModelSolution = 'Musterlösung: Aufgabe 1: Das Ergebnis ist 42.';
    const mockTasks: Task[] = [
        { name: 'Aufgabe 1', maxPoints: 5 },
        { name: 'Aufgabe 2', maxPoints: 10 },
        { name: 'Aufgabe 3', maxPoints: 15 }
    ];

    it('should inject model solution and default layout string when no layout is provided', () => {
        const prompt = buildStudentSimulatorPrompt(mockModelSolution);
        
        expect(prompt.user).toContain(mockModelSolution);
        expect(prompt.user).toContain('Keine explizite Struktur vorhanden. Nimm Standardaufgaben an.');
        expect(prompt.options.temperature).toBe(0.7);
    });

    it('should inject correct layout structure when tasksLayout is provided', () => {
        const prompt = buildStudentSimulatorPrompt(mockModelSolution, mockTasks);
        
        expect(prompt.user).toContain('- Aufgabe 1 (Max: 5 P)');
        expect(prompt.user).toContain('- Aufgabe 2 (Max: 10 P)');
        expect(prompt.user).toContain('- Aufgabe 3 (Max: 15 P)');
    });

    it('should handle selectedTasks and rotate student types sequentially', () => {
        const selectedTasks = ['Aufgabe 1', 'Aufgabe 2', 'Aufgabe 3', 'Aufgabe 1'];
        const prompt = buildStudentSimulatorPrompt(mockModelSolution, mockTasks, selectedTasks);

        expect(prompt.user).toContain('### AUSGEWÄHLTE AUFGABEN FÜR DIE SIMULATION:');
        expect(prompt.user).toContain('- Aufgabe: "Aufgabe 1" -> Simuliere Schülertyp: "TYPO"');
        expect(prompt.user).toContain('- Aufgabe: "Aufgabe 2" -> Simuliere Schülertyp: "MATH_STEP_MISSING"');
        expect(prompt.user).toContain('- Aufgabe: "Aufgabe 3" -> Simuliere Schülertyp: "SEMANTIC_LENIENT"');
        // Rotates back to TYPO
        expect(prompt.user).toContain('- Aufgabe: "Aufgabe 1" -> Simuliere Schülertyp: "TYPO"');
        expect(prompt.user).toContain('Generiere genau 4 Schülerantwort(en).');
    });
});
