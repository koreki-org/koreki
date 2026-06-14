import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { GradingMemory } from '../types';
import { isDesktopTarget } from '../lib/env-context';
import { apiClient } from '../lib/api-client';

/**
 * Custom hook for managing "Erfahrungsschätze" (GradingMemory Profiles)
 * Supports zero-latency client state sync with fallback for Tauri desktop.
 */
export const useGradingMemories = (userData?: any) => {
    const [memories, setMemories] = useState<GradingMemory[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const fetchMemories = useCallback(async () => {
        setLoading(true);
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_grading_memories');
            if (stored) {
                try {
                    const list = JSON.parse(stored);
                    setMemories(list);
                    
                    const savedId = localStorage.getItem('koreki_active_grading_memory_id');
                    if (savedId) {
                        const activeMem = list.find((m: any) => m.id === savedId);
                        if (activeMem) {
                            localStorage.setItem('koreki_active_grading_memory_name', activeMem.name);
                            if (activeMem.cases) {
                                localStorage.setItem('koreki_active_grading_memory_cases', JSON.stringify(activeMem.cases));
                            }
                        }
                    }
                } catch (e) {
                    setMemories([]);
                }
            }
            setLoading(false);
            return;
        }

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
        }
    }, [userData?.activeGradingMemoryId]);

    useEffect(() => {
        fetchMemories();
        const savedId = !isDesktopTarget() && userData?.activeGradingMemoryId 
            ? userData.activeGradingMemoryId 
            : localStorage.getItem('koreki_active_grading_memory_id');
        if (savedId) setActiveMemoryId(savedId);
    }, [fetchMemories, userData?.activeGradingMemoryId]);

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
    };

    const deleteMemory = async (id: string) => {
        if (!window.confirm("Diesen Erfahrungsschatz wirklich dauerhaft löschen?")) return;

        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_grading_memories');
            if (stored) {
                try {
                    let list = JSON.parse(stored);
                    list = list.filter((m: any) => m.id !== id);
                    localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));
                    setMemories(list);
                    if (activeMemoryId === id) selectMemory(null);
                } catch (e) {}
            }
            return;
        }

        try {
            const res = await apiClient.fetch(`/api/user/grading-memories?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchMemories();
                if (activeMemoryId === id) selectMemory(null);
            }
        } catch (err) {
            console.error('Delete grading memory failed', err);
        }
    };

    const addLocalMemory = (memory: GradingMemory) => {
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_grading_memories');
            let list: GradingMemory[] = [];
            if (stored) {
                try { list = JSON.parse(stored); } catch (e) {}
            }
            const existingIdx = list.findIndex(m => m.id === memory.id || m.name === memory.name);
            if (existingIdx >= 0) {
                list[existingIdx] = memory;
            } else {
                list.push(memory);
            }
            localStorage.setItem('koreki_local_grading_memories', JSON.stringify(list));
            setMemories(list);
            selectMemory(memory.id || null);
            return;
        }
        
        fetchMemories();
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
