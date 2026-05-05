import React, { ChangeEvent } from 'react';
import { Task } from '../types';

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
    isLocked = false
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
            />

            {/* Schülerarbeiten Card */}
            <StudentWorkCard 
                batchFilesCount={batchFilesCount}
                tasksLayout={tasksLayout}
                extractingLayout={extractingLayout}
                onStudentUpload={onStudentUpload}
                onReExtractLayout={onReExtractLayout}
                isLocked={isLocked}
            />
        </div>
    );
};

export default UploadGrid;
