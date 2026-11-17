import React, { useEffect } from 'react';
import { Info } from 'lucide-react';
import { BatchFile, Task, AppSettings } from '../types';
import { VERTRAUEN_SCHWELLE } from '../lib/vertrauen';
import { Card, CardContent } from './ui/Card';
import { StapelRueckfrage } from './batch/StapelRueckfrage';
import { ExportToolbar } from './batch/ExportToolbar';
import { BatchHeader } from './batch/BatchHeader';
import { LaufFortschritt } from './batch/parts/LaufFortschritt';
import { BatchFileListItem } from './batch/BatchFileListItem';
import { AnalyticsModal } from './batch/AnalyticsModal';
import { DigitalSlipsModal } from './batch/DigitalSlipsModal';
import { useBatchStatus } from '../hooks/useBatchStatus';
import { useFokusArbeit } from '../hooks/useFokusArbeit';

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
    onExportPDFs: (mode: 'none' | 'total' | 'detailed') => void;
    onToggleSelect: (idx: number) => void;
    onToggleType: (idx: number) => void;
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void;
    onSplit: (idx: number) => void;
    onRedact: (index: number) => void;
    onRemoveFile: (index: number) => void;
    onExportKoreki: () => void;
    onExportSL?: () => void;
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
    onExportSL,
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
    const { totalPendingCredits, totalPossibleCredits, ocrCreditsRequired, pendingCount, totalCount, hasFinishedFiles, unredactedScansCount, hasPendingOcr } = metrics;
    const { groupedTasks, groupNames, CONFIRM_TEXT } = logic;
    const { handleConfirmAction, handleReviewPointChange, handleReviewFeedbackChange, handleReviewPointAndFeedbackChange, getPreviewUrl } = handlers;

    const fokus = useFokusArbeit();
    useEffect(() => { if (fokus !== null) window.scrollTo({ top: 0 }); }, [fokus]);

    // Ohne genannten Wert bleibt der Punkt grau. Der Vorgabewert 0 faerbte ihn
    // rot und behauptete damit dasselbe wie das frueher angezeigte "0 %".
    const getConfidenceColor = (conf?: number) => {
        if (conf === undefined) return "bg-muted-foreground/40";
        if (conf >= VERTRAUEN_SCHWELLE) return "bg-success text-white";
        if (conf >= 50) return "bg-warning text-white";
        return "bg-destructive text-white";
    };

    // Eine Zeile des Stapels — im Ueberblick fuer jede Arbeit, in der Pruefansicht fuer genau eine.
    const zeile = (item: BatchFile, idx: number) => (
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
            handleReviewPointAndFeedbackChange={handleReviewPointAndFeedbackChange}
            onProcessSingleFile={onProcessSingleFile}
            onProcessSingleOCR={onProcessSingleOCR}
            /* 🏮 Einzel-Nachlauf freigeben, sobald überhaupt schon
               eine Erkennung gelaufen ist. Die frühere Bedingung
               („ALLE Scans erkannt") ließ den Knopf stapelweit
               verschwinden, sobald ein einzelnes Dokument seine
               Erkennung wieder verlor — etwa durch nachträgliches
               Schwärzen. Übrig blieb nur der große Stapellauf. */
            canRerunSingleOcr={!loading && batchFiles.some(f => f.documentType === 'scanned' && f.ocrDone)}
            settings={settings}
            fokusModus={fokus === idx}
        />
    );

    if (fokus !== null) return <div id="batch-processor-anchor">{zeile(batchFiles[fokus], fokus)}</div>;

    return (
        <div id="batch-processor-anchor" className="scroll-mt-10">
            {/* Info Badge */}
            <div className="mb-2 px-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Info size={14} className="text-primary shrink-0" />
                <span>Namen wurden für die KI pseudonymisiert. Der Export erfolgt automatisch mit Klarnamen.</span>
            </div>

            {/*
              * Voll deckend: Die klebende Kopfzeile liegt IN dieser Karte, jede Deckkraft
              * dort macht sie heller — gemessen rgb(255,255,255) gegen rgb(251,251,252),
              * eine sichtbare Naht. Das Design System verlangt es ohnehin: Glas und
              * Unschaerfe nur fuer Ebenen ueber dem Inhalt, nie fuer Inhaltskarten.
              *
              * `shadow-raised` statt `shadow-2xl`: Der Token traegt die Haarlinie selbst
              * ("ersetzt Rand + shadow-sm", s. tailwind.config.js) — deshalb steht hier
              * kein `border` mehr daneben. Zwei Mittel fuer dieselbe Aussage.
              */}
            <Card className="transition-all duration-500 overflow-visible relative bg-card shadow-raised rounded-hero">
                <StapelRueckfrage batchFiles={batchFiles} showConfirm={showConfirm} unredactedScansCount={unredactedScansCount}
                    confirmText={CONFIRM_TEXT} onConfirm={handleConfirmAction} onCancel={() => setShowConfirm(null)} onRedact={onRedact} />

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
                    onExportSL={onExportSL}
                    onExportKoreki={onExportKoreki}
                    hasPendingOcr={hasPendingOcr}
                />
                <LaufFortschritt />

                <CardContent className="px-3 pb-3 md:px-4 md:pb-4">
                    {/* Action Toolbar */}
                    {hasFinishedFiles && (
                        <ExportToolbar 
                            onExportTeacher={onExportTeacher}
                            onExportStudents={onExportStudents}
                            onExportIndividual={onExportIndividual}
                            onExportPDFs={onExportPDFs}
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

                    {/*
                      * Die Liste rollt NICHT selbst. Bis zum 09.11.2026 stand hier
                      * `max-h-[500px] overflow-y-auto` — ab etwa acht Arbeiten ein zweiter
                      * Rollbalken IN einer Seite, die ohnehin rollt (gemessen: 1084 px Inhalt,
                      * 500 px sichtbar). Der Deckel war nie als Deckel gemeint: Er sollte
                      * „Korrigieren" in Sichtweite halten. Das tut jetzt die klebende
                      * Kopfzeile in BatchHeader — direkt, statt ueber eine feste Hoehe.
                      */}
                    <div className="space-y-2 pt-2">
                        {batchFiles.map(zeile)}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BatchProcessor;
