import { Task } from '../logic';

export interface Analysis {
    overallFeedback?: string;
    overallMatchPercentage?: number;
    tasks?: Task[];
    confidence?: number;
    expertProfile?: string;
}

export interface StudentResult {
    studentName: string;
    analysis: Analysis;
    grade?: string;
}
