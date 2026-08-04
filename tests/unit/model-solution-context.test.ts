import { composeModelSolution, joinTaskSections, MODEL_SOLUTION_CONTEXT_HEADING } from '../../src/lib/task-utils';
import { Task } from '../../src/types';
import analyzeCleanSystem from '../../src/prompts/core/default/analyze-and-clean/system.md';

const tasks: Task[] = [
    { name: 'Aufgabe 1', maxPoints: 6 },
    { name: 'Aufgabe 2', maxPoints: 4 }
];
const sections = ['Lösung eins.', 'Lösung zwei.'];

describe('composeModelSolution', () => {
    it('puts the shared context in front of the task sections', () => {
        const result = composeModelSolution('Ein Unternehmen plant eine Umstellung.', sections, tasks);

        expect(result).toContain(MODEL_SOLUTION_CONTEXT_HEADING);
        expect(result.indexOf('Ein Unternehmen plant eine Umstellung.')).toBeLessThan(result.indexOf('### Aufgabe 1 ###'));
    });

    it('keeps every task section intact', () => {
        const result = composeModelSolution('Rahmen', sections, tasks);

        expect(result).toContain('### Aufgabe 1 ###\nLösung eins.');
        expect(result).toContain('### Aufgabe 2 ###\nLösung zwei.');
    });

    it('falls back to the plain join when there is no context', () => {
        const plain = joinTaskSections(sections, tasks);

        expect(composeModelSolution('', sections, tasks)).toBe(plain);
        expect(composeModelSolution(undefined, sections, tasks)).toBe(plain);
        expect(composeModelSolution('   \n  ', sections, tasks)).toBe(plain);
    });

    it('does not add the heading twice when composing repeatedly', () => {
        const once = composeModelSolution('Rahmen', sections, tasks);
        const twice = composeModelSolution('Rahmen', sections, tasks);

        expect(twice).toBe(once);
        expect(once.split(MODEL_SOLUTION_CONTEXT_HEADING)).toHaveLength(2);
    });
});

describe('Analyse-Prompt: Vertrag für das context-Feld', () => {
    it('declares context in the required JSON shape', () => {
        expect(analyzeCleanSystem).toContain('"context"');
    });

    it('forbids putting the shared frame into the task content', () => {
        expect(analyzeCleanSystem).toContain('NICHT in "tasks[].content"');
    });

    it('requires an empty string instead of an invented frame', () => {
        expect(analyzeCleanSystem).toContain('"context": ""');
        expect(analyzeCleanSystem).toContain('Erfinde niemals einen.');
    });

    it('keeps the existing rule that content stays task-specific', () => {
        // Regression: das neue Feld darf die bestehende Zuordnungsregel nicht verdrängen.
        expect(analyzeCleanSystem).toContain('darf NIEMALS den gesamten Text des Dokuments enthalten');
    });
});
