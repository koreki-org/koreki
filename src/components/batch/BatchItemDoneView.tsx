import React from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { BatchFile, Task, AppSettings } from '../../types';
import { cn } from '@/lib/utils';
import { useTaskReviewActions } from '@/hooks/useTaskReviewActions';
import { useSecondOpinion } from '@/hooks/useSecondOpinion';
import { BatchDoneHeader } from './parts/BatchDoneHeader';
import { BatchPanelKopf } from './parts/BatchPanelKopf';
import { BatchScanViewer } from './parts/BatchScanViewer';
import { BatchSolutionTaskCell } from './parts/BatchSolutionTaskCell';
import { BatchTaskAnalysisCell } from './parts/BatchTaskAnalysisCell';
import { SecondOpinionDrawer } from './parts/SecondOpinionDrawer';
import { AnonymizeModal } from './parts/AnonymizeModal';

interface BatchItemDoneViewProps {
    item: BatchFile;
    idx: number;
    tasksLayout: Task[];
    studentSections: string[];
    groupNames: string[];
    activeGroupName: string;
    onSetActiveGroupName: (name: string) => void;
    groupedTasks: Record<string, Task[]>;
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
 * Die Korrekturansicht einer fertigen Arbeit.
 *
 * Seit dem 08.09.2026 laeuft EIN gemeinsames Raster ueber die Aufgaben und legt
 * je Aufgabe eine Zeile mit zwei Zellen an. Vorher waren es zwei unabhaengige
 * Listen nebeneinander — dieselbe Aufgabe begann links und rechts auf
 * unterschiedlicher Hoehe, weil die rechte Seite mehr Inhalt traegt. Mit
 * Abstaenden ist das nicht zu loesen: Im Raster zieht die hoehere Zelle die
 * andere mit.
 *
 * Der Zustand liegt hier oben, nicht in den Zellen: `useGradingMemories` ruft
 * eine API ohne Cache auf — eine Instanz pro Aufgabe waere ein Abruf pro
 * Aufgabe.
 */
export const BatchItemDoneView: React.FC<BatchItemDoneViewProps> = (props) => {
    const {
        item, idx, tasksLayout, studentSections, activeGroupName, groupedTasks,
        getConfidenceColor, handleReviewPointChange, handleReviewFeedbackChange,
        handleReviewPointAndFeedbackChange, showScan, mobileViewMode, previewUrl,
        onUpdateText, settings
    } = props;

    const [focusedPanel, setFocusedPanel] = React.useState<'left' | 'right' | null>(null);

    const aktionen = useTaskReviewActions({ settings });
    const zweitmeinung = useSecondOpinion({
        idx, settings, tasksLayout, appMode: aktionen.appMode,
        handleReviewPointChange, handleReviewFeedbackChange, handleReviewPointAndFeedbackChange
    });

    const aufgaben = activeGroupName && groupedTasks[activeGroupName]
        ? groupedTasks[activeGroupName]
        : (item.result?.tasks || []);

    /** Eine Rasterzeile: zwei Spalten, ausser eine Seite ist maximiert. */
    const zeile = cn(
        "grid grid-cols-1 gap-6 sm:gap-8 transition-all duration-300",
        focusedPanel ? "md:grid-cols-1" : "md:grid-cols-2"
    );
    /* Auf schmalen Geraeten zeigt der Umschalter genau eine Seite; ab `md` sind
       beide da, sofern nicht eine maximiert wurde. */
    const linkeZelle = cn(
        mobileViewMode === 'image' ? "hidden md:block" : "block",
        focusedPanel === 'right' && "md:hidden"
    );
    const rechteZelle = cn(
        mobileViewMode === 'text' ? "hidden md:block" : "block",
        focusedPanel === 'left' && "md:hidden"
    );

    const einschaetzung = (task: Task) => (
        <BatchTaskAnalysisCell
            item={item}
            idx={idx}
            task={task}
            tasksLayout={tasksLayout}
            studentSections={studentSections}
            getConfidenceColor={getConfidenceColor}
            handleReviewPointChange={handleReviewPointChange}
            handleReviewFeedbackChange={handleReviewFeedbackChange}
            aktionen={aktionen}
            zweitmeinung={zweitmeinung}
        />
    );

    const { anonymizePayload } = aktionen;

    return (
        <div className="animate-in fade-in duration-500">
            <BatchDoneHeader {...props} />

            <div className={cn(zeile, "mt-4")}>
                <div className={linkeZelle}>
                    <BatchPanelKopf
                        icon={<FileText size={14} className="text-muted-foreground" />}
                        titel={showScan ? "Original-Scan der Schülerlösung" : "Erkannte Schülerlösung"}
                        seite="left"
                        focusedPanel={focusedPanel}
                        onToggleFocus={setFocusedPanel}
                    />
                </div>
                <div className={rechteZelle}>
                    <BatchPanelKopf
                        icon={<Sparkles size={14} className="text-primary/60" />}
                        titel="Bearbeitbare Einschätzung"
                        seite="right"
                        focusedPanel={focusedPanel}
                        onToggleFocus={setFocusedPanel}
                    />
                </div>
            </div>

            {showScan ? (
                /* Im Scan-Modus gibt es links nichts zu paaren: Ein Scan ist nicht
                   nach Aufgaben zerlegt. Deshalb hier weiter zwei Spalten. */
                <div className={zeile}>
                    <div className={linkeZelle}>
                        <BatchScanViewer item={item} previewUrl={previewUrl} />
                    </div>
                    <div className={cn(rechteZelle, "space-y-4")}>
                        {aufgaben.map(task => (
                            <div key={task.name}>{einschaetzung(task)}</div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {aufgaben.map(task => (
                        <div key={task.name} className={zeile}>
                            <div className={linkeZelle}>
                                <BatchSolutionTaskCell
                                    item={item}
                                    idx={idx}
                                    task={task}
                                    tasksLayout={tasksLayout}
                                    studentSections={studentSections}
                                    onUpdateText={onUpdateText}
                                />
                            </div>
                            <div className={rechteZelle}>{einschaetzung(task)}</div>
                        </div>
                    ))}
                </div>
            )}

            {aktionen.showAnonymizeDialog && typeof window !== 'undefined' && anonymizePayload && (
                <AnonymizeModal
                    isOpen={aktionen.showAnonymizeDialog}
                    onClose={aktionen.handleCloseAnonymize}
                    originalText={anonymizePayload.originalText}
                    anonymizedText={aktionen.anonymizedText}
                    setAnonymizedText={aktionen.setAnonymizedText}
                    anonymizing={aktionen.anonymizing}
                    anonymizeError={aktionen.anonymizeError}
                    isPending={aktionen.isPending}
                    points={anonymizePayload.points}
                    maxPoints={anonymizePayload.maxPoints}
                    onRetryAnonymize={aktionen.handleRetryAnonymize}
                    onConfirmSave={aktionen.handleConfirmAnonymizeSave}
                    isSaaSService={aktionen.isSaaSService}
                />
            )}
            <SecondOpinionDrawer
                isOpen={zweitmeinung.showSecondOpinionDrawer}
                onClose={() => {
                    zweitmeinung.setShowSecondOpinionDrawer(false);
                    zweitmeinung.setActiveDoubleCheckTask(null);
                }}
                taskName={zweitmeinung.activeDoubleCheckTask?.name || ''}
                studentText={zweitmeinung.activeDoubleCheckTask?.studentText || ''}
                currentPoints={zweitmeinung.activeDoubleCheckTask?.currentPoints ?? 0}
                maxPoints={zweitmeinung.activeDoubleCheckTask?.maxPoints ?? 0}
                currentFeedback={zweitmeinung.activeDoubleCheckTask?.currentFeedback || ''}
                onApply={zweitmeinung.handleApplySecondOpinion}
                onSubmit={zweitmeinung.handleSubmitSecondOpinion}
                isSaaSService={true}
            />
        </div>
    );
};
