import { resolveTaskName, resolveMaxPoints, normalizeTaskName, canonicalizeTaskName, groupCasesByTask } from '../../src/lib/grading-memory-utils';
import { GradingMemoryCase, Task } from '../../src/types';

const makeCase = (id: string, taskName?: string, correctionNotes = 'Begründung', studentText = 'Antwort'): GradingMemoryCase => ({
    id,
    taskName,
    studentText,
    expectedCorrection: { pointsObtained: 3, maxPoints: 5, correctionNotes }
});

describe('grading-memory-utils', () => {
    describe('resolveTaskName', () => {
        it('should use taskName if provided', () => {
            const { resolvedTaskName, isHighConfidence } = resolveTaskName('Aufgabe 1', 'Some notes', 'Student text');
            expect(resolvedTaskName).toBe('Aufgabe 1');
            expect(isHighConfidence).toBe(true);
        });

        it('should extract taskName from correctionNotes if not provided', () => {
            const { resolvedTaskName, isHighConfidence } = resolveTaskName(undefined, '[Aufgabe: Aufgabe 2] Some notes', 'Student text');
            expect(resolvedTaskName).toBe('Aufgabe 2');
            expect(isHighConfidence).toBe(true);
        });

        it('should fallback to keyword matching from tasksLayout', () => {
            const tasksLayout: Task[] = [
                { name: 'Analysis', content: 'Funktion ableiten x quadrat', maxPoints: '5' },
                { name: 'Geometry', content: 'Dreieck fläche berechnen', maxPoints: '3' }
            ];
            
            const { resolvedTaskName, isHighConfidence } = resolveTaskName(
                undefined, 
                'Fehler beim Ableiten', 
                'Die funktion x quadrat ist abgeleitet...',
                tasksLayout
            );
            
            expect(resolvedTaskName).toBe('Analysis');
            expect(isHighConfidence).toBe(false);
        });
        
        it('should not fallback if score is too low', () => {
            const tasksLayout: Task[] = [
                { name: 'Analysis', content: 'Funktion', maxPoints: '5' },
            ];
            
            const { resolvedTaskName, isHighConfidence } = resolveTaskName(
                undefined, 
                'Unrelated text', 
                'Nothing matches',
                tasksLayout
            );
            
            expect(resolvedTaskName).toBeUndefined();
            expect(isHighConfidence).toBe(false);
        });
    });

    describe('resolveMaxPoints', () => {
        it('should use currentMaxPoints if provided', () => {
            expect(resolveMaxPoints(5, 'Aufgabe 1')).toBe(5);
        });

        it('should resolve maxPoints from tasksLayout based on task name', () => {
            const tasksLayout: Task[] = [
                { name: 'Aufgabe 1', maxPoints: '10' }
            ];
            
            expect(resolveMaxPoints(undefined, 'Aufgabe 1', tasksLayout)).toBe(10);
        });

        it('should return undefined if task not found in layout', () => {
            const tasksLayout: Task[] = [
                { name: 'Aufgabe 1', maxPoints: '10' }
            ];
            
            expect(resolveMaxPoints(undefined, 'Aufgabe 2', tasksLayout)).toBeUndefined();
        });
    });

    describe('normalizeTaskName', () => {
        it('should reduce common spellings of the same task to one key', () => {
            expect(normalizeTaskName('Aufgabe 2b')).toBe('2b');
            expect(normalizeTaskName('aufgabe 2b)')).toBe('2b');
            expect(normalizeTaskName('AUFGABE 2 B')).toBe('2b');
            expect(normalizeTaskName('Teilaufgabe 2b:')).toBe('2b');
        });

        it('should keep dots so that numbered subtasks do not collide', () => {
            expect(normalizeTaskName('Aufgabe 1.1')).toBe('1.1');
            expect(normalizeTaskName('Aufgabe 11')).toBe('11');
            expect(normalizeTaskName('Aufgabe 1.1')).not.toBe(normalizeTaskName('Aufgabe 11'));
        });
    });

    describe('canonicalizeTaskName', () => {
        const layout: Task[] = [
            { name: 'Aufgabe 1a', maxPoints: 4 },
            { name: 'Aufgabe 2b', maxPoints: 6 }
        ];

        it('should return the exact layout name unchanged', () => {
            expect(canonicalizeTaskName('Aufgabe 2b', layout)).toBe('Aufgabe 2b');
        });

        it('should map a drifted spelling back to the layout name', () => {
            expect(canonicalizeTaskName('2b)', layout)).toBe('Aufgabe 2b');
            expect(canonicalizeTaskName('AUFGABE 2 B', layout)).toBe('Aufgabe 2b');
        });

        it('should return undefined instead of guessing when nothing matches', () => {
            expect(canonicalizeTaskName('Aufgabe 7', layout)).toBeUndefined();
            expect(canonicalizeTaskName('', layout)).toBeUndefined();
            expect(canonicalizeTaskName('Aufgabe 1a', [])).toBeUndefined();
        });
    });

    describe('groupCasesByTask', () => {
        const layout: Task[] = [
            { name: 'Aufgabe 1a', maxPoints: 4 },
            { name: 'Aufgabe 2b', maxPoints: 6 },
            { name: 'Aufgabe 3', maxPoints: 5 }
        ];

        it('should group cases under their task in layout order', () => {
            const { groups, unassigned } = groupCasesByTask(
                [makeCase('c1', 'Aufgabe 2b'), makeCase('c2', 'Aufgabe 1a'), makeCase('c3', 'Aufgabe 2b')],
                layout
            );

            expect(groups.map(g => g.taskName)).toEqual(['Aufgabe 1a', 'Aufgabe 2b']);
            expect(groups[0].cases.map(c => c.id)).toEqual(['c2']);
            expect(groups[1].cases.map(c => c.id)).toEqual(['c1', 'c3']);
            expect(unassigned).toHaveLength(0);
        });

        it('should canonicalize drifted task names into the matching group', () => {
            const { groups } = groupCasesByTask([makeCase('c1', '2b)')], layout);

            expect(groups).toHaveLength(1);
            expect(groups[0].taskName).toBe('Aufgabe 2b');
        });

        it('should recover the task from the [Aufgabe: ...] prefix in the notes', () => {
            const { groups, unassigned } = groupCasesByTask(
                [makeCase('c1', undefined, '[Aufgabe: Aufgabe 3] Begründung')],
                layout
            );

            expect(unassigned).toHaveLength(0);
            expect(groups[0].taskName).toBe('Aufgabe 3');
        });

        it('should collect cases without a reliable assignment separately', () => {
            const { groups, unassigned } = groupCasesByTask(
                [makeCase('c1', undefined, 'Keine Zuordnung', 'Nichts passendes')],
                layout
            );

            expect(groups).toHaveLength(0);
            expect(unassigned.map(c => c.id)).toEqual(['c1']);
        });

        it('should treat every case as unassigned when no layout is available', () => {
            const { groups, unassigned } = groupCasesByTask([makeCase('c1', 'Aufgabe 1a')], undefined);

            expect(groups).toHaveLength(0);
            expect(unassigned).toHaveLength(1);
        });
    });
});
