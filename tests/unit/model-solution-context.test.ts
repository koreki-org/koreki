import {
    composeModelSolution,
    joinTaskSections,
    buildModelSolutionFromTasks,
    MODEL_SOLUTION_CONTEXT_HEADING
} from '../../src/lib/task-utils';
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

describe('buildModelSolutionFromTasks', () => {
    const analysed: Task[] = [
        { name: 'Aufgabe 1', maxPoints: 6, content: 'Erläutern Sie ... Lösung: ... (1 Pkt)' },
        { name: 'Aufgabe 2', maxPoints: 4, content: 'Berechnen Sie ... Lösung: ... (2 Pkt)' }
    ];

    it('carries the frame and every task into the correction input', () => {
        const text = buildModelSolutionFromTasks('Ein Unternehmen betreibt einen Server.', analysed);

        expect(text).toContain(MODEL_SOLUTION_CONTEXT_HEADING);
        expect(text).toContain('Ein Unternehmen betreibt einen Server.');
        expect(text).toContain('### Aufgabe 1 ###');
        expect(text).toContain('### Aufgabe 2 ###');
        expect(text).toContain('(1 Pkt)');
        expect(text).toContain('(2 Pkt)');
    });

    it('leaves out the frame heading when there is no frame', () => {
        const text = buildModelSolutionFromTasks('', analysed);

        expect(text).not.toContain(MODEL_SOLUTION_CONTEXT_HEADING);
        expect(text).toContain('### Aufgabe 1 ###');
    });

    it('keeps an empty task visible as an empty section instead of hiding it', () => {
        // Fehlender Inhalt ist ein sichtbarer Analysefehler und wird nicht kaschiert.
        const text = buildModelSolutionFromTasks('', [...analysed, { name: 'Aufgabe 3', maxPoints: 2, content: '' }]);

        expect(text).toContain('### Aufgabe 3 ###');
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

    it('restricts the frame to material at least two tasks rely on', () => {
        // Ohne harte Untergrenze zieht das Modell auch aufgabeneigene Tabellen in den Rahmen.
        expect(analyzeCleanSystem).toContain('MINDESTENS ZWEI Aufgaben');
    });

    it('demands that references inside a task resolve inside that task', () => {
        // "Wählen Sie aus der Liste unten" darf nicht ins Leere zeigen, weil die Liste
        // in den Rahmen gewandert ist.
        expect(analyzeCleanSystem).toContain('SELBSTPRÜFUNG');
        expect(analyzeCleanSystem).toContain('Ein Verweis, der ins Leere zeigt, ist ein Fehler.');
    });

    it('defaults to the task when the assignment is unclear', () => {
        expect(analyzeCleanSystem).toContain('IM ZWEIFEL gehört Text in die Aufgabe');
    });

    it('keeps the existing rule that content stays task-specific', () => {
        // Regression: das neue Feld darf die bestehende Zuordnungsregel nicht verdrängen.
        expect(analyzeCleanSystem).toContain('darf NIEMALS den gesamten Text des Dokuments enthalten');
    });
});
