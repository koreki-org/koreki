import { BatchFile } from '../types';

export interface AnalyticsStats {
    distribution: Record<string, number>;
    avgScore: number;
    avgGrade: number | null;
    avgConfidence: number | null;
    analyzedTasks: {
        name: string;
        percentage: number;
        avgPoints: number;
        maxPoints: number;
    }[];
    criticalTasks: {
        name: string;
        percentage: number;
        avgPoints: number;
        maxPoints: number;
    }[];
    timeSavedMinutes: number;
    totalCount: number;
    totalInferenceDuration: number;
    avgInferenceDuration: number;
}

/**
 * PURE FUNCTION for analytics calculation.
 * Follows Koreki Clean Architecture: Logic in Lib.
 */
export function calculateAnalytics(batchFiles: BatchFile[]): AnalyticsStats | null {
    const finishedFiles = batchFiles.filter(f => f.status === 'done' && f.result);
    if (finishedFiles.length === 0) return null;

    const distribution: Record<string, number> = {};
    let totalScore = 0;
    let totalConfidence = 0;
    let countWithConfidence = 0;
    let totalGradeNumeric = 0;
    let countWithGrade = 0;

    finishedFiles.forEach(f => {
        // 1. Grade handling
        const gradeStr = f.grade || (f.result?.overallMatchPercentage !== undefined ? 
            (6 - 5 * (f.result.overallMatchPercentage / 100)).toFixed(1).replace('.', ',') : '-');
        
        distribution[gradeStr] = (distribution[gradeStr] || 0) + 1;
        
        const gradeNumeric = parseFloat(gradeStr.replace(',', '.'));
        if (!isNaN(gradeNumeric)) {
            totalGradeNumeric += gradeNumeric;
            countWithGrade++;
        }

        // 2. Score & Confidence
        totalScore += f.result?.overallMatchPercentage || 0;
        
        if (f.result?.confidence !== undefined) {
            let conf = f.result.confidence;
            // Normalize: if 0.95 -> 95, if 95 -> 95
            if (conf <= 1 && conf > 0) conf *= 100;
            totalConfidence += conf;
            countWithConfidence++;
        }
    });

    const avgScore = totalScore / finishedFiles.length;
    const avgConfidence = countWithConfidence > 0 ? (totalConfidence / countWithConfidence) : null;
    const avgGrade = countWithGrade > 0 ? (totalGradeNumeric / countWithGrade) : null;

    // 3. Task Analysis
    const taskStats: Record<string, { totalPoints: number, maxPoints: number, count: number }> = {};
    finishedFiles.forEach(f => {
        f.result?.tasks?.forEach(t => {
            if (!t.name) return;
            if (!taskStats[t.name]) {
                taskStats[t.name] = { totalPoints: 0, maxPoints: 0, count: 0 };
            }
            taskStats[t.name].totalPoints += Number(t.pointsObtained || 0);
            taskStats[t.name].maxPoints += Number(t.maxPoints || 0);
            taskStats[t.name].count += 1;
        });
    });

    const analyzedTasks = Object.entries(taskStats).map(([name, s]) => ({
        name,
        percentage: s.maxPoints > 0 ? (s.totalPoints / s.maxPoints) * 100 : 0,
        avgPoints: s.totalPoints / s.count,
        maxPoints: s.maxPoints / s.count
    })).sort((a, b) => b.percentage - a.percentage);

    const criticalTasks = [...analyzedTasks].sort((a, b) => a.percentage - b.percentage).slice(0, 3);

    return {
        distribution,
        avgScore,
        avgGrade,
        avgConfidence,
        analyzedTasks,
        criticalTasks,
        timeSavedMinutes: finishedFiles.length * 15, // Heuristic: 15 mins per student
        totalCount: finishedFiles.length,
        totalInferenceDuration: finishedFiles.reduce((acc, f) => acc + (f.inferenceDuration || 0), 0),
        avgInferenceDuration: finishedFiles.reduce((acc, f) => acc + (f.inferenceDuration || 0), 0) / finishedFiles.length
    };
}
