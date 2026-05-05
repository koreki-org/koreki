import React from 'react';
import { BatchFile, Task } from '../../types';
import { cn } from '@/lib/utils';
import { BatchDoneHeader } from './parts/BatchDoneHeader';
import { BatchSolutionPanel } from './parts/BatchSolutionPanel';
import { BatchTaskAnalysisCard } from './parts/BatchTaskAnalysisCard';

interface BatchItemDoneViewProps {
    item: BatchFile;
    idx: number;
    tasksLayout: any[];
    studentSections: string[];
    groupNames: string[];
    activeGroupName: string;
    onSetActiveGroupName: (name: string) => void;
    groupedTasks: Record<string, any[]>;
    getConfidenceColor: (conf?: number) => string;
    handleReviewPointChange: (idx: number, name: string, pts: number) => void;
    handleReviewFeedbackChange: (idx: number, name: string, fb: string) => void;
    showScan: boolean;
    onToggleScan: (idx: number) => void;
    mobileViewMode: 'text' | 'image';
    previewUrl: string | null;
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void;
}

/**
 * BatchItemDoneView
 * 👁️🏮🛡️
 * Orchestrates the post-correction KI-Review workflow.
 * Reduced to a Thin Container for industrial scalability.
 */
export const BatchItemDoneView: React.FC<BatchItemDoneViewProps> = (props) => {
    const { mobileViewMode } = props;

    return (
        <div className="animate-in fade-in duration-500">
            {/* 1. Industrial Header (Navigation & Review Indicators) */}
            <BatchDoneHeader {...props} />

            {/* 2. Main Analysis Grid */}
            <div className={cn("grid grid-cols-1 gap-6 sm:gap-8 h-fit md:grid-cols-2 mt-4")}>
                
                {/* COLUMN LEFT: Student Solution / Scan Preview */}
                <BatchSolutionPanel {...props} />

                {/* COLUMN RIGHT: KI Analysis & Grading Cards */}
                <BatchTaskAnalysisCard {...props} />
                
            </div>
        </div>
    );
};
