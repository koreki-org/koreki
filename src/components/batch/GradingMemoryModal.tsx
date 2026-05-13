import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Sliders, Save, CheckCircle, ArrowRight, Bot, ShieldCheck, AlertCircle, Trash2, Check, HelpCircle, BookOpen, Upload, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { AppSettings, GradingMemory, GradingMemoryCase, Task } from '../../types';
import { useGradingMemories } from '../../hooks/useGradingMemories';
import { isDesktopTarget } from '../../lib/env-context';
import { apiClient } from '../../lib/api-client';
import { downloadFile } from '../../lib/file-utils';
import { exportGradingMemoryToMarkdown, parseMarkdownGradingMemory } from '../../lib/parsers/markdown-grading-memory-parser';

interface GradingMemoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    modelSolution: string;
    tasksLayout?: Task[];
    settings?: AppSettings;
    userData?: any;
    setUserData?: React.Dispatch<React.SetStateAction<any>>;
    onActiveMemoryChange?: (name: string | undefined) => void;
}

export const GradingMemoryModal: React.FC<GradingMemoryModalProps> = ({
    isOpen,
    onClose,
    modelSolution,
    tasksLayout,
    settings,
    userData,
    setUserData,
    onActiveMemoryChange
}) => {
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<'start' | 'generating' | 'calibrate' | 'saved'>('start');
    const [profileName, setProfileName] = useState('');
    const [syntheticAnswers, setSyntheticAnswers] = useState<{ character: string; text: string; taskName?: string; pointsObtained?: number; maxPoints?: number; recommendedNotes?: string; recommendedFeedback?: string; }[]>([]);
    const [activeCaseIndex, setActiveCaseIndex] = useState<number>(0);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    
    // Each calibration links to a real task, score, notes, and student feedback
    const [calibrations, setCalibrations] = useState<Record<string, { 
        taskName: string; 
        pointsObtained: number; 
        maxPoints: number; 
        correctionNotes: string; 
        feedback: string 
    }>>({});
    
    const [memories, setMemories] = useState<GradingMemory[]>([]);
    const [editingActiveName, setEditingActiveName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load available profiles & active state via our hook
    const {
        memories: hookMemories,
        loading: loadingMemories,
        activeMemoryId,
        selectMemory,
        deleteMemory,
        addLocalMemory,
        refreshMemories,
        getActiveMemory
    } = useGradingMemories(userData);

    useEffect(() => {
        setMemories(hookMemories);
    }, [hookMemories]);

    useEffect(() => {
        const activeMem = hookMemories.find(m => m.id === activeMemoryId);
        if (activeMem) {
            setEditingActiveName(activeMem.name);
        }
    }, [activeMemoryId, hookMemories]);

    useEffect(() => {
        const activeMem = memories.find(m => m.id === activeMemoryId);
        onActiveMemoryChange?.(activeMem ? activeMem.name : undefined);
    }, [activeMemoryId, memories, onActiveMemoryChange]);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            setProfileName(`Erfahrungsschatz (${dateStr})`);
            refreshMemories();
            
            // Default select all tasks from tasksLayout
            if (tasksLayout && Array.isArray(tasksLayout)) {
                setSelectedTasks(tasksLayout.map(t => t.name).filter(Boolean));
            } else {
                setSelectedTasks([]);
            }
        } else {
            document.body.style.overflow = 'unset';
            setStep('start');
            setSyntheticAnswers([]);
            setCalibrations({});
            setActiveCaseIndex(0);
            setSelectedTasks([]);
            setError(null);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, refreshMemories, tasksLayout]);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = parseMarkdownGradingMemory(text);
            
            if (parsed.cases.length === 0) {
                alert("Fehler: Keine gültigen Fallbeispiele im KEP-MD-2 Format gefunden.");
                return;
            }

            if (isDesktopTarget()) {
                const localMemory: GradingMemory = {
                    id: `local-grading-memory-${Date.now()}`,
                    name: parsed.name,
                    cases: parsed.cases,
                    userId: null,
                    createdAt: new Date().toISOString()
                };
                addLocalMemory(localMemory);
                alert(`Erfahrungsschatz "${parsed.name}" erfolgreich importiert!`);
            } else {
                const response = await apiClient.post('/api/user/grading-memories', {
                    name: parsed.name,
                    cases: parsed.cases
                });
                if (response.ok) {
                    const saved = await response.json();
                    addLocalMemory(saved);
                    alert(`Erfahrungsschatz "${parsed.name}" erfolgreich importiert!`);
                } else {
                    throw new Error("Fehler beim Speichern des importierten Erfahrungsschatzes im Backend.");
                }
            }
        } catch (err: any) {
            alert("Import-Fehler: " + (err.message || String(err)));
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExportMemory = async (memory: GradingMemory) => {
        try {
            const markdown = exportGradingMemoryToMarkdown(memory.name, memory.cases);
            const filename = `${memory.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_grading_memory.md`;
            await downloadFile(markdown, filename, 'text/markdown;charset=utf-8');
        } catch (error) {
            console.error('Fehler beim Exportieren des Erfahrungsschatzes:', error);
            alert('Export fehlgeschlagen.');
        }
    };

    const handleRenameActiveMemory = async () => {
        if (!activeMemoryId || !editingActiveName.trim()) return;
        
        try {
            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_grading_memories');
                if (stored) {
                    let list = JSON.parse(stored);
                    list = list.map((m: any) => 
                        m.id === activeMemoryId ? { ...m, name: editingActiveName } : m
                    );
                    localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));
                    refreshMemories();
                    alert("Erfahrungsschatz erfolgreich umbenannt!");
                }
            } else {
                const response = await apiClient.fetch('/api/user/grading-memories', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: activeMemoryId,
                        newName: editingActiveName
                    })
                });
                if (response.ok) {
                    refreshMemories();
                    alert("Erfahrungsschatz erfolgreich umbenannt!");
                } else {
                    throw new Error("Fehler beim Umbenennen im Backend.");
                }
            }
        } catch (e: any) {
            alert("Fehler beim Umbenennen: " + (e.message || String(e)));
        }
    };

    const handleUpdateCaseField = (caseId: string, field: 'pointsObtained' | 'correctionNotes' | 'feedback' | 'studentText', value: any) => {
        if (!activeMemoryId) return;

        setMemories(prev => prev.map(m => {
            if (m.id !== activeMemoryId) return m;
            return {
                ...m,
                cases: m.cases.map(c => {
                    if (c.id !== caseId) return c;
                    if (field === 'studentText') {
                        return { ...c, studentText: value };
                    }
                    return {
                        ...c,
                        expectedCorrection: {
                            ...c.expectedCorrection,
                            [field]: value
                        }
                    };
                })
            };
        }));
    };

    const handleSaveActiveMemoryChanges = async () => {
        const activeMem = memories.find(m => m.id === activeMemoryId);
        if (!activeMem) return;

        setIsSaving(true);
        try {
            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_grading_memories');
                if (stored) {
                    let list = JSON.parse(stored);
                    const idx = list.findIndex((m: any) => m.id === activeMemoryId);
                    if (idx >= 0) {
                        list[idx] = activeMem;
                    }
                    localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));
                    refreshMemories();
                    alert("Änderungen erfolgreich lokal gespeichert!");
                }
            } else {
                const response = await apiClient.post('/api/user/grading-memories', {
                    id: activeMemoryId,
                    name: activeMem.name,
                    cases: activeMem.cases
                });
                if (response.ok) {
                    refreshMemories();
                    alert("Änderungen erfolgreich gespeichert!");
                } else {
                    throw new Error("Fehler beim Speichern im Backend.");
                }
            }
        } catch (e: any) {
            alert("Fehler beim Speichern: " + (e.message || String(e)));
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!modelSolution || !modelSolution.trim()) {
            setError('Bitte lade zuerst eine Musterlösung im Dashboard hoch, um darauf basierende Schülerfehler zu simulieren.');
            return;
        }

        if (selectedTasks.length === 0) {
            setError('Bitte wähle mindestens eine Aufgabe für die Simulation aus.');
            return;
        }

        setIsGenerating(true);
        setStep('generating');
        setError(null);
        try {
            let data: any;

            if (settings?.provider === 'ollama') {
                const { executeOllamaRequest } = await import('../../lib/ai/ollama-logic');
                data = await executeOllamaRequest(
                    'student-simulator',
                    { modelSolution, tasksLayout, selectedTasks },
                    settings
                );
            } else {
                const response = await apiClient.post('/api/user/grading-memories/generate', {
                    modelSolution,
                    tasksLayout,
                    selectedTasks,
                    settings: settings || { provider: 'mistral' }
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Die KI konnte die fiktiven Schülerabgaben nicht generieren.');
                }

                data = await response.json();
            }

            if (data.studentAnswers && Array.isArray(data.studentAnswers)) {
                setSyntheticAnswers(data.studentAnswers);
                
                const initialCalibs: Record<string, any> = {};
                data.studentAnswers.forEach((ans: any, idx: number) => {
                    const key = ans.taskName || `case-${idx}`;
                    
                    let matchedTask = tasksLayout?.find(t => t.name?.toLowerCase() === ans.taskName?.toLowerCase())
                                   || tasksLayout?.find(t => t.name?.toLowerCase().includes(ans.taskName?.toLowerCase() || ''))
                                   || tasksLayout?.[0];

                    const actualTaskName = matchedTask?.name || ans.taskName || 'Aufgabe 1';
                    const actualMaxPoints = matchedTask ? Number(matchedTask.maxPoints || 5) : (ans.maxPoints || 5);
                    const actualPointsObtained = ans.pointsObtained !== undefined 
                        ? Math.min(actualMaxPoints, ans.pointsObtained) 
                        : Math.round(actualMaxPoints * 0.6);

                    initialCalibs[key] = {
                        taskName: actualTaskName,
                        pointsObtained: actualPointsObtained,
                        maxPoints: actualMaxPoints,
                        correctionNotes: ans.recommendedNotes || '',
                        feedback: ans.recommendedFeedback || ''
                    };
                });
                
                setCalibrations(initialCalibs);
                setActiveCaseIndex(0);
                setStep('calibrate');
            } else {
                throw new Error('Ungültiges Antwortformat der KI erhalten.');
            }
        } catch (err: any) {
            setError(err.message || 'Verbindungsfehler beim Aufruf der Simulator-Schnittstelle.');
            setStep('start');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!profileName.trim()) {
            setError('Bitte gib dem Erfahrungsschatz einen aussagekräftigen Namen.');
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const cases: GradingMemoryCase[] = syntheticAnswers.map((ans, idx) => {
                const key = ans.taskName || `case-${idx}`;
                const cal = calibrations[key];
                return {
                    id: `case-${key}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    studentText: ans.text,
                    expectedCorrection: {
                        pointsObtained: cal?.pointsObtained || 0,
                        correctionNotes: `[Aufgabe: ${cal?.taskName || 'Allgemein'}] ${cal?.correctionNotes || ''}`,
                        feedback: cal?.feedback || undefined
                    }
                };
            });

            if (isDesktopTarget()) {
                const localMemory: GradingMemory = {
                    id: `local-grading-memory-${Date.now()}`,
                    name: profileName,
                    cases,
                    userId: null,
                    createdAt: new Date().toISOString()
                };
                addLocalMemory(localMemory);
                setStep('saved');
                return;
            }

            const response = await apiClient.post('/api/user/grading-memories', {
                name: profileName,
                cases
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Fehler beim Speichern.');
            }

            const savedMemory = await response.json();
            addLocalMemory(savedMemory);
            setStep('saved');
        } catch (err: any) {
            setError(err.message || 'Fehler beim Sichern des Profils im lokalen Speicher.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCalibration = (char: string, fields: Partial<{ taskName: string; pointsObtained: number; maxPoints: number; correctionNotes: string; feedback: string }>) => {
        setCalibrations(prev => ({
            ...prev,
            [char]: {
                ...prev[char],
                ...fields
            }
        }));
    };

    const getCharacterBadgeStyle = (char: string) => {
        switch (char) {
            case 'TYPO':
                return 'bg-rose-50 text-rose-600 border border-rose-100/80';
            case 'MATH_STEP_MISSING':
                return 'bg-amber-50 text-amber-600 border border-amber-100/80';
            case 'SEMANTIC_LENIENT':
                return 'bg-sky-50 text-sky-600 border border-sky-100/80';
            default:
                return 'bg-slate-50 text-slate-600 border border-slate-100';
        }
    };

    const getCharacterTitle = (char: string) => {
        switch (char) {
            case 'TYPO':
                return 'Der Flüchtige (Tippfehler & Syntax)';
            case 'MATH_STEP_MISSING':
                return 'Der Lückenhafte (Rechenweg / Struktur)';
            case 'SEMANTIC_LENIENT':
                return 'Der Schwammige (Umgangssprache / Kulanz)';
            default:
                return char;
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div 
                className="relative w-full md:max-w-[1250px] h-full md:h-[92vh] bg-white border-none md:border md:border-slate-100 rounded-none md:rounded-2xl shadow-2xl p-5 md:p-8 text-slate-800 flex flex-col overflow-hidden animate-zoom-in text-left font-sans"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-20"
                >
                    <X size={22} />
                </button>

                {/* Header Section */}
                <div className="flex items-start gap-4 mb-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0 rotate-1">
                        <Sparkles size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black font-outfit text-slate-900 tracking-tight flex items-center gap-2">
                            GradingMemory™ Expert Center
                        </h2>
                        <p className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider uppercase">Pädagogische Best Practices & Few-Shot-Modulkalibrierung</p>
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden pr-2">
                    
                    {error && (
                        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs md:text-sm flex items-center gap-2.5 shrink-0 animate-pulse">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* STEP 1: START SCREEN (CRUD + CALIBRATE CTA) */}
                    {step === 'start' && (
                        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                            
                            {/* Left Column: List of available memories */}
                            <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6 overflow-hidden">
                                <div className="flex items-center justify-between mb-3 shrink-0">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Sliders size={14} className="text-indigo-500" />
                                        Gespeicherte Erfahrungsschätze
                                    </h3>
                                    <button 
                                        onClick={handleImportClick}
                                        className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg border border-indigo-150 transition-colors"
                                        title="Erfahrungsschatz importieren (.md)"
                                    >
                                        <Upload size={12} />
                                        Importieren
                                    </button>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImportFile} 
                                    accept=".md" 
                                    className="hidden" 
                                />

                                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-[150px]">
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

                                    {memories.map((m) => (
                                        <div 
                                            key={m.id}
                                            onClick={() => selectMemory(m.id || null)}
                                            className={`p-4 rounded-xl border transition-all text-left flex justify-between items-center cursor-pointer group ${activeMemoryId === m.id ? 'bg-indigo-50/40 border-indigo-200 text-indigo-900 shadow-sm' : 'bg-slate-50/40 border-transparent hover:bg-slate-100/60 text-slate-700'}`}
                                        >
                                            <div className="flex flex-col min-w-0 pr-4">
                                                <span className="text-xs font-extrabold truncate">{m.name}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                    {m.cases?.length || 0} Fallbeispiele (Few-Shot)
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {activeMemoryId === m.id && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                                                        Aktiv
                                                    </span>
                                                )}
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExportMemory(m);
                                                    }}
                                                    className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors opacity-60 hover:opacity-100"
                                                    title="Als .md exportieren"
                                                >
                                                    <Download size={13} />
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteMemory(m.id!);
                                                    }}
                                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors opacity-60 hover:opacity-100"
                                                    title="Löschen"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {memories.length === 0 && (
                                        <div className="text-center py-6 text-slate-400 border border-dashed border-slate-150 rounded-2xl text-xs font-semibold">
                                            Noch keine kalibrierten Erfahrungsschätze vorhanden.
                                        </div>
                                    )}
                                </div>
                            </div>

                             {/* Right Column: Wizard Calibration Trigger OR Active Experience Chest Editor */}
                             <div className="flex-1 flex flex-col gap-4 min-h-0 pr-1">
                                 {activeMemoryId ? (
                                     // 🛠️ ACTIVE EXPERIENCE CHEST EDITOR / VIEW PANEL
                                     <div className="flex-1 flex flex-col min-h-0">
                                         <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0 mb-3">
                                             <div className="flex items-center gap-2">
                                                 <Sliders size={16} className="text-indigo-600" />
                                                 <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 font-outfit">
                                                     Erfahrungsschatz verwalten & editieren
                                                 </h3>
                                             </div>
                                             <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                                                 Aktiviert
                                             </span>
                                         </div>
 
                                         {/* Scrollable inputs section */}
                                         <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar min-h-0">
                                             {/* Rename Chest input */}
                                             <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-xl space-y-2">
                                                 <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                     Name des Erfahrungsschatzes:
                                                 </label>
                                                 <div className="flex gap-2">
                                                     <input 
                                                         type="text"
                                                         value={editingActiveName}
                                                         onChange={e => setEditingActiveName(e.target.value)}
                                                         className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                                                     />
                                                     <Button 
                                                         onClick={handleRenameActiveMemory}
                                                         className="px-4 py-2 h-9 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold rounded-lg border border-slate-300 shadow-sm shrink-0"
                                                     >
                                                         Umbenennen
                                                     </Button>
                                                 </div>
                                             </div>
 
                                             {/* List of Cases to view/edit */}
                                             <div className="space-y-3.5">
                                                 <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                     <BookOpen size={12} className="text-indigo-500" />
                                                     Enthaltene Fallbeispiele ({memories.find(m => m.id === activeMemoryId)?.cases?.length || 0}):
                                                 </h4>
 
                                                 <div className="space-y-4 pr-1">
                                                     {memories.find(m => m.id === activeMemoryId)?.cases?.map((c, index) => (
                                                         <div key={c.id} className="p-4 border border-slate-150 rounded-xl bg-slate-50/20 space-y-3">
                                                             <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                                 <span className="text-xs font-extrabold text-slate-700">Fallbeispiel {index + 1}</span>
                                                                 <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                                     Few-Shot #{index + 1}
                                                                 </span>
                                                             </div>
 
                                                             <div className="space-y-1">
                                                                 <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Schülerantwort (Simuliert / Editierbar):</span>
                                                                 <textarea 
                                                                     rows={3}
                                                                     value={c.studentText}
                                                                     onChange={e => handleUpdateCaseField(c.id, 'studentText', e.target.value)}
                                                                     className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm resize-y"
                                                                     placeholder="Simulierter Schülertext..."
                                                                 />
                                                             </div>
 
                                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                                 <div className="space-y-1">
                                                                     <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Erwartete Punkte:</span>
                                                                     <div className="flex items-center gap-2">
                                                                         <input 
                                                                             type="number"
                                                                             min="0"
                                                                             max="20"
                                                                             value={c.expectedCorrection.pointsObtained}
                                                                             onChange={e => handleUpdateCaseField(c.id, 'pointsObtained', parseInt(e.target.value) || 0)}
                                                                             className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center font-bold text-slate-800"
                                                                         />
                                                                         <span className="text-xs text-slate-400 font-bold">Punkte</span>
                                                                     </div>
                                                                 </div>
 
                                                                 <div className="space-y-1">
                                                                     <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Feedback an Schüler:</span>
                                                                     <input 
                                                                         type="text"
                                                                         value={c.expectedCorrection.feedback || ''}
                                                                         onChange={e => handleUpdateCaseField(c.id, 'feedback', e.target.value)}
                                                                         className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                                                                         placeholder="Optionales Feedback..."
                                                                     />
                                                                 </div>
                                                             </div>
 
                                                             <div className="space-y-1">
                                                                 <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Pädagogische Begründung:</span>
                                                                 <textarea 
                                                                     rows={2}
                                                                     value={c.expectedCorrection.correctionNotes}
                                                                     onChange={e => handleUpdateCaseField(c.id, 'correctionNotes', e.target.value)}
                                                                     className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 leading-relaxed shadow-sm resize-none"
                                                                     placeholder="Korrekturbegründung..."
                                                                 />
                                                             </div>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>
 
                                         <div className="flex flex-col sm:flex-row gap-3 pt-3 mt-3 border-t border-slate-150 shrink-0 bg-white">
                                             <Button 
                                                 onClick={handleSaveActiveMemoryChanges}
                                                 disabled={isSaving}
                                                 className="flex-1 py-2.5 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100/50 text-xs transition-all border-0"
                                             >
                                                 {isSaving ? (
                                                     <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                                 ) : (
                                                     <Save size={14} />
                                                 )}
                                                 Änderungen speichern
                                             </Button>
 
                                             <Button 
                                                 onClick={() => selectMemory(null)}
                                                 className="py-2.5 h-10 bg-white hover:bg-slate-50 text-slate-600 font-extrabold rounded-lg border border-slate-200 shadow-sm text-xs transition-all"
                                             >
                                                 Neuen kalibrieren
                                             </Button>
                                         </div>
                                     </div>
                                 ) : (
                                     // 🧙‍♂️ WIZARD: CREATE NEW CALIBRATION
                                     <div className="flex flex-col gap-4">
                                         <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                             <Sparkles size={14} className="text-indigo-400" />
                                             Neuen Erfahrungsschatz kalibrieren
                                         </h3>
 
                                         <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
                                             KI-Modelle überlesen häufig kritische Zeichenabweichungen (z. B. IP-Adressen oder Ports). Mit <strong>GradingMemory</strong> trainierst du die KI interaktiv: Ein virtueller Schüler simuliert typische Fehlerbilder basierend auf deiner Musterlösung. Du benotest diese fiktiven Fälle einmalig und die KI nutzt diese fortan als exakte Few-Shot-Richtlinie.
                                         </p>
 
                                         {modelSolution && modelSolution.trim() ? (
                                             <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl flex flex-col gap-4 mt-2">
                                                 <div>
                                                     <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5">Name des neuen Profils:</label>
                                                     <input 
                                                         type="text" 
                                                         value={profileName} 
                                                         onChange={e => setProfileName(e.target.value)}
                                                         placeholder="z.B. IT-Systeme USV & Logfiles"
                                                         className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                     />
                                                 </div>

                                                  {tasksLayout && tasksLayout.length > 0 && (
                                                      <div>
                                                          <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 mb-1.5">
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
                                                                          <span>{task.name} <span className="text-[10px] text-slate-400 font-bold">({task.maxPoints} P)</span></span>
                                                                      </label>
                                                                  );
                                                              })}
                                                          </div>
                                                      </div>
                                                  )}
 
                                                 <Button 
                                                     onClick={handleGenerate}
                                                     className="w-full py-3 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 group text-xs md:text-sm shrink-0 border-0 transition-all"
                                                 >
                                                     <Bot size={18} className="group-hover:scale-115 transition-transform" />
                                                     Virtuelle Schülerabgaben generieren (1 Credit)
                                                     <ArrowRight size={14} />
                                                 </Button>
                                             </div>
                                         ) : (
                                             <div className="mt-2 p-5 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-500 text-xs font-semibold leading-relaxed">
                                                 ⚠️ Keine Musterlösung geladen. Um neue Schülerantworten für die Kalibrierung zu simulieren, lade bitte zuerst eine Musterlösung im Dashboard hoch.
                                             </div>
                                         )}
                                     </div>
                                 )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: GENERATING ANIMATION */}
                    {step === 'generating' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center animate-pulse">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 rounded-full border-4 border-indigo-600/10 border-t-indigo-600 animate-spin" />
                                <Bot size={28} className="absolute inset-0 m-auto text-indigo-600 animate-bounce" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 font-outfit">Simuliere virtuelle Schülerabgaben...</h3>
                            <p className="text-slate-500 text-xs md:text-sm max-w-[450px]">
                                Die KI analysiert deine Musterlösung und schlüpft in die Rollen verschiedener Schüler-Avatare, um Tippfehler, lückenhafte Rechenwege und schwammige Sprache zu simulieren und zu bewerten.
                            </p>
                        </div>
                    )}

                    {/* STEP 3: ACTIVE CALIBRATION (REDESIGNED EXTRA-LARGE COCKPIT) */}
                    {step === 'calibrate' && syntheticAnswers.length > 0 && (() => {
                        const activeCase = syntheticAnswers[activeCaseIndex];
                        const activeKey = activeCase ? (activeCase.taskName || `case-${activeCaseIndex}`) : '';
                        const cal = calibrations[activeKey];
                        if (!activeCase || !cal) return null;

                        return (
                            <div className="flex-1 flex flex-col gap-5 min-h-0">
                                
                                {/* Wizard Progress Indicator */}
                                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 shrink-0 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                                            {activeCaseIndex + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 font-outfit">
                                                Kalibrierung: Fall {activeCaseIndex + 1} von {syntheticAnswers.length}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                                Zugeordnete Aufgabe: <span className="text-indigo-600 font-extrabold">{activeCase.taskName || 'Allgemein'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {syntheticAnswers.map((_, idx) => {
                                            const isCompleted = idx < activeCaseIndex;
                                            const isActive = idx === activeCaseIndex;
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`h-2.5 rounded-full transition-all duration-300 ${isActive ? 'w-10 bg-indigo-600' : isCompleted ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fullscreen 2-Spalten-Layout */}
                                <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
                                    
                                    {/* Left Column: Spacious Student Answer Text */}
                                    <div className="w-full lg:w-1/2 flex flex-col bg-slate-50/50 border border-slate-150 rounded-2xl p-5 md:p-6 min-h-[220px] lg:h-full overflow-hidden">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${getCharacterBadgeStyle(activeCase.character)}`}>
                                                    {getCharacterTitle(activeCase.character)}
                                                </span>
                                                <h4 className="text-sm font-extrabold text-slate-800 font-outfit">
                                                    Simulierter Text
                                                </h4>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Abgabe editieren</span>
                                        </div>

                                        <textarea 
                                            value={activeCase.text || ''}
                                            onChange={(e) => {
                                                const newText = e.target.value;
                                                setSyntheticAnswers(prev => prev.map((ans, idx) => idx === activeCaseIndex ? { ...ans, text: newText } : ans));
                                            }}
                                            placeholder="Simulierter Schülertext..."
                                            className="flex-1 bg-white border border-slate-200 rounded-xl p-4 md:p-5 font-mono text-xs md:text-sm text-slate-700 leading-relaxed overflow-y-auto custom-scrollbar resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-sm transition-all"
                                        />
                                    </div>

                                    {/* Right Column: Calibration Form Cockpit */}
                                    <div className="w-full lg:w-1/2 flex flex-col bg-white border border-slate-150 rounded-2xl p-5 md:p-6 lg:h-full overflow-y-auto custom-scrollbar gap-5">
                                        <div className="border-b border-slate-100 pb-3 shrink-0 flex items-center justify-between">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 font-outfit">
                                                <BookOpen size={16} className="text-indigo-500" />
                                                Bewertungs-Cockpit
                                            </h4>
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                                                KI-Vorschlag geladen
                                            </span>
                                        </div>

                                        {/* 1. Task Association Dropdown */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                                                Zugeordnete Aufgabe aus der Musterlösung:
                                            </label>
                                            {tasksLayout && tasksLayout.length > 0 ? (
                                                <select 
                                                    value={cal.taskName}
                                                    onChange={(e) => {
                                                        const selectedName = e.target.value;
                                                        const matched = tasksLayout.find(t => t.name === selectedName);
                                                        if (matched) {
                                                            const maxP = Number(matched.maxPoints || 5);
                                                            handleUpdateCalibration(activeKey, {
                                                                taskName: selectedName,
                                                                maxPoints: maxP,
                                                                pointsObtained: Math.min(cal.pointsObtained, maxP)
                                                            });
                                                        }
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                >
                                                    {tasksLayout.map(t => (
                                                        <option key={t.name} value={t.name}>
                                                            {t.name} (max. {t.maxPoints} Punkte)
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={cal.taskName} 
                                                        onChange={e => handleUpdateCalibration(activeKey, { taskName: e.target.value })}
                                                        placeholder="z.B. Aufgabe 1a"
                                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                    />
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={cal.maxPoints} 
                                                        onChange={e => {
                                                            const maxP = Math.max(1, parseInt(e.target.value) || 5);
                                                            handleUpdateCalibration(activeKey, { 
                                                                maxPoints: maxP,
                                                                pointsObtained: Math.min(cal.pointsObtained, maxP)
                                                            });
                                                        }}
                                                        placeholder="Max"
                                                        className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* 2. Interactive Points Slider */}
                                        <div className="space-y-3 pt-3 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                                                <span>Menschliche Wertung (Slider):</span>
                                                <span className="text-indigo-600 font-extrabold text-sm md:text-base bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 shadow-sm font-mono">
                                                    {cal.pointsObtained} von {cal.maxPoints} Punkten
                                                </span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max={cal.maxPoints} 
                                                step="1"
                                                value={cal.pointsObtained}
                                                onChange={e => handleUpdateCalibration(activeKey, { pointsObtained: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                                                <span>0 Punkte (Deduction)</span>
                                                <span>{Math.round(cal.maxPoints / 2)} P (Hälfte)</span>
                                                <span>{cal.maxPoints} P (Full Score)</span>
                                            </div>
                                        </div>

                                        {/* 3. Pedagogical Correction Notes */}
                                        <div className="space-y-2 pt-3 border-t border-slate-100 flex-1 flex flex-col min-h-[140px]">
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                                                Korrekturbegründung (correctionNotes):
                                            </label>
                                            <textarea 
                                                rows={4}
                                                value={cal.correctionNotes}
                                                onChange={e => handleUpdateCalibration(activeKey, { correctionNotes: e.target.value })}
                                                placeholder="Ausformulierte Begründung für den Punktabzug..."
                                                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none font-medium leading-relaxed shadow-sm"
                                            />
                                        </div>

                                        {/* 4. Student Feedback Input */}
                                        <div className="space-y-2">
                                            <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                                                Feedback an Schüler (Optional):
                                            </label>
                                            <input 
                                                type="text"
                                                value={cal.feedback}
                                                onChange={e => handleUpdateCalibration(activeKey, { feedback: e.target.value })}
                                                placeholder="Pädagogischer Ratschlag zur Fehlervermeidung..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Calibration Controls Footer */}
                                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 shrink-0">
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => {
                                            if (activeCaseIndex > 0) {
                                                setActiveCaseIndex(prev => prev - 1);
                                            } else {
                                                setStep('start');
                                            }
                                        }}
                                        className="text-xs text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1.5"
                                    >
                                        Zurück
                                    </Button>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:block text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Erfahrungsschatz-Name:</span>
                                            <input 
                                                type="text" 
                                                value={profileName} 
                                                onChange={e => setProfileName(e.target.value)}
                                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-xs font-bold text-slate-800 text-right focus:outline-none transition-all w-48 py-0.5"
                                            />
                                        </div>
                                        
                                        {activeCaseIndex < syntheticAnswers.length - 1 ? (
                                            <Button 
                                                onClick={() => setActiveCaseIndex(prev => prev + 1)}
                                                className="px-6 py-3 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100/50 text-xs md:text-sm border-0 transition-all"
                                            >
                                                Nächster Fall
                                                <ArrowRight size={14} />
                                            </Button>
                                        ) : (
                                            <Button 
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-6 py-3 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-100/50 text-xs md:text-sm border-0 transition-all animate-pulse"
                                            >
                                                {isSaving ? (
                                                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                                                ) : (
                                                    <Save size={16} />
                                                )}
                                                Erfahrungsschatz sichern
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* STEP 4: SUCCESS / SAVED */}
                    {step === 'saved' && (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center mb-5 shadow-lg shadow-emerald-100 animate-bounce">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 font-outfit">Erfahrungsschatz erfolgreich kalibriert!</h3>
                            <p className="text-slate-500 text-xs md:text-sm max-w-[500px] mb-6 font-medium">
                                Der neue Erfahrungsschatz <strong>"{profileName}"</strong> wurde sicher gespeichert und ist ab sofort als aktives Few-Shot-Modul für deine Korrekturen vorausgewählt!
                            </p>
                            <Button 
                                onClick={onClose}
                                className="px-6 py-3 h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl border border-slate-200 text-xs md:text-sm shadow-sm"
                            >
                                Schließen & Zurück zur Korrektur
                            </Button>
                        </div>
                    )}

                </div>

                {/* Footer Credits */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-center shrink-0">
                    <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        Koreki GradingMemory™ | Active Calibration Node
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};
export default GradingMemoryModal;
