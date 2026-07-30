import { calculateAnalytics } from '../../src/lib/analytics-logic';
import { BatchFile } from '../../src/types';

describe('Analytics Logic (calculateAnalytics) - Unit Verification', () => {
    it('should return null if no finished files exist in batch', () => {
        const batchFiles: BatchFile[] = [
            { id: '1', fileName: 'test1.pdf', status: 'pending' } as any,
            { id: '2', fileName: 'test2.pdf', status: 'processing' } as any
        ];

        expect(calculateAnalytics(batchFiles)).toBeNull();
    });

    it('should calculate accurate analytics statistics for finished files', () => {
        const finishedFiles: BatchFile[] = [
            {
                id: '1',
                fileName: 'student1.pdf',
                status: 'done',
                grade: '2,0',
                inferenceDuration: 5000,
                result: {
                    overallMatchPercentage: 80,
                    confidence: 0.9,
                    tasks: [
                        { name: 'Aufgabe 1', pointsObtained: 8, maxPoints: 10 },
                        { name: 'Aufgabe 2', pointsObtained: 10, maxPoints: 10 }
                    ]
                }
            } as any,
            {
                id: '2',
                fileName: 'student2.pdf',
                status: 'done',
                grade: '1,0',
                inferenceDuration: 3000,
                result: {
                    overallMatchPercentage: 100,
                    confidence: 95,
                    tasks: [
                        { name: 'Aufgabe 1', pointsObtained: 10, maxPoints: 10 },
                        { name: 'Aufgabe 2', pointsObtained: 10, maxPoints: 10 }
                    ]
                }
            } as any
        ];

        const stats = calculateAnalytics(finishedFiles);

        expect(stats).not.toBeNull();
        expect(stats?.totalCount).toBe(2);
        expect(stats?.avgScore).toBe(90); // (80 + 100) / 2
        expect(stats?.avgGrade).toBe(1.5); // (2.0 + 1.0) / 2
        expect(stats?.avgConfidence).toBe(92.5); // (90 + 95) / 2
        expect(stats?.timeSavedMinutes).toBe(30); // 2 files * 15 mins
        expect(stats?.totalInferenceDuration).toBe(8000);
        expect(stats?.avgInferenceDuration).toBe(4000);

        expect(stats?.analyzedTasks.length).toBe(2);
        expect(stats?.criticalTasks.length).toBe(2);
    });
});
