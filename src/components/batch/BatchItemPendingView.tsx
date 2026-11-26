import React from 'react';
import { AlertCircle, Eraser, FileText } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AufgabenReiter } from '../ui/AufgabenReiter';
import { EditableMathArea } from '../ui/EditableMathArea';
import { BatchScanViewer } from './parts/BatchScanViewer';
import { ZuordnungsHinweis } from './parts/ZuordnungsHinweis';
import { OcrMarkenEntfernen } from './parts/OcrMarkenEntfernen';
import { entferneOcrMarken, zaehleOcrMarken } from '../../lib/ocr-marken-entfernen';
import { BatchFile, Task } from '../../types';
import { hasOcrWarnings } from '../../lib/task-utils';
import { cn } from '@/lib/utils';

interface BatchItemPendingViewProps {
    item: BatchFile;
    idx: number;
    tasksLayout: any[];
    studentSections: string[];
    onUpdateText: (idx: number, text: string, tasks?: Task[]) => void;
    groupNames: string[];
    activeGroupName: string;
    onSetActiveGroupName: (name: string) => void;
    groupedTasks: Record<string, any[]>;
    mobileViewMode: 'text' | 'image';
    previewUrl: string | null;
}

/**
 * BatchItemPendingView
 * 📝🏮🛡️
 * Handles the OCR verification and manual text correction UI.
 * Isolated from the review logic to ensure maximum maintainability.
 */
export const BatchItemPendingView: React.FC<BatchItemPendingViewProps> = ({
    item,
    idx,
    tasksLayout,
    studentSections,
    onUpdateText,
    groupNames,
    activeGroupName,
    onSetActiveGroupName,
    groupedTasks,
    mobileViewMode,
    previewUrl
}) => {
    /** Text einer Aufgabe setzen — wie beim Tippen im Textfeld, in `item.tasks`. */
    const setzeText = (task: Task, text: string) => {
        const updatedTasks = [...(item.tasks || [])];
        const taskIdxInItem = updatedTasks.findIndex(t => t.name === task.name);
        if (taskIdxInItem !== -1) {
            updatedTasks[taskIdxInItem] = { ...updatedTasks[taskIdxInItem], content: text };
        } else {
            updatedTasks.push({ name: task.name, content: text, maxPoints: task.maxPoints });
        }
        onUpdateText(idx, "", updatedTasks);
    };

    return (
        <div className={cn("grid grid-cols-1 gap-4 sm:gap-8 h-fit", item.documentType === 'scanned' && "md:grid-cols-2")}>
            {/* OCR Verification View */}
            <div className={cn("flex flex-col gap-4 min-h-[180px] md:min-h-[200px] md:max-h-[600px]", (mobileViewMode === 'image' && item.documentType === 'scanned') ? "hidden md:flex" : "flex", "md:flex")}>
                <div className="flex-1 space-y-4 w-full flex flex-col min-h-0">
                    {/* RESTORATION: Image 2 Header Title */}
                    {/* Mindesthoehe = Knopf + Abstand: Verschwindet „Alle … (?) entfernen", springt die Zeile nicht. */}
                    <div className="flex items-center gap-2 mb-3 px-1 pt-4 min-h-12 shrink-0">
                        <FileText size={14} className="text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Erkannter Text · hier prüfen und verbessern</span>
                        <OcrMarkenEntfernen
                            aufgaben={item.tasks}
                            layout={tasksLayout}
                            abschnitte={studentSections}
                            onUebernehmen={(aufgaben) => onUpdateText(idx, "", aufgaben)}
                        />
                    </div>

                    <AufgabenReiter
                        namen={groupNames}
                        aktiv={activeGroupName}
                        onWaehle={onSetActiveGroupName}
                        warnung={(name) => groupedTasks[name].some(task => {
                            const sIdx = tasksLayout.findIndex(t => t.name === task.name);
                            return hasOcrWarnings(studentSections[sIdx] || '')
                                || !!item.tasks?.find(t => t.name === task.name)?.zuordnungsHinweis;
                        })}
                        className="mb-4 shrink-0"
                    />

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {activeGroupName && groupedTasks[activeGroupName]?.map((task) => {
                            const sIdx = tasksLayout.findIndex(t => t.name === task.name);
                            const sectionText = studentSections[sIdx] || '';
                            const sectionHasUncertainty = hasOcrWarnings(sectionText);
                            const markenInAufgabe = zaehleOcrMarken(sectionText);

                            return (
                                <div key={task.name} className="group space-y-3">
                                    <EditableMathArea
                                        leftAction={
                                            <>
                                                <span className="text-xs font-bold text-foreground truncate">{task.name}</span>
                                                {sectionHasUncertainty && (
                                                    <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold h-5 px-2 shadow-none gap-1 shrink-0">
                                                        <AlertCircle size={10} /> OCR prüfen!
                                                    </Badge>
                                                )}
                                                {/* Ohne Rueckfrage: betrifft nur die Aufgabe, die gerade offen vor einem liegt. */}
                                                {markenInAufgabe > 0 && (
                                                    <Button variant="outline" size="xs" className="shrink-0" onClick={() => setzeText(task, entferneOcrMarken(sectionText))}>
                                                        <Eraser size={14} />
                                                        {markenInAufgabe === 1 ? '(?) entfernen' : `${markenInAufgabe} (?) entfernen`}
                                                    </Button>
                                                )}
                                            </>
                                        }
                                        value={sectionText}
                                        onChange={(text) => setzeText(task, text)}
                                        placeholder="Schülerantwort..."
                                        className="w-full"
                                        initialEditMode={sectionHasUncertainty}
                                    />
                                    <ZuordnungsHinweis text={item.tasks?.find(t => t.name === task.name)?.zuordnungsHinweis} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Scan column (Pending) */}
            {item.documentType === 'scanned' && (
                <BatchScanViewer
                    item={item}
                    previewUrl={previewUrl}
                    className={cn(mobileViewMode === 'text' ? "hidden md:block" : "block", "md:block")}
                />
            )}
        </div>
    );
};
