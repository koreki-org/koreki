import { parseCorrectionResult } from '../../src/lib/ai/ai-orchestrator';
import { Task, AIAnalysisResult } from '../../src/types';

describe('parseCorrectionResult Isomorphic Contract Test', () => {
    const sampleTaskName = 'Aufgabe 1: Mathe-Beweis';

    const serverTasksLayout: Task[] = [
        {
            name: sampleTaskName,
            maxPoints: 10,
            content: 'Schüler-Lösung für Aufgabe 1',
            taskType: 'calc-trace',
            // Inhalt egal — entscheidend ist NUR, dass eine Rechenkette anhaengt.
            calcTrace: {
                taskId: 'a1',
                steps: [{ id: 'x', label: 'x', type: 'calc' as const, value: 3, formula: '5 - 2' }]
            },
            targetGoal: {
                targetValue: 3,
                maxPoints: 10,
                criteria: [
                    {
                        id: 'crit_1',
                        label: 'Zielwert x=3 erreicht',
                        punktwert: 10,
                        source: 'proofB',
                        targetIndex: 0
                    }
                ]
            },
            // Server-only intermediate calculation state
            calcTraceResult: {
                isGoalReached: true,
                sandboxErrors: [],
                reachedTargets: [3],
                missedTargets: [],
                ast: [{ id: 'step_1', formula: 'x=3', result: 3 }],
                perTargetResult: [
                    {
                        targetIndex: 0,
                        reached: true,
                        hasCalculationError: false,
                        associatedStepIds: ['step_1']
                    }
                ]
            }
        }
    ];

    const rawAIResponse: AIAnalysisResult = {
        tasks: [
            {
                name: sampleTaskName,
                pointsObtained: 10,
                confidence: 95,
                feedback: 'Sehr gut nachvollzogen.',
                correctionNotes: 'Schritt 1 korrekt, Schritt 2 korrekt.'
            }
        ]
    };

    it('should maintain strict output parity between server-side execution and client-side re-parse', () => {
        // 1. SERVER-SIDE PASS: Execute with full server layout (including calcTraceResult)
        const serverResult = parseCorrectionResult(rawAIResponse, serverTasksLayout);

        // Verify server-side result state
        expect(serverResult.tasks).toHaveLength(1);
        expect(serverResult.tasks[0].pointsObtained).toBe(10);
        expect(serverResult.tasks[0].sandboxBypassed).toBeUndefined();
        expect(serverResult.tasks[0].feedback).toContain('[📐 CalcTrace Engine - Mathematischer Abgleich]');

        // 2. NETWORK BOUNDARY SIMULATION:
        // - JSON serialize/deserialize the AI analysis response (as returned over API)
        const clientReceivedAnalysis: AIAnalysisResult = JSON.parse(JSON.stringify(serverResult));
        
        // - Client tasksLayout lacks server-only calcTraceResult
        const clientTasksLayout: Task[] = JSON.parse(JSON.stringify(serverTasksLayout)).map((t: any) => {
            const copy = { ...t };
            delete copy.calcTraceResult; // Simulated state on client
            return copy;
        });

        // 3. CLIENT-SIDE PASS: Re-parse on client with client layout
        const clientResult = parseCorrectionResult(clientReceivedAnalysis, clientTasksLayout);

        // 4. PARITY ASSERTIONS:
        // - sandboxBypassed must NOT be true (no false-positive bypass warning)
        expect(clientResult.tasks[0].sandboxBypassed).toBeUndefined();
        
        // - Feedback should NOT contain the false-positive warning header
        expect(clientResult.tasks[0].feedback).not.toContain('⚠️ HINWEIS: Diese Bewertung erfolgte ohne mathematische Sandbox-Prüfung');
        
        // - Points, confidence, and feedback content must match server output strictly
        expect(clientResult.tasks[0].pointsObtained).toBe(serverResult.tasks[0].pointsObtained);
        expect(clientResult.tasks[0].confidence).toBe(serverResult.tasks[0].confidence);
        expect(clientResult.tasks[0].feedback).toBe(serverResult.tasks[0].feedback);
        expect(clientResult.overallMatchPercentage).toBe(serverResult.overallMatchPercentage);
    });

    it('should correctly flag sandboxBypassed when server calcTrace failed and feedback lacks proof headers', () => {
        // Layout has calcTrace requirement but NO calcTraceResult and NO pre-formatted proof feedback
        const clientTasksLayoutNoResult: Task[] = [
            {
                name: 'Aufgabe 2: Ungeprüfte Aufgabe',
                maxPoints: 5,
                content: 'Test text',
                taskType: 'calc-trace',
                calcTrace: { taskId: 'a1', steps: [] }
                // calcTraceResult is missing and feedback was NOT pre-formatted by server
            }
        ];

        const unvalidatedAIResponse: AIAnalysisResult = {
            tasks: [
                {
                    name: 'Aufgabe 2: Ungeprüfte Aufgabe',
                    pointsObtained: 5,
                    confidence: 80,
                    feedback: 'Kategorie nicht berechnet.',
                    correctionNotes: ''
                }
            ]
        };

        const result = parseCorrectionResult(unvalidatedAIResponse, clientTasksLayoutNoResult);

        // Here sandbox WAS bypassed, so warning SHOULD be present
        expect(result.tasks[0].sandboxBypassed).toBe(true);
        expect(result.tasks[0].feedback).toContain('⚠️ HINWEIS: Diese Bewertung erfolgte ohne mathematische Sandbox-Prüfung');
    });
});
