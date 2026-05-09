import { parseCorrectionResult } from '../../src/lib/ai/ai-orchestrator';
import { Task } from '../../src/types';

describe('AI Orchestrator (Layer 1 Unit)', () => {
    describe('parseCorrectionResult', () => {
        const mockTasksLayout: Task[] = [
            { name: 'Aufgabe 1', maxPoints: 10, content: '' },
            { name: 'Aufgabe 2', maxPoints: 5, content: '' }
        ];

        it('should correctly map exact task matches and preserve the content field', () => {
            const rawAnalysis = {
                tasks: [
                    {
                        name: 'Aufgabe 1',
                        pointsObtained: 8,
                        confidence: 95,
                        feedback: 'Gut gemacht',
                        content: 'Das ist die Schülerantwort für A1.'
                    },
                    {
                        name: 'Aufgabe 2',
                        pointsObtained: 5,
                        confidence: 90,
                        feedback: 'Perfekt',
                        content: 'Schülerantwort für A2.'
                    }
                ]
            };

            const result = parseCorrectionResult(rawAnalysis, mockTasksLayout);

            expect(result.tasks).toHaveLength(2);
            expect(result.tasks[0].name).toBe('Aufgabe 1');
            expect(result.tasks[0].pointsObtained).toBe(8);
            expect(result.tasks[0].content).toBe('Das ist die Schülerantwort für A1.');
            expect(result.overallMatchPercentage).toBeCloseTo((13 / 15) * 100);
        });

        it('should map near-miss tasks and preserve content with a soft error warning', () => {
            const rawAnalysis = {
                tasks: [
                    {
                        name: 'aufgabe 1 ', // Note the case and space mismatch
                        pointsObtained: 7,
                        confidence: 85,
                        feedback: 'Fast richtig',
                        content: 'Antwort mit Tippfehler im Namen'
                    }
                ]
            };

            const result = parseCorrectionResult(rawAnalysis, [mockTasksLayout[0]]);

            expect(result.tasks).toHaveLength(1);
            expect(result.tasks[0].name).toBe('Aufgabe 1'); // Reverts to layout name
            expect(result.tasks[0].pointsObtained).toBe(7);
            expect(result.tasks[0].content).toBe('Antwort mit Tippfehler im Namen');
            expect(result.tasks[0].feedback).toContain('[KI-FEHLER?]');
            expect(result.tasks[0].feedback).toContain('Fast richtig');
        });

        it('should handle hard missing tasks by returning zero points and empty content', () => {
            const rawAnalysis = {
                tasks: []
            };

            const result = parseCorrectionResult(rawAnalysis, [mockTasksLayout[0]]);

            expect(result.tasks).toHaveLength(1);
            expect(result.tasks[0].pointsObtained).toBe(0);
            expect(result.tasks[0].content).toBe('');
            expect(result.tasks[0].feedback).toBe('Vom System nicht erkannt oder von der KI übersprungen.');
        });
    });
});
