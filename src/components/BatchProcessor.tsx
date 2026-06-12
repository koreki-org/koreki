import React from 'react';
import { Info } from 'lucide-react';
import { BatchFile, Task, AppSettings } from '../types';
import { Card, CardContent } from './ui/Card';
import ConfirmationModal from './ConfirmationModal';
import { ExportToolbar } from './batch/ExportToolbar';
import { BatchHeader } from './batch/BatchHeader';
import { BatchFileListItem } from './batch/BatchFileListItem';
import { AnalyticsModal } from './batch/AnalyticsModal';
import { DigitalSlipsModal } from './batch/DigitalSlipsModal';
import { useBatchStatus } from '../hooks/useBatchStatus';

/**
 * Industrial Batch Processor (Stage 11)
 * 📊🛡️🏛️
 * Refactored into a thin UI orchestrator.
 * All metrics, credit logic, and privacy logs are delegated to useBatchStatus.
 */

interface BatchProcessorProps {
    batchFiles: BatchFile[];
    loading: boolean;
    currentProcessingIndex: number | null;
    onProcess: () => void;
    onExtractOCR: () => void;
    onExportTeacher: () => void;
    onExportStudents: () => void;
    onExportIndividual: () => void;
    onExportPDFs: () => void;
    onToggleSelect: (idx: number) => void;
    onToggleType: (idx: number) => void;
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void;
    onSplit: (idx: number) => void;
    onRedact: (index: number) => void;
    onRemoveFile: (index: number) => void;
    onExportKoreki: () => void;
    onResetResults?: () => void;
    onRelinkFiles?: (files: File[]) => void;
    credits: number;
    isPureMode?: boolean;
    tasksLayout?: Task[];
    avvAccepted: boolean;
    settings?: AppSettings;
    onUpdateSettings?: (val: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
    onProcessSingleFile?: (idx: number) => void;
    onProcessSingleOCR?: (idx: number) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({
    batchFiles,
    loading,
    currentProcessingIndex,
    onProcess,
    onExtractOCR,
    onExportTeacher,
    onExportStudents,
    onExportIndividual,
    onExportPDFs,
    onExportKoreki,
    onResetResults,
    onToggleSelect,
    onToggleType,
    onUpdateText,
    onSplit,
    onRedact,
    onRemoveFile,
    credits,
    isPureMode,
    tasksLayout = [],
    avvAccepted,
    settings,
    onUpdateSettings,
    onProcessSingleFile,
    onProcessSingleOCR
}) => {
    // --- STAGE 11: INDUSTRIAL BATCH STATUS ENGINE ---
    const { state, metrics, logic, handlers } = useBatchStatus(
        batchFiles,
        tasksLayout,
        onExtractOCR,
        onProcess,
        onUpdateText,
        settings,
        onResetResults
    );

    const { expandedIdx, setExpandedIdx, showScan, setShowScan, showConfirm, setShowConfirm, mobileViewMode, setMobileViewMode, activeGroupName, setActiveGroupName, ocrStrategy, setOcrStrategy, showAnalytics, setShowAnalytics, showDigitalSlips, setShowDigitalSlips } = state;
    const { totalPendingCredits, totalPossibleCredits, ocrCreditsRequired, pendingCount, totalCount, hasFinishedFiles, unredactedScansCount } = metrics;
    const { groupedTasks, groupNames, CONFIRM_TEXT } = logic;
    const { handleConfirmAction, handleReviewPointChange, handleReviewFeedbackChange, getPreviewUrl } = handlers;

    const getConfidenceColor = (conf: number = 0) => {
        if (conf >= 90) return "bg-emerald-500 text-white";
        if (conf >= 50) return "bg-orange-500 text-white";
        return "bg-red-500 text-white";
    };

    return (
        <div id="batch-processor-anchor" className="animate-in fade-in slide-in-from-bottom-6 duration-700 scroll-mt-10">
            {/* Info Badge */}
            <div className="mb-6 flex items-center gap-3 bg-primary/5 border border-primary/10 text-primary p-4 rounded-xl shadow-sm backdrop-blur-xs">
                <Info size={18} className="text-primary" />
                <span className="text-sm font-medium">Namen wurden für die KI pseudonymisiert. Der Export erfolgt automatisch mit Klarnamen.</span>
            </div>

            <Card className="transition-all duration-500 overflow-visible relative border border-white bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-900/5 rounded-[2rem]">
                {/* Privacy Confirmation System */}
                <ConfirmationModal
                    isOpen={showConfirm !== null}
                    title="Datenschutz-Bestätigung"
                    message={
                        <>
                            {unredactedScansCount > 0 && (
                                <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm flex items-start gap-3">
                                    <Info size={18} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Hinweis zur Anonymisierung</p>
                                        <p>Du hast {unredactedScansCount} Scan(s) hochgeladen, aber noch nicht manuell geschwärzt. Bitte stelle sicher, dass keine personenbezogenen Daten (z.B. Namen) sichtbar sind.</p>
                                    </div>
                                </div>
                            )}
                            <p className="leading-relaxed text-slate-700">{CONFIRM_TEXT}</p>
                        </>
                    }
                    onConfirm={handleConfirmAction}
                    onCancel={() => setShowConfirm(null)}
                />

                {/* Batch Controller Header */}
                <BatchHeader 
                    credits={credits}
                    ocrCreditsRequired={ocrCreditsRequired}
                    totalPendingCredits={totalPendingCredits}
                    pendingCount={pendingCount}
                    loading={loading}
                    onShowConfirm={setShowConfirm}
                    avvAccepted={avvAccepted}
                    ocrStrategy={ocrStrategy}
                    setOcrStrategy={setOcrStrategy}
                    settings={settings}
                    onUpdateSettings={onUpdateSettings}
                    isStrategyLocked={false}
                    hasScans={batchFiles.some(f => f.documentType === 'scanned')}
                    hasFinishedFiles={hasFinishedFiles}
                    totalPossibleCredits={totalPossibleCredits}
                    isPureMode={isPureMode}
                />

                <CardContent>
                    {/* Action Toolbar */}
                    {hasFinishedFiles && (
                        <ExportToolbar 
                            onExportTeacher={onExportTeacher}
                            onExportStudents={onExportStudents}
                            onExportIndividual={onExportIndividual}
                            onExportPDFs={onExportPDFs}
                            onExportKoreki={onExportKoreki}
                            onExportDigitalSlips={() => setShowDigitalSlips(true)}
                            onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
                            isAnalyticsOpen={showAnalytics}
                        />
                    )}

                    {/* Detailed Insights Modal */}
                    <AnalyticsModal 
                        isOpen={showAnalytics} 
                        onClose={() => setShowAnalytics(false)} 
                        batchFiles={batchFiles} 
                        settings={settings}
                        isPureMode={isPureMode}
                    />

                    {/* Digital Return Slips Modal */}
                    <DigitalSlipsModal 
                        isOpen={showDigitalSlips} 
                        onClose={() => setShowDigitalSlips(false)} 
                        batchFiles={batchFiles} 
                    />

                    {/* Industrial File List */}
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {batchFiles.map((item, idx) => (
                            <BatchFileListItem
                                key={idx}
                                item={item}
                                idx={idx}
                                currentProcessingIndex={currentProcessingIndex}
                                loading={loading}
                                expandedIdx={expandedIdx}
                                onToggleExpand={setExpandedIdx}
                                onToggleSelect={onToggleSelect}
                                onToggleType={onToggleType}
                                onRemoveFile={onRemoveFile}
                                onSplit={onSplit}
                                onRedact={onRedact}
                                onUpdateText={onUpdateText}
                                previewUrl={getPreviewUrl(idx, item)}
                                showScan={showScan[idx] || false}
                                onToggleScan={(i) => setShowScan(prev => ({ ...prev, [i]: !prev[i] }))}
                                mobileViewMode={mobileViewMode}
                                onSetMobileViewMode={setMobileViewMode}
                                tasksLayout={tasksLayout}
                                groupNames={groupNames}
                                activeGroupName={activeGroupName}
                                onSetActiveGroupName={setActiveGroupName}
                                groupedTasks={groupedTasks}
                                getConfidenceColor={getConfidenceColor}
                                handleReviewPointChange={handleReviewPointChange}
                                handleReviewFeedbackChange={handleReviewFeedbackChange}
                                onProcessSingleFile={onProcessSingleFile}
                                onProcessSingleOCR={onProcessSingleOCR}
                                isOcrBatchFinished={!loading && batchFiles.every(f => f.documentType !== 'scanned' || f.selected === false || f.ocrDone || f.status === 'error')}
                                settings={settings}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BatchProcessor;
