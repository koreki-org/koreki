import { buildStudentSimulatorPrompt, buildCorrectionPrompt } from '../../src/lib/ai/prompt-builder';
import { GradingMemoryCase, Task } from '../../src/types';

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
        expect(prompt.options?.temperature).toBe(0.7);
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

describe('Correction Prompt - Grading Memory Placement (Layer 1)', () => {
    const tasksLayout: Task[] = [
        { name: 'Aufgabe 1a', maxPoints: 4 },
        { name: 'Aufgabe 2b', maxPoints: 6 }
    ];

    const makeCase = (id: string, taskName: string | undefined, notes: string): GradingMemoryCase => ({
        id,
        taskName,
        studentText: `Antwort ${id}`,
        expectedCorrection: { pointsObtained: 3, maxPoints: 6, correctionNotes: notes }
    });

    const build = (cases: GradingMemoryCase[]) =>
        buildCorrectionPrompt('Musterlösung', 'Schülerabgabe', tasksLayout, undefined, undefined, cases).user;

    it('should place each example inside the group of its own task', () => {
        const user = build([makeCase('c1', 'Aufgabe 2b', 'Fachbegriff falsch'), makeCase('c2', 'Aufgabe 1a', 'Unvollständig')]);

        expect(user).toContain('<task_reference task="Aufgabe 1a">');
        expect(user).toContain('<task_reference task="Aufgabe 2b">');

        const group1a = user.slice(user.indexOf('<task_reference task="Aufgabe 1a">'), user.indexOf('</task_reference>'));
        expect(group1a).toContain('Antwort c2');
        expect(group1a).not.toContain('Antwort c1');
    });

    it('should order the groups like the task layout, not like the case list', () => {
        const user = build([makeCase('c1', 'Aufgabe 2b', 'Zuerst gespeichert'), makeCase('c2', 'Aufgabe 1a', 'Danach gespeichert')]);

        expect(user.indexOf('task="Aufgabe 1a"')).toBeLessThan(user.indexOf('task="Aufgabe 2b"'));
    });

    it('should map a drifted task name onto the canonical layout group', () => {
        const user = build([makeCase('c1', '2b)', 'Fachbegriff falsch')]);

        expect(user).toContain('<task_reference task="Aufgabe 2b">');
        expect(user).not.toContain('task="2b)"');
    });

    it('should keep unassignable examples out of every task group', () => {
        const user = build([makeCase('c1', undefined, 'Passt zu nichts'), makeCase('c2', 'Aufgabe 1a', 'Unvollständig')]);

        expect(user).toContain('<unassigned_reference>');

        const unassignedBlock = user.slice(user.indexOf('<unassigned_reference>'), user.indexOf('</unassigned_reference>'));
        expect(unassignedBlock).toContain('Antwort c1');
        expect(unassignedBlock).not.toContain('Antwort c2');
    });

    it('should keep the stored task name visible for unassignable examples', () => {
        const user = build([makeCase('c1', 'Aufgabe 9c', 'Gehört zu keiner Aufgabe des Layouts')]);

        expect(user).toContain('<unassigned_reference>');
        expect(user).toContain('[Betrifft Aufgabe]');
        expect(user).toContain('"Aufgabe 9c"');
    });

    it('should not repeat the task name inside a task group', () => {
        const user = build([makeCase('c1', 'Aufgabe 1a', 'Unvollständig')]);

        expect(user).toContain('<task_reference task="Aufgabe 1a">');
        expect(user).not.toContain('[Betrifft Aufgabe]');
    });

    it('should omit the unassigned section when every example is assigned', () => {
        const user = build([makeCase('c1', 'Aufgabe 1a', 'Unvollständig')]);

        expect(user).not.toContain('<unassigned_reference>');
    });

    it('should not emit a grading memory block at all when no cases exist', () => {
        const user = buildCorrectionPrompt('Musterlösung', 'Schülerabgabe', tasksLayout, undefined, undefined, []).user;

        expect(user).not.toContain('<grading_memory>');
        expect(user).toContain('<task_to_evaluate>');
    });
});
