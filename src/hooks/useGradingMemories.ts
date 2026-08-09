import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GradingMemory } from '../types';
import { isDesktopTarget } from '../lib/env-context';
import { awaitSettlingSlot, SettlingSlot } from '../lib/session-settling';
import { apiClient } from '../lib/api-client';
import { readLocalArray, readLocalArrayForUpdate, writeLocalArray } from '../lib/local-vault';
import { isSameName } from '../lib/services/profile-naming';

const MEMORY_KEY = 'koreki_local_grading_memories';

// Diese drei Schlüssel halten einfache Strings bzw. eine separate Fallliste und
// laufen bewusst NICHT über den Array-Helfer.
const ACTIVE_ID_KEY = 'koreki_active_grading_memory_id';
const ACTIVE_NAME_KEY = 'koreki_active_grading_memory_name';
const ACTIVE_CASES_KEY = 'koreki_active_grading_memory_cases';

/**
 * Custom hook for managing "Erfahrungsschätze" (GradingMemory Profiles)
 * Supports zero-latency client state sync with fallback for Tauri desktop.
 */
export const useGradingMemories = (userData?: any) => {
    const [memories, setMemories] = useState<GradingMemory[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const fetchMemories = useCallback(async (shouldNotify = true) => {
        setLoading(true);
        if (isDesktopTarget()) {
            const list = readLocalArray<GradingMemory>(MEMORY_KEY);
            setMemories(list);

            const savedId = localStorage.getItem(ACTIVE_ID_KEY);
            if (savedId) {
                const activeMem = list.find(m => m.id === savedId);
                if (activeMem) {
                    localStorage.setItem(ACTIVE_NAME_KEY, activeMem.name);
                    if (activeMem.cases) {
                        localStorage.setItem(ACTIVE_CASES_KEY, JSON.stringify(activeMem.cases));
                    }
                }
            }
            setLoading(false);
            if (shouldNotify) {
                window.dispatchEvent(new CustomEvent('koreki-grading-memories-changed', { detail: { origin: 'fetchMemories' } }));
            }
            return;
        }


        // 🛡️ Auth-Gate (SaaS / Community Multi-User)
        // Ohne aufgelöste Session landet der Request garantiert im 401: withSecurity
        // antwortet für nicht-authentifizierte Aufrufe mit "Nicht angemeldet.".
        // Der Hook wird in app.tsx im Component-Body aufgerufen und läuft damit auch,
        // während der AuthGuard noch lädt oder zum Login umleitet.
        // Identisches Muster wie usePromptGovernance / useSkillGovernance / useAiGovernance;
        // `!userData?.id` deckt deren `authLoading` mit ab, da userData solange null ist.
        // Der Desktop-Pfad oben bleibt bewusst ungegated — er ist netzwerkfrei.
        if (!userData?.id) {
            setLoading(false);
            return;
        }

        await awaitSettlingSlot(SettlingSlot.GRADING_MEMORIES);

        try {
            const res = await apiClient.get('/api/user/grading-memories');
            if (res.ok) {
                const data = await res.json();
                setMemories(data);
                
                const savedId = userData?.activeGradingMemoryId || localStorage.getItem('koreki_active_grading_memory_id');
                if (savedId) {
                    const activeMem = data.find((m: any) => m.id === savedId);
                    if (activeMem) {
                        localStorage.setItem('koreki_active_grading_memory_name', activeMem.name);
                        if (activeMem.cases) {
                            localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(activeMem.cases));
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[useGradingMemories] Error fetching memories', err);
        } finally {
            setLoading(false);
            if (shouldNotify) {
                window.dispatchEvent(new CustomEvent('koreki-grading-memories-changed', { detail: { origin: 'fetchMemories' } }));
            }
        }
    }, [userData?.id, userData?.activeGradingMemoryId]);

    useEffect(() => {
        // Kein Notify beim Initial-Load: Der Hook ist mehrfach gleichzeitig gemountet
        // (app.tsx, GradingMemoryModal, je eine Instanz pro BatchTaskAnalysisCard).
        // Ein notifizierender Mount-Fetch löst über den Listener unten in JEDER
        // Instanz einen weiteren Fetch aus — bei N Instanzen also N + N² Requests
        // auf denselben Endpoint. Die Instanzen laden hier ohnehin alle selbst,
        // das Event ist zum Mount-Zeitpunkt reine Verstärkung.
        // Die Mutations-Dispatches (selectMemory/deleteMemory/addLocalMemory) bleiben
        // erhalten — dort ist die Cross-Instanz-Synchronisation der eigentliche Zweck.
        fetchMemories(false);
        const savedId = !isDesktopTarget() && userData?.activeGradingMemoryId
            ? userData.activeGradingMemoryId
            : localStorage.getItem('koreki_active_grading_memory_id');
        if (savedId) setActiveMemoryId(savedId);
    }, [fetchMemories, userData?.activeGradingMemoryId]);

    useEffect(() => {
        const handleMemoriesChanged = () => {
            fetchMemories(false);
            const savedId = localStorage.getItem('koreki_active_grading_memory_id');
            setActiveMemoryId(savedId);
        };
        window.addEventListener('koreki-grading-memories-changed', handleMemoriesChanged);
        return () => {
            window.removeEventListener('koreki-grading-memories-changed', handleMemoriesChanged);
        };
    }, [fetchMemories]);

    const selectMemory = (id: string | null) => {
        setActiveMemoryId(id);
        if (id) {
            localStorage.setItem('koreki_active_grading_memory_id', id);
            const memory = memories.find(m => m.id === id);
            if (memory) {
                localStorage.setItem('koreki_active_grading_memory_name', memory.name);
                if (memory.cases) {
                    localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(memory.cases));
                }
            }
        } else {
            localStorage.removeItem('koreki_active_grading_memory_id');
            localStorage.removeItem('koreki_active_grading_memory_name');
            localStorage.removeItem('koreki_active_grading_memory_cases');
        }

        // Hybrid Sync (Arch §2): SaaS / Community -> DB Persistence
        if (!isDesktopTarget()) {
            apiClient.post('/api/user/update-grading-memory-profile', { gradingMemoryId: id })
                .then(() => {
                    queryClient.invalidateQueries(['user']);
                })
                .catch(err => console.error('[useGradingMemories] Failed to sync active grading memory to database', err));
        }

        window.dispatchEvent(new CustomEvent('koreki-grading-memories-changed', { detail: { origin: 'selectMemory' } }));
    };

    const deleteMemory = async (id: string) => {
        if (!window.confirm("Diesen Erfahrungsschatz wirklich dauerhaft löschen?")) return;

        if (isDesktopTarget()) {
            const list = readLocalArrayForUpdate<GradingMemory>(MEMORY_KEY).filter(m => m.id !== id);
            writeLocalArray(MEMORY_KEY, list);
            setMemories(list);
            if (activeMemoryId === id) selectMemory(null);
            window.dispatchEvent(new CustomEvent('koreki-grading-memories-changed', { detail: { origin: 'deleteMemory' } }));
            return;
        }

        try {
            const res = await apiClient.fetch(`/api/user/grading-memories?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchMemories(true);
                if (activeMemoryId === id) selectMemory(null);
            }
        } catch (err) {
            console.error('Delete grading memory failed', err);
        }
    };

    const addLocalMemory = (memory: GradingMemory) => {
        if (isDesktopTarget()) {
            const list = readLocalArrayForUpdate<GradingMemory>(MEMORY_KEY);
            // Namensgleichheit wie in der Rückfrage vor dem Überschreiben.
            const existingIdx = list.findIndex(m => (memory.id && m.id === memory.id) || isSameName(m.name, memory.name));
            if (existingIdx >= 0) {
                list[existingIdx] = memory;
            } else {
                list.push(memory);
            }
            writeLocalArray(MEMORY_KEY, list);
            setMemories(list);
            selectMemory(memory.id || null);
            window.dispatchEvent(new CustomEvent('koreki-grading-memories-changed', { detail: { origin: 'addLocalMemory' } }));
            return;
        }
        
        fetchMemories(true);
        selectMemory(memory.id || null);
    };

    const getActiveMemory = () => {
        return memories.find(m => m.id === activeMemoryId) || null;
    };

    return {
        memories,
        loading,
        activeMemoryId,
        selectMemory,
        deleteMemory,
        addLocalMemory,
        getActiveMemory,
        refreshMemories: fetchMemories
    };
};
export default useGradingMemories;
