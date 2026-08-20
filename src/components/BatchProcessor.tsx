import React from 'react';
import { Info, Highlighter, AlertTriangle } from 'lucide-react';
import { BatchFile, Task, AppSettings } from '../types';
import { Button } from './ui/Button';
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

    // Einstieg für die Sammel-Schwärzung aus der Datenschutz-Warnung heraus: der
    // erste noch ungeschwärzte Scan dient als Vorlage für alle weiteren.
    // `selected !== false` spiegelt `unredactedScansCount`: sonst öffnete der
    // Knopf eine abgewählte Arbeit, die die Warnung gar nicht ausgelöst hat.
    const firstUnredactedScanIdx = batchFiles.findIndex(f => f.documentType === 'scanned' && !f.isRedacted && f.selected !== false);

    // Der stapelweite Wiederlauf setzt `result` und `grade` jeder fertigen Arbeit
    // zurueck (useBatchActions.onResetResults) und startet sofort neu. Damit faellt
    // auch jede von Hand geaenderte Punktzahl und Rueckmeldung weg. Die Zeilen-
    // Rueckfrage benennt das seit dem 20.08.2026 — der Stapel-Dialog sprach bis
    // dahin nur vom Datenschutz und verwarf die Pruefarbeit wortlos.
    const bewerteteArbeiten = batchFiles.filter(f => f.status === 'done').length;

    // Nachträgliches Schwärzen entwertet eine bereits gelaufene Bilderkennung.
    const redactionDiscardsOcr = batchFiles.some(f => f.documentType === 'scanned' && !f.isRedacted && f.ocrDone && f.selected !== false);

    const getConfidenceColor = (conf: number = 0) => {
        if (conf >= 90) return "bg-success text-white";
        if (conf >= 50) return "bg-warning text-white";
        return "bg-destructive text-white";
    };

    return (
        <div id="batch-processor-anchor" className="animate-in fade-in slide-in-from-bottom-6 duration-700 scroll-mt-10">
            {/* Info Badge */}
            <div className="mb-6 flex items-center gap-3 bg-primary/5 border border-primary/10 text-primary p-4 rounded-xl shadow-sm backdrop-blur-xs">
                <Info size={18} className="text-primary" />
                <span className="text-sm font-medium">Namen wurden für die KI pseudonymisiert. Der Export erfolgt automatisch mit Klarnamen.</span>
            </div>

            <Card className="transition-all duration-500 overflow-visible relative border border-border/50 bg-background/70 backdrop-blur-xl shadow-2xl shadow-foreground/5 rounded-hero">
                {/* Privacy Confirmation System */}
                <ConfirmationModal
                    isOpen={showConfirm !== null}
                    title={showConfirm === 'reset' ? "Bewertungen verwerfen und neu korrigieren" : "Datenschutz-Bestätigung"}
                    message={
                        <>
                            {showConfirm === 'reset' && bewerteteArbeiten > 0 && (
                                <div className="mb-4 p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-3">
                                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Bewertungen werden verworfen</p>
                                        <p>Die Bewertungen von {bewerteteArbeiten} Arbeit(en) werden gelöscht und neu erzeugt — auch deine Änderungen an Punkten und Rückmeldungen. Deine Korrekturen am Schülertext bleiben erhalten.</p>
                                    </div>
                                </div>
                            )}
                            {unredactedScansCount > 0 && (
                                <div className="mb-4 p-4 bg-warning/5 border border-warning/20 rounded-xl text-warning text-sm flex items-start gap-3">
                                    <Info size={18} className="mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold mb-1">Hinweis zur Anonymisierung</p>
                                        <p>Du hast {unredactedScansCount} Scan(s) hochgeladen, aber noch nicht manuell geschwärzt. Bitte stelle sicher, dass keine personenbezogenen Daten (z.B. Namen) sichtbar sind.</p>
                                        {redactionDiscardsOcr && (
                                            <p className="mt-2 text-xxs font-medium opacity-90">
                                                Achtung: Wer jetzt noch schwärzt, verwirft den bereits erkannten Text dieser Arbeiten — die Bilderkennung muss dafür erneut laufen und kostet erneut Credits.
                                            </p>
                                        )}
                                        {firstUnredactedScanIdx >= 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => { setShowConfirm(null); onRedact(firstUnredactedScanIdx); }}
                                                className="mt-3 h-8 gap-2 text-xs font-bold border-warning/30 text-warning hover:bg-warning hover:text-warning-foreground transition-all"
                                            >
                                                <Highlighter size={14} /> Jetzt schwärzen
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <p className="leading-relaxed text-foreground/80">{CONFIRM_TEXT}</p>
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
                    onExportSL={onExportSL}
                    onExportKoreki={onExportKoreki}
                    hasPendingOcr={hasPendingOcr}
                />

                <CardContent>
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
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BatchProcessor;
