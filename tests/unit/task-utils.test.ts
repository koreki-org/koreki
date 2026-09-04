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

        /**
         * Der Normalfall auf einem Klassenarbeitsbogen: Die Aufgabe heisst
         * "Aufgabe a)", der Schueler schreibt "a)".
         *
         * ANLASS (03.09.2026). Bis dahin wurde nur der VOLLE Name gesucht. Fand er
         * sich nicht, kam fuer jede Aufgabe eine leere Zeichenfolge zurueck — und
         * alle Aufrufer fallen dann auf den GESAMTEN Text zurueck. Jede Aufgabe wurde
         * also auf dem ganzen Blatt bewertet.
         *
         * In der Rechenketten-Engine hiess das: Der Rechenweg einer Teilaufgabe
         * enthielt die Schritte aller anderen. Bei einer Physik-Aufgabe fiel der
         * Sandbox-Beweis in b) ueber einen Rechenfehler aus a) — derselbe Fehler,
         * zweimal bestraft. Der Defekt sah aus wie ein Fehler der Folgefehler-Regel
         * und war in Wahrheit ein zu grosser Textausschnitt.
         */
        it('erkennt die Kurzform, wenn der Schueler den Namen abkuerzt', () => {
            const text = 'a) 3x = 18\n   x = 9\nb) Probe: 3 * 9 + 7 = 34';
            const tasks = [createTask({ name: 'Aufgabe a)' }), createTask({ name: 'Aufgabe b)' })];

            expect(splitTextByTasks(text, tasks)).toEqual([
                '3x = 18\n   x = 9',
                'Probe: 3 * 9 + 7 = 34'
            ]);
        });

        /**
         * Die Gegenrichtung, und der Grund fuer die Bindung an den Zeilenanfang:
         * "b)" steht auch mitten im Satz. Ohne die Bindung risse ein Rueckverweis
         * den Abschnitt der laufenden Aufgabe auseinander.
         */
        it('zerreisst keinen Abschnitt an einer Kurzform mitten im Satz', () => {
            const text = 'a) wie in b) gezeigt ist x = 9\nb) Probe';
            const tasks = [createTask({ name: 'Aufgabe a)' }), createTask({ name: 'Aufgabe b)' })];

            expect(splitTextByTasks(text, tasks)).toEqual([
                'wie in b) gezeigt ist x = 9',
                'Probe'
            ]);
        });

        /**
         * Die Kurzform darf nicht raten. Waere "1" die Kurzform von "Aufgabe 1" und
         * zugleich der Anfang von "11", bekaeme die eine Aufgabe den Abschnitt der
         * anderen. Eine falsch zugeordnete Antwort ist schlimmer als eine fehlende.
         */
        it('haelt kurze und lange Nummern auseinander', () => {
            const text = '1 erste\n11 elfte';
            const tasks = [createTask({ name: 'Aufgabe 1' }), createTask({ name: 'Aufgabe 11' })];

            expect(splitTextByTasks(text, tasks)).toEqual(['erste', 'elfte']);
        });

        /**
         * Eine Kurzform, die auf MEHRERE Aufgaben passt, ordnet nicht zu, sondern
         * raet — und faellt deshalb ersatzlos weg. Hier bleibt nur der volle Name.
         */
        it('verwirft eine mehrdeutige Kurzform, statt zu raten', () => {
            const text = 'Aufgabe 1\nerste\n1\nzweite';
            const tasks = [createTask({ name: 'Aufgabe 1' }), createTask({ name: 'Teilaufgabe 1' })];

            const result = splitTextByTasks(text, tasks);
            expect(result[0]).toContain('erste');
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
