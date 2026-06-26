import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Sliders, Save, CheckCircle, ArrowRight, Bot, ShieldCheck, AlertCircle, Trash2, Check, HelpCircle, BookOpen, Upload, Download, PlusCircle, Pencil, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { FloatingActions } from '../ui/FloatingActions';
import { PointInput } from '../ui/PointInput';
import { AppSettings, GradingMemory, GradingMemoryCase, Task } from '../../types';
import { useGradingMemories } from '../../hooks/useGradingMemories';
import { isDesktopTarget } from '../../lib/env-context';
import { apiClient } from '../../lib/api-client';
import { downloadFile } from '../../lib/file-utils';
import { exportGradingMemoryToMarkdown, parseMarkdownGradingMemory } from '../../lib/parsers/markdown-grading-memory-parser';
import { cn } from '../../lib/utils';

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
    const [syntheticAnswers, setSyntheticAnswers] = useState<{ uid: string; character: string; text: string; taskName?: string; pointsObtained?: number; maxPoints?: number; recommendedNotes?: string; recommendedFeedback?: string; }[]>([]);
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
    const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
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
        let name = '';
        const activeMem = hookMemories.find(m => m.id === activeMemoryId);
        if (activeMem) {
            name = activeMem.name;
        } else if (activeMemoryId && typeof window !== 'undefined') {
            name = localStorage.getItem('koreki_active_grading_memory_name') || '';
        }
        if (name) {
            setEditingActiveName(name);
        }
    }, [activeMemoryId, hookMemories]);

    useEffect(() => {
        const activeMem = memories.find(m => m.id === activeMemoryId);
        let activeName = activeMem ? activeMem.name : undefined;
        if (!activeName && activeMemoryId && typeof window !== 'undefined') {
            activeName = localStorage.getItem('koreki_active_grading_memory_name') || undefined;
        }
        onActiveMemoryChange?.(activeName);
    }, [activeMemoryId, memories, onActiveMemoryChange]);

    // Resolve active memory - either from local list or imported unsaved from localStorage
    let activeMemory = memories.find(m => m.id === activeMemoryId) || null;
    let isImportedAndUnsaved = false;
    if (!activeMemory && activeMemoryId) {
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('koreki_active_grading_memory_name') : null;
        const storedCasesStr = typeof window !== 'undefined' ? localStorage.getItem('koreki_active_grading_memory_cases') : null;
        if (storedCasesStr) {
            try {
                activeMemory = {
                    id: activeMemoryId,
                    name: storedName || 'Importierter Erfahrungsschatz',
                    cases: JSON.parse(storedCasesStr)
                };
                isImportedAndUnsaved = true;
            } catch (e) {}
        }
    }

    const savedActiveMemory = hookMemories.find(m => m.id === activeMemoryId) || null;
    const hasChanges = isImportedAndUnsaved || (JSON.stringify(activeMemory) !== JSON.stringify(savedActiveMemory));

    // Auto-persist resolved legacy fields (taskName & maxPoints) back into memories state
    useEffect(() => {
        if (!activeMemoryId || !tasksLayout || tasksLayout.length === 0) return;
        
        setMemories(prev => {
            const activeMem = prev.find(m => m.id === activeMemoryId);
            if (!activeMem) return prev;
            
            let changed = false;
            const updatedCases = activeMem.cases.map(c => {
                let updatedCase = { ...c };
                
                // Resolve taskName
                let resolvedTaskName = c.taskName;
                let isHighConfidence = !!c.taskName;
                if (!resolvedTaskName && c.expectedCorrection.correctionNotes) {
                    const match = c.expectedCorrection.correctionNotes.match(/^\[Aufgabe:\s*([^\]]+)\]/);
                    if (match) {
                        resolvedTaskName = match[1];
                        isHighConfidence = true;
                    }
                }
                // Fallback matching (low confidence, UI render only, never auto-persist)
                if (!resolvedTaskName && tasksLayout && tasksLayout.length > 0) {
                    const combinedText = `${c.studentText} ${c.expectedCorrection.correctionNotes}`.toLowerCase();
                    const bestTask = tasksLayout.reduce((best, t) => {
                        const words = `${t.name} ${t.content || ''}`.toLowerCase().match(/\b[a-z0-9äöüß]{3,}\b/g) || [];
                        const score = words.filter(w => combinedText.includes(w)).length;
                        return score > best.score ? { task: t, score } : best;
                    }, { task: null as any, score: 0 });
                    if (bestTask.score > 2) resolvedTaskName = bestTask.task.name;
                }
                
                if (isHighConfidence && resolvedTaskName && c.taskName !== resolvedTaskName) {
                    updatedCase.taskName = resolvedTaskName;
                    changed = true;
                }
                
                // Resolve maxPoints
                let resolvedMaxPoints = c.expectedCorrection.maxPoints;
                if (!resolvedMaxPoints && resolvedTaskName && tasksLayout) {
                    const matched = tasksLayout.find(t => t.name?.toLowerCase() === resolvedTaskName.toLowerCase());
                    if (matched) resolvedMaxPoints = Number(matched.maxPoints);
                }
                
                if (isHighConfidence && resolvedMaxPoints !== undefined && c.expectedCorrection.maxPoints !== resolvedMaxPoints) {
                    updatedCase.expectedCorrection = {
                        ...updatedCase.expectedCorrection,
                        maxPoints: resolvedMaxPoints
                    };
                    changed = true;
                }
                
                return updatedCase;
            });
            
            if (!changed) return prev;
            
            return prev.map(m => m.id === activeMemoryId ? { ...m, cases: updatedCases } : m);
        });
    }, [activeMemoryId, tasksLayout, memories]);

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

    const handleConfirmRename = async () => {
        if (!editingMemoryId || !editingName.trim()) return;
        
        try {
            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_grading_memories');
                if (stored) {
                    let list = JSON.parse(stored);
                    list = list.map((m: any) => 
                        m.id === editingMemoryId ? { ...m, name: editingName } : m
                    );
                    localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));
                    refreshMemories();
                    setEditingMemoryId(null);
                }
            } else {
                const response = await apiClient.fetch('/api/user/grading-memories', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: editingMemoryId,
                        newName: editingName
                    })
                });
                if (response.ok) {
                    refreshMemories();
                    setEditingMemoryId(null);
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

        const handleDeleteCase = (caseId: string) => {
        if (!activeMemoryId) return;
        if (!window.confirm("Möchtest du dieses Fallbeispiel wirklich aus dem Erfahrungsschatz löschen?")) return;

        setMemories(prev => prev.map(m => {
            if (m.id !== activeMemoryId) return m;
            return {
                ...m,
                cases: m.cases.filter(c => c.id !== caseId)
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

    const handleSaveImportedMemory = async (memory: GradingMemory) => {
        setIsSaving(true);
        try {
            if (isDesktopTarget()) {
                const localMemory: GradingMemory = {
                    id: `local-grading-memory-${Date.now()}`,
                    name: memory.name,
                    cases: memory.cases,
                    userId: null,
                    createdAt: new Date().toISOString()
                };
                addLocalMemory(localMemory);
                alert(`Erfahrungsschatz "${memory.name}" erfolgreich in deiner lokalen Bibliothek gespeichert!`);
            } else {
                const response = await apiClient.post('/api/user/grading-memories', {
                    name: memory.name,
                    cases: memory.cases
                });
                if (response.ok) {
                    const saved = await response.json();
                    addLocalMemory(saved);
                    alert(`Erfahrungsschatz "${memory.name}" erfolgreich in deiner Bibliothek gespeichert!`);
                } else {
                    const errData = await response.json();
                    throw new Error(errData.message || "Fehler beim Speichern des importierten Erfahrungsschatzes im Backend.");
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
                const ansItems = data.studentAnswers.map((ans: any, idx: number) => ({
                    ...ans,
                    uid: `case-uid-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
                }));

                setSyntheticAnswers(ansItems);
                
                const initialCalibs: Record<string, any> = {};
                ansItems.forEach((ans: any) => {
                    const key = ans.uid;
                    
                    let matchedTask = tasksLayout?.find(t => t.name?.toLowerCase() === ans.taskName?.toLowerCase())
                                   || tasksLayout?.find(t => t.name?.toLowerCase().includes(ans.taskName?.toLowerCase() || ''));

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

    const handleCreateEmptyMemory = async () => {
        if (!profileName.trim()) {
            setError('Bitte gib dem Erfahrungsschatz einen aussagekräftigen Namen.');
            return;
        }

        const existing = memories.find(m => m.name.toLowerCase() === profileName.trim().toLowerCase());
        if (existing) {
            const proceed = window.confirm(`Ein Erfahrungsschatz mit dem Namen "${profileName}" existiert bereits. Möchtest du ihn wirklich überschreiben oder einen neuen Eintrag mit dem gleichen Namen erstellen?`);
            if (!proceed) {
                return;
            }
        }

        setIsSaving(true);
        setError(null);
        try {
            const cases: GradingMemoryCase[] = [];

            if (isDesktopTarget()) {
                const localMemory: GradingMemory = {
                    id: `local-grading-memory-${Date.now()}`,
                    name: profileName,
                    cases,
                    userId: null,
                    createdAt: new Date().toISOString()
                };
                addLocalMemory(localMemory);
                setStep('start');
                return;
            }

            const response = await apiClient.post('/api/user/grading-memories', {
                name: profileName,
                cases
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Fehler beim Erstellen des leeren Erfahrungsschatzes.');
            }

            const savedMemory = await response.json();
            addLocalMemory(savedMemory);
            setStep('start');
        } catch (err: any) {
            setError(err.message || 'Fehler beim Sichern des leeren Profils.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCaseManually = () => {
        if (!activeMemoryId) return;

        const newCase: GradingMemoryCase = {
            id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            studentText: 'Beispiel Schülerantwort...',
            taskName: tasksLayout && tasksLayout.length > 0 ? tasksLayout[0].name : 'Aufgabe 1',
            expectedCorrection: {
                pointsObtained: 0,
                maxPoints: tasksLayout && tasksLayout.length > 0 ? Number(tasksLayout[0].maxPoints) : 5,
                correctionNotes: 'Begründung für die Korrektur...',
                feedback: ''
            }
        };

        setMemories(prev => prev.map(m => {
            if (m.id !== activeMemoryId) return m;
            return {
                ...m,
                cases: [...(m.cases || []), newCase]
            };
        }));
    };

    const handleSkip = () => {
        if (!syntheticAnswers || syntheticAnswers.length === 0) return;
        
        const newAnswers = [...syntheticAnswers];
        newAnswers.splice(activeCaseIndex, 1);
        setSyntheticAnswers(newAnswers);
        
        if (newAnswers.length === 0) {
            const proceed = window.confirm("Alle fiktiven Schülerabgaben wurden übersprungen. Möchtest du den Erfahrungsschatz trotzdem als leeres Profil erstellen?");
            if (proceed) {
                handleSave([]);
            } else {
                setStep('start');
            }
        } else if (activeCaseIndex >= newAnswers.length) {
            setActiveCaseIndex(newAnswers.length - 1);
        }
        // Bleibt auf dem gleichen Index, zeigt aber den nächsten (nachgerückten) Fall
    };

    const handleSave = async (answersToSave?: any) => {
        const actualAnswers = Array.isArray(answersToSave) ? answersToSave : syntheticAnswers;
        if (!profileName.trim()) {
            setError('Bitte gib dem Erfahrungsschatz einen aussagekräftigen Namen.');
            return;
        }

        const existing = memories.find(m => m.name.toLowerCase() === profileName.trim().toLowerCase());
        if (existing) {
            const proceed = window.confirm(`Ein Erfahrungsschatz mit dem Namen "${profileName}" existiert bereits. Möchtest du ihn wirklich überschreiben oder einen neuen Eintrag mit dem gleichen Namen erstellen?`);
            if (!proceed) {
                setIsSaving(false);
                return;
            }
        }

        setIsSaving(true);
        setError(null);
        try {
            const cases: GradingMemoryCase[] = actualAnswers.map((ans: any) => {
                const key = ans.uid;
                const cal = calibrations[key];
                return {
                    id: `case-${key}-${Date.now()}`,
                    studentText: ans.text,
                    taskName: cal?.taskName,
                    expectedCorrection: {
                        pointsObtained: cal?.pointsObtained || 0,
                        maxPoints: cal?.maxPoints,
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div 
                className="relative w-full md:max-w-[1200px] h-full md:h-[88vh] bg-white border-none md:border md:border-white rounded-none md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-fade-in text-foreground text-left"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="px-4 sm:px-8 py-4 sm:pt-8 sm:pb-4 flex justify-between items-center border-b border-slate-100 bg-white/50 backdrop-blur shrink-0">
                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden shrink-0">
                            <img src="/logo.png" alt="Koreki Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-2xl font-black font-outfit text-slate-900 tracking-tight truncate">
                                GradingMemory Center
                            </h2>
                            <p className="text-xxs sm:text-sm text-slate-500 font-medium italic truncate">
                                Kalibrierung von Few-Shot Beispielen
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 shrink-0" onClick={onClose}>
                        <X size={24} />
                    </Button>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 sm:px-8 py-4 sm:py-6">
                    
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
                            <div className="w-full md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 space-y-2 relative z-10">
                                    <Button 
                                        onClick={() => selectMemory(null)} 
                                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md gap-2"
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
                                                 <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
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
                                                          // 1. Resolve taskName
                                                          let resolvedTaskName = c.taskName;
                                                          if (!resolvedTaskName && c.expectedCorrection.correctionNotes) {
                                                              const match = c.expectedCorrection.correctionNotes.match(/^\[Aufgabe:\s*([^\]]+)\]/);
                                                              if (match) resolvedTaskName = match[1];
                                                          }
                                                          // Fallback: If tasksLayout is present, match text keywords to map task
                                                          if (!resolvedTaskName && tasksLayout && tasksLayout.length > 0) {
                                                              const combinedText = `${c.studentText} ${c.expectedCorrection.correctionNotes}`.toLowerCase();
                                                              const bestTask = tasksLayout.reduce((best, t) => {
                                                                  const words = `${t.name} ${t.content || ''}`.toLowerCase().match(/\b[a-z0-9äöüß]{3,}\b/g) || [];
                                                                  const score = words.filter(w => combinedText.includes(w)).length;
                                                                  return score > best.score ? { task: t, score } : best;
                                                              }, { task: null as any, score: 0 });
                                                              if (bestTask.score > 2) resolvedTaskName = bestTask.task.name;
                                                          }

                                                          // 2. Resolve maxPoints
                                                          let resolvedMaxPoints = c.expectedCorrection.maxPoints;
                                                          if (!resolvedMaxPoints && resolvedTaskName && tasksLayout) {
                                                              const matched = tasksLayout.find(t => t.name?.toLowerCase() === resolvedTaskName.toLowerCase());
                                                              if (matched) resolvedMaxPoints = Number(matched.maxPoints);
                                                          }

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
                                                    className="flex-[2] sm:flex-none px-6 sm:px-10 h-10 sm:h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl sm:rounded-2xl shadow-xl shadow-indigo-100 transition-all"
                                                >
                                                    Zuweisen
                                                </Button>
                                            </div>
                                        </div>
                                     </div>
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

                                         <div className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl flex flex-col gap-4 mt-2">
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
                        const activeKey = activeCase ? activeCase.uid : '';
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

                                        <Textarea 
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
                                                    <Input 
                                                        type="text" 
                                                        value={cal.taskName} 
                                                        onChange={e => handleUpdateCalibration(activeKey, { taskName: e.target.value })}
                                                        placeholder="z.B. Aufgabe 1a"
                                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold shadow-sm"
                                                    />
                                                    <Input 
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
                                                step="0.5"
                                                value={cal.pointsObtained}
                                                onChange={e => handleUpdateCalibration(activeKey, { pointsObtained: parseFloat(e.target.value) })}
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
                                            <Textarea 
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
                                            <Input 
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
                                    
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <Button 
                                            variant="ghost" 
                                            onClick={handleSkip}
                                            className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold px-4 h-11 rounded-xl transition-all"
                                        >
                                            Fall überspringen
                                        </Button>
                                        
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
                                                className="px-6 py-3 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-100/50 text-xs md:text-sm border-0 transition-all"
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
                                Der neue Erfahrungsschatz <strong>&quot;{profileName}&quot;</strong> wurde sicher gespeichert und ist ab sofort als aktives Few-Shot-Modul für deine Korrekturen vorausgewählt!
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

            </div>
        </div>,
        document.body
    );
};
export default GradingMemoryModal;
