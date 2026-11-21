import React from 'react';
import { Task, AppSettings, TasksLayoutSetter } from '../types';

// Sub-Components
import { ModelSolutionCard } from './upload/ModelSolutionCard';
import { StudentWorkCard } from './upload/StudentWorkCard';
import { useAnsicht } from '../hooks/useFokusArbeit';
import { EinrichtungKopf } from './upload/EinrichtungKopf';

interface UploadGridProps {
    modelSolution: string;
    modelSolutionContext?: string;
    batchFilesCount: number;
    tasksLayout: Task[];
    extractingLayout: boolean;
    /** Die Dateien selbst — ob geklickt oder abgelegt, geht das Gitter nichts an. */
    onModelUpload: (dateien: File[]) => void;
    onStudentUpload: (dateien: File[]) => void;
    onReExtractLayout: () => void;
    onModelSolutionChange?: (newVal: string) => void;
    onModelSolutionContextChange?: (newVal: string) => void;
    onTasksChange?: TasksLayoutSetter;
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
    modelSolutionContext,
    batchFilesCount,
    tasksLayout,
    extractingLayout,
    onModelUpload,
    onStudentUpload,
    onReExtractLayout,
    onModelSolutionChange,
    onModelSolutionContextChange,
    onTasksChange,
    isPureMode = false,
    isLocked = false,
    settings,
    appMode,
    onGenerateGraph,
    onGenerateCalcTrace
}) => {
    // Die Karten stehen nur in der Ansicht "Einrichtung" (s. `useAnsicht`) — sonst
    // versteckt, nicht abgebaut: Sie behalten ihren Zustand. Seit die Einrichtung
    // eine eigene Ansicht ist, klappen sie nicht mehr zu (17.11.2026); `collapsed`
    // gehoerte zu der Zeit, als sie ueber dem Stapel standen.
    const ansicht = useAnsicht();
    const collapsed = false;
    const onToggleCollapse = undefined;
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 items-stretch gap-8 mb-8 ${ansicht !== 'einrichtung' ? 'hidden' : ''}`}>
            <EinrichtungKopf />
            {/* Musterlösung Card */}
            <ModelSolutionCard
                modelSolution={modelSolution}
                modelSolutionContext={modelSolutionContext}
                tasksLayout={tasksLayout}
                extractingLayout={extractingLayout}
                onModelUpload={onModelUpload}
                onModelSolutionChange={onModelSolutionChange}
                onModelSolutionContextChange={onModelSolutionContextChange}
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
