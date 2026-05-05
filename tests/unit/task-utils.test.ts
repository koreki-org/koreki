import { splitTextByTasks, hasOcrWarnings, groupTasksByMain } from '../../src/lib/task-utils';
import { createTask } from '../../src/test/factories';

describe('Task Utils tests', () => {

    describe('groupTasksByMain', () => {
        it('should group sub-tasks into main tasks', () => {
            const tasks = [
                createTask({ name: 'Aufgabe 1a' }),
                createTask({ name: 'Aufgabe 1b' }),
                createTask({ name: 'Aufgabe 2' }),
                createTask({ name: 'A 3.1' }),
                createTask({ name: 'A 3.2' }),
            ];
            const groups = groupTasksByMain(tasks);
            
            expect(Object.keys(groups)).toEqual(['Aufgabe 1', 'Aufgabe 2', 'A 3']);
            expect(groups['Aufgabe 1']).toHaveLength(2);
            expect(groups['Aufgabe 2']).toHaveLength(1);
            expect(groups['A 3']).toHaveLength(2);
        });

        it('should handle numeric-only names', () => {
            const tasks = [
                createTask({ name: '1.1' }),
                createTask({ name: '1.2' }),
                createTask({ name: '2.1' }),
            ];
            const groups = groupTasksByMain(tasks);
            expect(Object.keys(groups)).toEqual(['1', '2']);
        });
    });

    describe('hasOcrWarnings', () => {
        it.each([
            { text: 'Normaler Text', expected: false },
            { text: 'Text mit (?) Warnung', expected: true },
            { text: 'Nur (?)', expected: true },
            { text: '', expected: false },
        ])('should return $expected for "$text"', ({ text, expected }) => {
            expect(hasOcrWarnings(text)).toBe(expected);
        });
    });

    describe('splitTextByTasks', () => {
        it('should correctly split text by task names', () => {
            const text = 'Aufgabe 1\nAntwort 1\nAufgabe 2\nAntwort 2';
            const tasks = [createTask({ name: 'Aufgabe 1' }), createTask({ name: 'Aufgabe 2' })];
            const result = splitTextByTasks(text, tasks);
            
            expect(result).toEqual(['Antwort 1', 'Antwort 2']);
        });

        it('should handle missing sections', () => {
            const text = 'Aufgabe 1\nAntwort 1';
            const tasks = [createTask({ name: 'Aufgabe 1' }), createTask({ name: 'Aufgabe 2' })];
            const result = splitTextByTasks(text, tasks);
            
            expect(result).toEqual(['Antwort 1', '']);
        });

        it('should be case-insensitive', () => {
            const text = 'aufgabe 1\nantwort 1';
            const tasks = [createTask({ name: 'Aufgabe 1' })];
            const result = splitTextByTasks(text, tasks);
            
            expect(result).toEqual(['antwort 1']);
        });

        it('should handle overlapping names (longer first)', () => {
            const text = 'Aufgabe 1a\nAntwort 1a\nAufgabe 1\nAntwort 1';
            const tasks = [createTask({ name: 'Aufgabe 1' }), createTask({ name: 'Aufgabe 1a' })];
            const result = splitTextByTasks(text, tasks);
            
            // Note: splitTextByTasks (fallback 3) returns in the order of the tasks array.
            expect(result).toEqual(['Antwort 1', 'Antwort 1a']);
        });

        it('should handle text before any task name (should ignore it)', () => {
            const text = 'Vorgeplänkel\nAufgabe 1\nAntwort 1';
            const tasks = [createTask({ name: 'Aufgabe 1' })];
            const result = splitTextByTasks(text, tasks);
            
            expect(result).toEqual(['Antwort 1']);
        });
        
        it('should support marker-based splitting', () => {
            const text = '=== TASK: Aufgabe 1 ===\nInhalt 1\n=== TASK: Aufgabe 2 ===\nInhalt 2';
            const tasks = [createTask({ name: 'Aufgabe 1' }), createTask({ name: 'Aufgabe 2' })];
            const result = splitTextByTasks(text, tasks);
            
            expect(result).toEqual(['Inhalt 1', 'Inhalt 2']);
        });
    });
});
