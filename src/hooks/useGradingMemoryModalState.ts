import { useEffect, useState, useRef } from 'react';
import { AppSettings, GradingMemory, GradingMemoryCase, Task } from '../types';
import { useGradingMemories } from './useGradingMemories';
import { isDesktopTarget } from '../lib/env-context';
import { apiClient } from '../lib/api-client';
import { downloadFile } from '../lib/file-utils';
import { exportGradingMemoryToMarkdown, parseMarkdownGradingMemory } from '../lib/parsers/markdown-grading-memory-parser';
import { resolveTaskName, resolveMaxPoints } from '../lib/grading-memory-utils';
import { findNameCollision } from '../lib/local-vault';
import { nameTakenMessage, overwriteQuestion } from '../lib/services/profile-naming';

export interface UseGradingMemoryModalStateProps {
    isOpen: boolean;
    onClose: () => void;
    modelSolution: string;
    tasksLayout?: Task[];
    settings?: AppSettings;
    userData?: any;
    setUserData?: any;
    onActiveMemoryChange?: (name: string | undefined) => void;
}

export function useGradingMemoryModalState({
    isOpen,
    onClose,
    modelSolution,
    tasksLayout,
    settings,
    userData,
    setUserData,
    onActiveMemoryChange
}: UseGradingMemoryModalStateProps) {
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
                const { resolvedTaskName, isHighConfidence } = resolveTaskName(c.taskName, c.expectedCorrection.correctionNotes, c.studentText, tasksLayout);
                
                if (isHighConfidence && resolvedTaskName && c.taskName !== resolvedTaskName) {
                    updatedCase.taskName = resolvedTaskName;
                    changed = true;
                }
                
                // Resolve maxPoints
                let resolvedMaxPoints = resolveMaxPoints(c.expectedCorrection.maxPoints, resolvedTaskName, tasksLayout);
                
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
    }, [activeMemoryId, tasksLayout]);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            setProfileName(`Erfahrungsschatz (${dateStr})`);
            
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
                    if (findNameCollision(list, editingMemoryId, editingName)) {
                        alert(nameTakenMessage('Erfahrungsschatz'));
                        return;
                    }
                    list = list.map((m: any) =>
                        m.id === editingMemoryId ? { ...m, name: editingName.trim() } : m
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
                        newName: editingName.trim()
                    })
                });
                if (response.ok) {
                    refreshMemories();
                    setEditingMemoryId(null);
                } else {
                    // Der Grund steht in der Antwort — etwa die Namenskollision.
                    // Ihn zu verwerfen ließ jeden Fall gleich aussehen.
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.message || 'Fehler beim Umbenennen im Backend.');
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
                const { executeOllamaRequest } = await import('../lib/ai/ollama-logic');
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
                    
                    // Der Simulator paraphrasiert den Aufgabennamen gelegentlich, deshalb der Teilstring-Vergleich.
                    // Er darf aber nur bei nicht-leerem Namen greifen: includes('') trifft sonst immer die erste Aufgabe.
                    const simulatedName = (ans.taskName || '').trim().toLowerCase();
                    const matchedTask = simulatedName
                        ? (tasksLayout?.find(t => t.name?.toLowerCase() === simulatedName)
                            || tasksLayout?.find(t => t.name?.toLowerCase().includes(simulatedName)))
                        : undefined;

                    // Liegt ein Layout vor, ist ausschliesslich ein Treffer daraus eine gueltige Zuordnung.
                    // Der paraphrasierte Name des Simulators wuerde sonst eine Aufgabe vortaeuschen, die es nicht gibt.
                    const hasLayout = !!tasksLayout && tasksLayout.length > 0;
                    const actualTaskName = hasLayout ? (matchedTask?.name || '') : (ans.taskName || '');
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
            // Der Text versprach zuvor die Wahl zwischen Überschreiben und einem
            // zweiten Eintrag gleichen Namens. Beide Ablagen überschreiben aber
            // immer — die Datenbank erzwingt Eindeutigkeit je Nutzer.
            const proceed = window.confirm(overwriteQuestion('Erfahrungsschatz', profileName.trim()));
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
            // Der Text versprach zuvor die Wahl zwischen Überschreiben und einem
            // zweiten Eintrag gleichen Namens. Beide Ablagen überschreiben aber
            // immer — die Datenbank erzwingt Eindeutigkeit je Nutzer.
            const proceed = window.confirm(overwriteQuestion('Erfahrungsschatz', profileName.trim()));
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
                const assignedTaskName = cal?.taskName?.trim() || undefined;
                // Das [Aufgabe: ...]-Praefix ist der Fallback-Anker von resolveTaskName().
                // Ohne echte Zuordnung darf es nicht geschrieben werden, sonst wird "Allgemein"
                // spaeter als hochkonfidenter Aufgabenname zurueckgelesen.
                const notes = cal?.correctionNotes || '';
                return {
                    id: `case-${key}-${Date.now()}`,
                    studentText: ans.text,
                    taskName: assignedTaskName,
                    expectedCorrection: {
                        pointsObtained: cal?.pointsObtained || 0,
                        maxPoints: cal?.maxPoints,
                        correctionNotes: assignedTaskName ? `[Aufgabe: ${assignedTaskName}] ${notes}` : notes,
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


    return {
        mounted,
        setMounted,
        step,
        setStep,
        profileName,
        setProfileName,
        syntheticAnswers,
        setSyntheticAnswers,
        activeCaseIndex,
        setActiveCaseIndex,
        selectedTasks,
        setSelectedTasks,
        calibrations,
        setCalibrations,
        memories,
        setMemories,
        editingActiveName,
        setEditingActiveName,
        editingMemoryId,
        setEditingMemoryId,
        editingName,
        setEditingName,
        fileInputRef,
        isSaving,
        setIsSaving,
        isGenerating,
        setIsGenerating,
        error,
        setError,
        hookMemories,
        loadingMemories,
        activeMemoryId,
        selectMemory,
        deleteMemory,
        addLocalMemory,
        refreshMemories,
        getActiveMemory,
        activeMemory,
        isImportedAndUnsaved,
        hasChanges,
        handleImportClick,
        handleImportFile,
        handleExportMemory,
        handleConfirmRename,
        handleUpdateCaseField,
        handleDeleteCase,
        handleSaveActiveMemoryChanges,
        handleSaveImportedMemory,
        handleGenerate,
        handleCreateEmptyMemory,
        handleAddCaseManually,
        handleSkip,
        handleSave,
        handleUpdateCalibration,
        getCharacterBadgeStyle,
        getCharacterTitle
    };
}
