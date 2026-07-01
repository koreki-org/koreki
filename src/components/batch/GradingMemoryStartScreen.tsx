import React from 'react';
import { Sliders, Check, Download, PlusCircle, Pencil, Trash2, Save, BookOpen, Sparkles, AlertCircle, Bot, ArrowRight, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FloatingActions } from '../ui/FloatingActions';
import { PointInput } from '../ui/PointInput';
import { cn } from '../../lib/utils';
import { Task, GradingMemory } from '../../types';
import { resolveTaskName, resolveMaxPoints } from '../../lib/grading-memory-utils';
import { UseGradingMemoryModalStateProps, useGradingMemoryModalState } from '../../hooks/useGradingMemoryModalState';
import { GradingMemoryEditorView } from './GradingMemoryEditorView';

interface GradingMemoryStartScreenProps {
    state: ReturnType<typeof useGradingMemoryModalState>;
    onClose: () => void;
    modelSolution: string;
    tasksLayout?: Task[];
}

export const GradingMemoryStartScreen: React.FC<GradingMemoryStartScreenProps> = ({ state, onClose, modelSolution, tasksLayout }) => {
    const {
        profileName, setProfileName,
        selectedTasks, setSelectedTasks,
        memories, activeMemoryId, selectMemory, deleteMemory, addLocalMemory,
        editingActiveName, setEditingActiveName, editingMemoryId, setEditingMemoryId, editingName, setEditingName,
        fileInputRef, isSaving, isGenerating, error, activeMemory, isImportedAndUnsaved, hasChanges,
        handleImportClick, handleImportFile, handleExportMemory, handleConfirmRename,
        handleUpdateCaseField, handleDeleteCase, handleSaveActiveMemoryChanges,
        handleSaveImportedMemory, handleGenerate, handleCreateEmptyMemory, handleAddCaseManually
    } = state;

    return (
                        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                            
                            {/* Left Column: List of available memories */}
                            <div className="w-full md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 space-y-2 relative z-10">
                                    <Button 
                                        onClick={() => selectMemory(null)} 
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md gap-2"
                                    >
                                        <PlusCircle size={18} /> Neuer Erfahrungsschatz
                                    </Button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleImportFile} 
                                        accept=".md" 
                                        className="hidden" 
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 pt-4 custom-scrollbar min-h-[150px]">
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2 flex items-center gap-2 mb-2">
                                            <Sliders size={14} className="text-indigo-500" />
                                            Gespeicherte Erfahrungsschätze
                                        </h3>
                                    </div>
                                    {/* Default None Option */}
                                    <div 
                                        onClick={() => selectMemory(null)}
                                        className={`p-4 rounded-xl border transition-all text-left flex justify-between items-center cursor-pointer ${!activeMemoryId ? 'bg-indigo-50/40 border-indigo-200 text-indigo-900 shadow-sm' : 'bg-slate-50/40 border-transparent hover:bg-slate-100/60 text-slate-500'}`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-extrabold">Kein Erfahrungsschatz (Standard-Korrektur)</span>
                                            <span className="text-[10px] opacity-80 font-semibold mt-0.5">Führt die Korrektur auf reinem Zero-Shot-Wege ohne fiktive Beispiele aus.</span>
                                        </div>
                                        {!activeMemoryId && <Check size={16} className="text-indigo-600" />}
                                    </div>

                                    {/* Unsaved Imported Memory entry */}
                                    {isImportedAndUnsaved && activeMemory && (
                                        <div 
                                            onClick={() => selectMemory(activeMemory.id || null)}
                                            className={`p-4 rounded-xl border transition-all text-left flex justify-between items-center group cursor-pointer relative bg-indigo-50/20 border-indigo-300 shadow-sm`}
                                        >
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
                                                    <Download size={12} className="text-indigo-600 animate-pulse" />
                                                    {activeMemory.name}
                                                </span>
                                                <span className="text-[10px] text-indigo-500 font-bold uppercase mt-1 font-outfit">
                                                    {activeMemory.cases?.length || 0} Fallbeispiele (Importiert, Nicht gespeichert)
                                                </span>
                                            </div>
                                            <Check size={16} className="text-indigo-600 animate-pulse" />
                                        </div>
                                    )}

                                    {memories.map((m) => (
                                        <div 
                                            key={m.id}
                                            onClick={() => selectMemory(m.id || null)}
                                            className={`p-4 rounded-xl border transition-all text-left flex justify-between items-center group cursor-pointer relative ${activeMemoryId === m.id ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                                        >
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className={`text-xs font-extrabold truncate transition-all duration-300 ${activeMemoryId === m.id ? 'text-indigo-900' : 'text-slate-700'} group-hover:pr-[120px]`}>
                                                    {editingMemoryId === m.id ? (
                                                        <Input 
                                                            autoFocus 
                                                            value={editingName} 
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            className="h-7 text-xs font-bold border-indigo-200" 
                                                            onClick={(e) => e.stopPropagation()}
                                                            onBlur={handleConfirmRename} 
                                                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                                                        />
                                                    ) : (
                                                        m.name
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                    {m.cases?.length || 0} Fallbeispiele (Few-Shot)
                                                </span>

                                            </div>
                                            <FloatingActions className="-top-2 -right-2">
                                                    {editingMemoryId === m.id ? (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600" onClick={(e) => { e.stopPropagation(); handleConfirmRename(); }}>
                                                            <Check size={14} />
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                title="Erfahrungsschatz kopieren"
                                                                className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newMemory: GradingMemory = {
                                                                        ...m,
                                                                        id: `local-grading-memory-${Date.now()}`,
                                                                        name: `Kopie von ${m.name}`,
                                                                        createdAt: new Date().toISOString()
                                                                    };
                                                                    addLocalMemory(newMemory);
                                                                }}
                                                            >
                                                                <PlusCircle size={14} />
                                                            </Button>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleExportMemory(m);
                                                                }}
                                                                className="p-1.5 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors"
                                                                title="Als .md exportieren"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingMemoryId(m.id || null);
                                                                    setEditingName(m.name);
                                                                }}
                                                                className="p-1.5 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors"
                                                                title="Umbenennen"
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteMemory(m.id!);
                                                                }}
                                                                className="p-1.5 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors"
                                                                title="Löschen"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </FloatingActions>
                                            </div>
                                        ))}

                                    {memories.length === 0 && (
                                        <div className="text-center py-6 text-slate-400 border border-dashed border-slate-150 rounded-xl text-xs font-semibold">
                                            Noch keine kalibrierten Erfahrungsschätze vorhanden.
                                        </div>
                                    )}
                                </div>
                            </div>

                             {/* Right Column: Wizard Calibration Trigger OR Active Experience Chest Editor */}
                             <div className="flex-1 flex flex-col gap-4 min-h-0 pr-1">
                                 {activeMemoryId ? (
                                     <GradingMemoryEditorView 
                                         state={state} 
                                         onClose={onClose} 
                                         tasksLayout={tasksLayout} 
                                     />

                                 ) : (
                                     // 🧙‍♂️ WIZARD: CREATE NEW CALIBRATION
                                     <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4 min-h-0">
                                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                             <Sparkles size={14} className="text-indigo-400" />
                                             Neuen Erfahrungsschatz kalibrieren
                                         </h3>
 
                                         <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
                                             KI-Modelle überlesen häufig kritische Zeichenabweichungen (z. B. IP-Adressen oder Ports). Mit <strong>GradingMemory</strong> trainierst du die KI interaktiv: Ein virtueller Schüler simuliert typische Fehlerbilder basierend auf deiner Musterlösung. Du benotest diese fiktiven Fälle einmalig und die KI nutzt diese fortan als exakte Few-Shot-Richtlinie.
                                         </p>

                                         <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-xl flex flex-col gap-4 mt-2">
                                             <div>
                                                 <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5">Name des neuen Profils:</label>
                                                 <Input 
                                                      type="text" 
                                                      value={profileName} 
                                                      onChange={e => setProfileName(e.target.value)}
                                                      placeholder="z.B. IT-Systeme USV & Logfiles"
                                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                 />
                                             </div>

                                             <Button 
                                                 onClick={handleCreateEmptyMemory}
                                                 disabled={isSaving}
                                                 variant="outline"
                                                 className="w-full py-3 h-12 border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm shrink-0 transition-all"
                                             >
                                                 {isSaving ? (
                                                     <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-500 border-t-transparent" />
                                                 ) : (
                                                     <PlusCircle size={18} className="text-slate-500" />
                                                 )}
                                                 Leeren Erfahrungsschatz erstellen
                                             </Button>

                                             <div className="relative flex py-2 items-center">
                                                 <div className="flex-grow border-t border-slate-200"></div>
                                                 <span className="flex-shrink mx-4 text-xs text-slate-400 font-bold uppercase tracking-wider">Oder virtuell simulieren</span>
                                                 <div className="flex-grow border-t border-slate-200"></div>
                                             </div>

                                             {modelSolution && modelSolution.trim() ? (
                                                 <div className="flex flex-col gap-4">
                                                      {tasksLayout && tasksLayout.length > 0 && (
                                                          <div>
                                                              <label className="block text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5">
                                                                  Zu simulierende Aufgaben auswählen:
                                                              </label>
                                                              <div className="bg-white border border-slate-200 rounded-xl p-3.5 max-h-36 overflow-y-auto space-y-2.5 shadow-sm">
                                                                  {tasksLayout.map((task) => {
                                                                      const isChecked = selectedTasks.includes(task.name);
                                                                      return (
                                                                          <label key={task.name} className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors">
                                                                              <input 
                                                                                  type="checkbox"
                                                                                  checked={isChecked}
                                                                                  onChange={() => {
                                                                                      if (isChecked) {
                                                                                          setSelectedTasks(prev => prev.filter(name => name !== task.name));
                                                                                      } else {
                                                                                          setSelectedTasks(prev => [...prev, task.name]);
                                                                                      }
                                                                                  }}
                                                                                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 transition-all"
                                                                              />
                                                                              <span>{task.name} <span className="text-xs text-slate-400 font-bold">({task.maxPoints} P)</span></span>
                                                                          </label>
                                                                      );
                                                                  })}
                                                              </div>
                                                          </div>
                                                      )}
     
                                                     <Button 
                                                         onClick={handleGenerate}
                                                         disabled={isGenerating}
                                                         className="w-full py-3 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 group text-xs md:text-sm shrink-0 border-0 transition-all"
                                                     >
                                                         {isGenerating ? (
                                                             <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                                         ) : (
                                                             <Bot size={18} className="group-hover:scale-115 transition-transform" />
                                                         )}
                                                         Virtuelle Schülerabgaben generieren (1 Credit)
                                                         <ArrowRight size={14} />
                                                     </Button>
                                                 </div>
                                             ) : (
                                                 <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-xl text-center text-amber-800 text-xs font-semibold leading-relaxed flex items-center gap-2 justify-center">
                                                     <AlertCircle size={16} className="text-amber-600 shrink-0" />
                                                     Keine Musterlösung geladen. Simulation nicht verfügbar.
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 )}
                            </div>
                        </div>

    );
};
