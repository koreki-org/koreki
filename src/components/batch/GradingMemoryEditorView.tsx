import React from 'react';
import { Sliders, Save, BookOpen, PlusCircle, Trash2, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { PointInput } from '../ui/PointInput';
import { cn } from '../../lib/utils';
import { Task } from '../../types';
import { resolveTaskName, resolveMaxPoints } from '../../lib/grading-memory-utils';
import { useGradingMemoryModalState } from '../../hooks/useGradingMemoryModalState';

interface GradingMemoryEditorViewProps {
    state: ReturnType<typeof useGradingMemoryModalState>;
    onClose: () => void;
    tasksLayout?: Task[];
}

export const GradingMemoryEditorView: React.FC<GradingMemoryEditorViewProps> = ({ state, onClose, tasksLayout }) => {
    const {
        activeMemory, isImportedAndUnsaved, hasChanges, isSaving,
        handleImportClick, handleSaveImportedMemory, handleSaveActiveMemoryChanges,
        handleAddCaseManually, handleUpdateCaseField, handleDeleteCase
    } = state;

    return (
                                     // 🛠️ ACTIVE EXPERIENCE CHEST EDITOR / VIEW PANEL
                                     <div className="flex-1 flex flex-col min-h-0">
                                         <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 mb-3">
                                             <div className="flex items-center gap-2">
                                                 <Sliders size={16} className="text-indigo-600" />
                                                 <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 font-outfit">
                                                     Verwalten & Editieren
                                                 </h3>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                <Button 
                                                     onClick={handleImportClick}
                                                     className="h-8 sm:h-9 rounded-full text-[10px] font-black uppercase border border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 gap-1.5 px-3 sm:px-4 transition-all"
                                                 >
                                                     <RefreshCcw size={14} /> Import
                                                 </Button>
                                                <Button 
                                                     onClick={isImportedAndUnsaved ? () => handleSaveImportedMemory(activeMemory!) : handleSaveActiveMemoryChanges}
                                                     disabled={!hasChanges || isSaving}
                                                     className={cn(
                                                         "h-9 px-4 text-xs font-black uppercase rounded-full flex items-center gap-1.5 shadow-md transition-all border-0",
                                                         hasChanges 
                                                             ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100" 
                                                             : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                                     )}
                                                 >
                                                     {isSaving ? (
                                                         <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                                     ) : (
                                                         <Save size={14} />
                                                     )}
                                                     Speichern
                                                 </Button>
                                             </div>
                                         </div>
 
                                         {/* Scrollable inputs section */}
                                         <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar min-h-0">
                                             
                                             {/* SAVE IMPORTED MEMORY BANNER */}
                                             {isImportedAndUnsaved && activeMemory && (
                                                 <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-4 shadow-sm">
                                                     <div className="space-y-1">
                                                         <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wide">Importierter Erfahrungsschatz</h4>
                                                         <p className="text-[10px] text-indigo-700 font-bold leading-normal">
                                                             Dieser Erfahrungsschatz wurde mit der Sitzung importiert, ist aber noch nicht in deiner lokalen Bibliothek gespeichert. Sichert alle {activeMemory.cases?.length || 0} Beispiele dauerhaft.
                                                         </p>
                                                     </div>
                                                     <Button 
                                                         onClick={() => handleSaveImportedMemory(activeMemory!)}
                                                         disabled={isSaving}
                                                         className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase h-9 px-4 rounded-xl flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-100"
                                                     >
                                                         {isSaving ? (
                                                             <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                                         ) : (
                                                             <Save size={14} />
                                                         )}
                                                         Sichern
                                                     </Button>
                                                 </div>
                                             )}

                                             {/* List of Cases to view/edit */}
                                             <div className="space-y-3.5">
                                                 <div className="flex justify-between items-center pb-1">
                                                     <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                         <BookOpen size={12} className="text-indigo-500" />
                                                         Enthaltene Fallbeispiele ({activeMemory?.cases?.length || 0}):
                                                     </h4>
                                                     <Button 
                                                         variant="ghost"
                                                         size="sm"
                                                         onClick={handleAddCaseManually}
                                                         disabled={isImportedAndUnsaved}
                                                         className="h-8 rounded-full text-xs font-black uppercase text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                                                     >
                                                         <PlusCircle size={14} /> Fallbeispiel hinzufügen
                                                     </Button>
                                                 </div>
 
                                                 <div className="space-y-4 pr-1">
                                                     {activeMemory?.cases?.map((c, index) => {
                                                          // 1. Resolve taskName via pure function
                                                          const { resolvedTaskName } = resolveTaskName(c.taskName, c.expectedCorrection.correctionNotes, c.studentText, tasksLayout);

                                                          // 2. Resolve maxPoints via pure function
                                                          const resolvedMaxPoints = resolveMaxPoints(c.expectedCorrection.maxPoints, resolvedTaskName, tasksLayout);

                                                          return (
                                                         <div key={c.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/20 space-y-3">
                                                             <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                                 <span className="text-xs font-extrabold text-slate-700">Fallbeispiel {index + 1} {resolvedTaskName ? `(${resolvedTaskName})` : ''}</span>
                                                                 <div className="flex items-center gap-2">
                                                                     <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                         Few-Shot #${index + 1}
                                                                     </span>
                                                                     <button 
                                                                         type="button"
                                                                         disabled={isImportedAndUnsaved}
                                                                         onClick={(e) => {
                                                                             e.stopPropagation();
                                                                             e.preventDefault();
                                                                             handleDeleteCase(c.id);
                                                                         }}
                                                                         className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                                         title="Fallbeispiel löschen"
                                                                     >
                                                                         <Trash2 size={13} />
                                                                     </button>
                                                                 </div>
                                                             </div>
 
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Schülerantwort (Simuliert / Editierbar):</span>
                                                                <Textarea 
                                                                    rows={3}
                                                                    value={c.studentText}
                                                                    disabled={isImportedAndUnsaved}
                                                                    onChange={e => handleUpdateCaseField(c.id, 'studentText', e.target.value)}
                                                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm resize-y disabled:bg-slate-100/55 disabled:text-slate-500 disabled:cursor-not-allowed"
                                                                    placeholder="Simulierter Schülertext..."
                                                                />
                                                            </div>
 
                                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                                 <div className="space-y-1">
                                                                     <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Vergebene Punkte:</span>
                                                                      <PointInput 
                                                                           value={Number(c.expectedCorrection.pointsObtained ?? 0)}
                                                                           maxPoints={resolvedMaxPoints}
                                                                           showMaxPoints={resolvedMaxPoints !== undefined}
                                                                           disabled={isImportedAndUnsaved}
                                                                           onChange={val => handleUpdateCaseField(c.id, 'pointsObtained', val)}
                                                                           className="bg-white border-slate-200/60 max-w-[140px]"
                                                                       />
                                                                 </div>
 
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Feedback an Schüler:</span>
                                                                    <Input 
                                                                        type="text"
                                                                        value={c.expectedCorrection.feedback || ''}
                                                                        disabled={isImportedAndUnsaved}
                                                                        onChange={e => handleUpdateCaseField(c.id, 'feedback', e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm disabled:bg-slate-100/55 disabled:text-slate-500 disabled:cursor-not-allowed"
                                                                        placeholder="Optionales Feedback..."
                                                                    />
                                                                </div>
                                                             </div>
 
                                                             <div className="space-y-1">
                                                                 <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Pädagogische Begründung:</span>
                                                                 <Textarea 
                                                                     rows={2}
                                                                     value={c.expectedCorrection.correctionNotes}
                                                                     disabled={isImportedAndUnsaved}
                                                                     onChange={e => handleUpdateCaseField(c.id, 'correctionNotes', e.target.value)}
                                                                     className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 leading-relaxed shadow-sm resize-none disabled:bg-slate-100/55 disabled:text-slate-500 disabled:cursor-not-allowed"
                                                                     placeholder="Korrekturbegründung..."
                                                                 />
                                                             </div>
                                                         </div>
                                                     )})}
                                                 </div>
                                             </div>
                                         </div>

                                        {/* Footer Action Bar */}
                                        <div className="px-4 sm:px-8 py-4 sm:py-6 bg-white border-t border-slate-100 flex justify-end items-center shrink-0 mt-auto">
                                            <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                                                <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none px-4 sm:px-6 h-10 sm:h-12 font-bold text-slate-400 hover:text-slate-900">
                                                    Abbrechen
                                                </Button>
                                                <Button
                                                    onClick={onClose}
                                                    className="flex-[2] sm:flex-none px-6 sm:px-10 h-10 sm:h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xl shadow-indigo-100 transition-all"
                                                >
                                                    Zuweisen
                                                </Button>
                                            </div>
                                        </div>
                                     </div>
    );
};
