import React, { ChangeEvent } from 'react';
import { Task, AppSettings } from '../types';

// Sub-Components
import { ModelSolutionCard } from './upload/ModelSolutionCard';
import { StudentWorkCard } from './upload/StudentWorkCard';

interface UploadGridProps {
    modelSolution: string;
    batchFilesCount: number;
    tasksLayout: Task[];
    extractingLayout: boolean;
    onModelUpload: (e: ChangeEvent<HTMLInputElement>) => void;
    onStudentUpload: (e: ChangeEvent<HTMLInputElement>) => void;
    onReExtractLayout: () => void;
    onModelSolutionChange?: (newVal: string) => void;
    onTasksChange?: (newTasks: Task[]) => void;
    isPureMode?: boolean;
    isLocked?: boolean;
    settings?: AppSettings;
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    onGenerateGraph?: (taskIndex: number, taskText: string) => Promise<any>;
    onGenerateCalcTrace?: (taskIndex: number, taskText: string, userNotes?: string) => Promise<any>;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

const UploadGrid: React.FC<UploadGridProps> = ({
    modelSolution,
    batchFilesCount,
    tasksLayout,
    extractingLayout,
    onModelUpload,
    onStudentUpload,
    onReExtractLayout,
    onModelSolutionChange,
    onTasksChange,
    isPureMode = false,
    isLocked = false,
    settings,
    appMode,
    onGenerateGraph,
    onGenerateCalcTrace,
    collapsed = false,
    onToggleCollapse
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-8">
            {/* Musterlösung Card */}
            <ModelSolutionCard
                modelSolution={modelSolution}
                tasksLayout={tasksLayout}
                extractingLayout={extractingLayout}
                onModelUpload={onModelUpload}
                onModelSolutionChange={onModelSolutionChange}
                onTasksChange={onTasksChange}
                isLocked={isLocked}
                settings={settings}
                appMode={appMode}
                onGenerateGraph={onGenerateGraph}
                onGenerateCalcTrace={onGenerateCalcTrace}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
            />

            {/* Schülerarbeiten Card */}
            <StudentWorkCard
                batchFilesCount={batchFilesCount}
                tasksLayout={tasksLayout}
                extractingLayout={extractingLayout}
                onStudentUpload={onStudentUpload}
                onReExtractLayout={onReExtractLayout}
                isLocked={isLocked}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
            />
        </div>
    );
};

export default UploadGrid;
