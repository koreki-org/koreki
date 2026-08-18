import { useEffect, useState } from 'react';
import { useGradingMemoryLibrary } from '@/hooks/grading-memory/useGradingMemoryLibrary';
import { useGradingMemoryWizard } from '@/hooks/grading-memory/useGradingMemoryWizard';
import { getCharacterBadgeStyle, getCharacterTitle } from '@/lib/grading-memory-characters';
import { AppSettings, GradingMemory, GradingMemoryCase, Task } from '../types';
import { useGradingMemories } from './useGradingMemories';
import { isDesktopTarget } from '../lib/env-context';
import { apiClient } from '../lib/api-client';
import { downloadFile } from '../lib/file-utils';
import { resolveTaskName, resolveMaxPoints } from '../lib/grading-memory-utils';
import { findNameCollision } from '../lib/local-vault';
import { toErrorMessage } from '../lib/error-message';

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
    
    
    const [memories, setMemories] = useState<GradingMemory[]>([]);
    const [editingActiveName, setEditingActiveName] = useState('');

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

    const wizard = useGradingMemoryWizard({
        isOpen, modelSolution, tasksLayout: tasksLayout || [], settings,
        memories, setMemories, activeMemoryId, addLocalMemory
    });

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
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, refreshMemories, tasksLayout]);

    const library = useGradingMemoryLibrary({ addLocalMemory, refreshMemories, memories });

    // Ueberladungen halten fest, was der Rumpf voraussetzt: `pointsObtained` ist
    // eine Zahl, alle uebrigen Felder sind Text. Mit einem gemeinsamen
    // `string | number` liesse sich eine Zahl in `studentText` schreiben.
    function handleUpdateCaseField(caseId: string, field: 'pointsObtained', value: number): void;
    function handleUpdateCaseField(caseId: string, field: 'correctionNotes' | 'feedback' | 'studentText', value: string): void;
    function handleUpdateCaseField(caseId: string, field: 'pointsObtained' | 'correctionNotes' | 'feedback' | 'studentText', value: string | number) {
        if (!activeMemoryId) return;

        setMemories(prev => prev.map(m => {
            if (m.id !== activeMemoryId) return m;
            return {
                ...m,
                cases: m.cases.map(c => {
                    if (c.id !== caseId) return c;
                    if (field === 'studentText') {
                        return { ...c, studentText: String(value) };
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

        wizard.setIsSaving(true);
        try {
            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_grading_memories');
                if (stored) {
                    let list: GradingMemory[] = JSON.parse(stored);
                    const idx = list.findIndex(m => m.id === activeMemoryId);
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
        } catch (e) {
            alert("Fehler beim Speichern: " + toErrorMessage(e));
        } finally {
            wizard.setIsSaving(false);
        }
    };

    const handleSaveImportedMemory = async (memory: GradingMemory) => {
        wizard.setIsSaving(true);
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
        } catch (e) {
            alert("Fehler beim Speichern: " + toErrorMessage(e));
        } finally {
            wizard.setIsSaving(false);
        }
    };

    return {
        // Assistent und Sammlung geben ihre Namen unveraendert weiter. Sie hier
        // noch einmal aufzulisten hiesse, zwanzig Zeilen doppelt zu pflegen —
        // der Duplikat-Waechter hat genau das gemeldet.
        ...wizard,
        ...library,

        mounted, setMounted,
        memories, setMemories,
        editingActiveName, setEditingActiveName,

        hookMemories, loadingMemories, activeMemoryId,
        selectMemory, deleteMemory, addLocalMemory, refreshMemories, getActiveMemory,
        activeMemory, isImportedAndUnsaved, hasChanges,

        handleUpdateCaseField, handleDeleteCase,
        handleSaveActiveMemoryChanges, handleSaveImportedMemory,

        getCharacterBadgeStyle, getCharacterTitle
    };
}
