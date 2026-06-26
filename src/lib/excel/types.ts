import { Task } from '../logic';

export interface Analysis {
    overallFeedback?: string;
    overallMatchPercentage?: number;
    tasks?: Task[];
    confidence?: number;
    expertProfile?: string;
}

export interface StudentResult {
    studentFirstName?: string;
    studentLastName?: string;
    studentName: string;
    analysis: Analysis;
    grade?: string;
}
