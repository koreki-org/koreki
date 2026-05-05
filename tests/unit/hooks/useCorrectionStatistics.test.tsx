import { renderHook } from '@testing-library/react';
import { useCorrectionStatistics } from '../../../src/hooks/useCorrectionStatistics';
import { BatchFile } from '../../../src/types';

describe('useCorrectionStatistics Hook', () => {

    const mockFiles: BatchFile[] = [
        {
            name: 'Student 1',
            status: 'done',
            selected: true,
            ocrDone: true,
            grade: '2,0',
            result: {
                overallMatchPercentage: 80,
                confidence: 0.95, // Test normalization (0.95 -> 95)
                tasks: [
                    { name: 'Aufgabe 1', pointsObtained: 8, maxPoints: 10, feedback: 'Gut' },
                    { name: 'Aufgabe 2', pointsObtained: 5, maxPoints: 10, feedback: 'Mittel' }
                ]
            },
            error: undefined
        },
        {
            name: 'Student 2',
            status: 'done',
            selected: true,
            ocrDone: true,
            result: {
                overallMatchPercentage: 40,
                confidence: 85, // Test already normalized (85 -> 85)
                tasks: [
                    { name: 'Aufgabe 1', pointsObtained: 2, maxPoints: 10, feedback: 'Schlecht' },
                    { name: 'Aufgabe 2', pointsObtained: 3, maxPoints: 10, feedback: 'Schlecht' }
                ]
            },
            error: undefined
        },
        {
            name: 'Student 3 (Pending)',
            status: 'pending',
            selected: true,
            ocrDone: false,
            result: null,
            error: undefined
        }
    ];

    it('should return null if no files are finished', () => {
        const { result } = renderHook(() => useCorrectionStatistics([]));
        expect(result.current).toBeNull();

        const pendingOnly: BatchFile[] = [
            { name: 'S1', status: 'pending', selected: true, ocrDone: false, result: null, error: undefined }
        ];
        const { result: res2 } = renderHook(() => useCorrectionStatistics(pendingOnly));
        expect(res2.current).toBeNull();
    });

    it('should calculate correct assessment distribution', () => {
        const { result } = renderHook(() => useCorrectionStatistics(mockFiles));
        
        // Student 1 has explicit grade '2,0'
        // Student 2 has match 40% -> (6 - 5 * 0.4) = 4,0
        expect(result.current?.distribution).toEqual({
            '2,0': 1,
            '4,0': 1
        });
    });

    it('should calculate correct average score and confidence', () => {
        const { result } = renderHook(() => useCorrectionStatistics(mockFiles));
        
        // Avg Score: (80 + 40) / 2 = 60
        expect(result.current?.avgScore).toBe(60);
        
        // Avg Confidence: (95 + 85) / 2 = 90
        expect(result.current?.avgConfidence).toBe(90);
    });

    it('should correctly analyze tasks across multiple students', () => {
        const { result } = renderHook(() => useCorrectionStatistics(mockFiles));
        
        // Aufgabe 1: (8 + 2) / (10 + 10) = 10/20 = 50%
        // Aufgabe 2: (5 + 3) / (10 + 10) = 8/20 = 40%
        
        const task1 = result.current?.analyzedTasks.find(t => t.name === 'Aufgabe 1');
        const task2 = result.current?.analyzedTasks.find(t => t.name === 'Aufgabe 2');
        
        expect(task1?.percentage).toBe(50);
        expect(task1?.avgPoints).toBe(5); // (8 + 2) / 2
        
        expect(task2?.percentage).toBe(40);
        expect(task2?.avgPoints).toBe(4); // (5 + 3) / 2
    });

    it('should identify critical tasks (lowest percentage)', () => {
        const { result } = renderHook(() => useCorrectionStatistics(mockFiles));
        
        // Aufgabe 2 (40%) is more critical than Aufgabe 1 (50%)
        expect(result.current?.criticalTasks[0].name).toBe('Aufgabe 2');
    });

    it('should estimate time saved based on heuristic', () => {
        const { result } = renderHook(() => useCorrectionStatistics(mockFiles));
        
        // 2 finished files * 15 mins = 30
        expect(result.current?.timeSavedMinutes).toBe(30);
        expect(result.current?.totalCount).toBe(2);
    });

    it('should handle edge cases like missing task names or points', () => {
        const brokenFiles: BatchFile[] = [{
            name: 'Broken',
            status: 'done',
            selected: true,
            ocrDone: true,
            result: {
                overallMatchPercentage: 50,
                tasks: [
                    { name: '', pointsObtained: 5, maxPoints: 10 }, // Empty name ignored
                    { name: 'T1', pointsObtained: undefined as any, maxPoints: 10 } // Undefined points -> 0
                ]
            },
            error: undefined
        }];
        
        const { result } = renderHook(() => useCorrectionStatistics(brokenFiles));
        expect(result.current?.analyzedTasks.length).toBe(1);
        expect(result.current?.analyzedTasks[0].percentage).toBe(0); // 0 / 10
    });

    it('should calculate correct inference duration statistics', () => {
        const durationFiles: BatchFile[] = [
            {
                name: 'S1',
                status: 'done',
                inferenceDuration: 5000, // 5s
                result: { overallMatchPercentage: 80, tasks: [] },
                error: null
            },
            {
                name: 'S2',
                status: 'done',
                inferenceDuration: 3000, // 3s
                result: { overallMatchPercentage: 40, tasks: [] },
                error: null
            }
        ];
        
        const { result } = renderHook(() => useCorrectionStatistics(durationFiles));
        
        expect(result.current?.totalInferenceDuration).toBe(8000);
        expect(result.current?.avgInferenceDuration).toBe(4000);
    });
});
