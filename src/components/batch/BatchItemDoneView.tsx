import React from 'react';
import { BatchFile, Task, AppSettings } from '../../types';
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
    handleReviewPointAndFeedbackChange?: (idx: number, name: string, pts: number, fb: string) => void;
    showScan: boolean;
    onToggleScan: (idx: number) => void;
    mobileViewMode: 'text' | 'image';
    previewUrl: string | null;
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void;
    settings?: AppSettings;
}

/**
 * BatchItemDoneView
 * 👁️🏮🛡️
 * Orchestrates the post-correction KI-Review workflow.
 * Reduced to a Thin Container for industrial scalability.
 */
export const BatchItemDoneView: React.FC<BatchItemDoneViewProps> = (props) => {
    const { mobileViewMode } = props;
    const [focusedPanel, setFocusedPanel] = React.useState<'left' | 'right' | null>(null);

    return (
        <div className="animate-in fade-in duration-500">
            {/* 1. Industrial Header (Navigation & Review Indicators) */}
            <BatchDoneHeader {...props} />

            {/* 2. Main Analysis Grid */}
            <div className={cn(
                "grid grid-cols-1 gap-6 sm:gap-8 h-fit mt-4 transition-all duration-300",
                focusedPanel ? "md:grid-cols-1" : "md:grid-cols-2"
            )}>
                
                {/* COLUMN LEFT: Student Solution / Scan Preview */}
                <div className={cn(
                    focusedPanel === 'right' ? "hidden" : "block",
                    focusedPanel === 'left' && "w-full"
                )}>
                    <BatchSolutionPanel 
                        {...props} 
                        focusedPanel={focusedPanel}
                        onToggleFocus={setFocusedPanel}
                    />
                </div>

                {/* COLUMN RIGHT: KI Analysis & Grading Cards */}
                <div className={cn(
                    focusedPanel === 'left' ? "hidden" : "block",
                    focusedPanel === 'right' && "w-full"
                )}>
                    <BatchTaskAnalysisCard 
                        {...props} 
                        focusedPanel={focusedPanel}
                        onToggleFocus={setFocusedPanel}
                    />
                </div>
                
            </div>
        </div>
    );
};
