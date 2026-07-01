import { resolveTaskName, resolveMaxPoints } from '../../src/lib/grading-memory-utils';
import { Task } from '../../src/types';

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
});
