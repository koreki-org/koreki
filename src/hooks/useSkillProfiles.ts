import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_SKILL_PROFILES } from '@/lib/ai/standard-skills-profiles';
import { findNameCollision } from '@/lib/local-vault';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';

/**
 * Deterministischer, Key-sortierter Objekt-Stringifier für robustes Dirty-Checking.
 */
export const sortObjectKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    return Object.keys(obj)
        .sort()
        .reduce((sorted: any, key) => {
            sorted[key] = sortObjectKeys(obj[key]);
            return sorted;
        }, {});
};

/**
 * Konsolidiert namensgleiche Skills (case-insensitiv & getrimmt) und leitet Duplikat-IDs um.
 */
export const deduplicateCustomSkills = (
    skills: Record<string, any>,
    activeIds?: string[]
): { cleaned: Record<string, any>; updatedActiveIds: string[] } => {
    const seenNames = new Map<string, string>(); // lowerName -> keptId
    const cleaned: Record<string, any> = {};
    const redirections = new Map<string, string>(); // duplicateId -> keptId

    Object.keys(skills).forEach(id => {
        const skill = skills[id];
        if (!skill || !skill.name) return;

        const cleanName = skill.name.trim();
        const lowerName = cleanName.toLowerCase();
        if (seenNames.has(lowerName)) {
            const keptId = seenNames.get(lowerName)!;
            redirections.set(id, keptId);
            return;
        }
        seenNames.set(lowerName, id);
        cleaned[id] = skill;
    });

    const updatedActiveIds = activeIds ? Array.from(new Set(
        activeIds.map(id => redirections.get(id) || id)
    )) : [];

    return { cleaned, updatedActiveIds };
};

/**
 * Industrial Skill Profile Hook
 * 🏮🛡️🏛️
 * Symmetrical to usePromptProfiles.ts. Handles database, local storage, and custom skills management.
 */
export const useSkillProfiles = (
    settings: AppSettings, 
    onSave: (newSettings: AppSettings, profileName?: string, profileId?: string) => void,
    onClose: () => void,
    currentProfileName: string = 'MINT Standard (Allgemein)'
) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>(currentProfileName);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    
    // Tracks currently checked/toggled skill IDs
    const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
    // Tracks the skill IDs from the last saved state of the active profile
    const [lastSavedSkillIds, setLastSavedSkillIds] = useState<string[]>([]);
    
    // Custom individual teacher skills list
    const [customSkills, setCustomSkills] = useState<Record<string, any>>({});

    const [saving, setSaving] = useState(false);
    const [showEditorMobile, setShowEditorMobile] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const selectedProfileData = profiles.find(p => p.name === selectedProfile);

    // Precise Custom Skills dirty checking (Stage 10 Parity with sorting protection)
    const currentProfileCustomSkills = Object.keys(customSkills)
        .filter(key => activeSkillIds.includes(key))
        .reduce((obj, key) => {
            obj[key] = customSkills[key];
            return obj;
        }, {} as Record<string, any>);

    const savedProfileCustomSkills = selectedProfileData?.customSkills && typeof selectedProfileData.customSkills === 'object'
        ? selectedProfileData.customSkills
        : {};

    const isCustomSkillsDirty = JSON.stringify(sortObjectKeys(currentProfileCustomSkills)) !== JSON.stringify(sortObjectKeys(savedProfileCustomSkills));
    const isDirty = JSON.stringify([...activeSkillIds].sort()) !== JSON.stringify([...lastSavedSkillIds].sort()) || isCustomSkillsDirty;
    const isSystemSelected = selectedProfileData?.isSystem || !!profiles.find(p => p.name === selectedProfile && p.isSystem);

    // Load custom skills on mount with self-healing deduplication
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('koreki_custom_skills');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    const { cleaned } = deduplicateCustomSkills(parsed);
                    setCustomSkills(cleaned);
                    localStorage.setItem('koreki_custom_skills', JSON.stringify(cleaned));
                } catch (e) { /* noop */ }
            }
        }
    }, []);

    const handleSaveCustomSkill = async (skill: any) => {
        // 1. Update global customSkills state & localStorage
        setCustomSkills(prev => {
            const updated = { ...prev, [skill.id]: skill };
            localStorage.setItem('koreki_custom_skills', JSON.stringify(updated));
            return updated;
        });

        // 2. Direct Sync and Persistence: Auto-save immediately to active profile
        const profile = profiles.find(p => p.name === selectedProfile);
        if (profile && !profile.isSystem) {
            const updatedProfileCustomSkills = {
                ...(profile.customSkills || {}),
                [skill.id]: skill
            };

            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_skill_profiles');
                let customProfiles: any[] = [];
                if (stored) {
                    try { customProfiles = JSON.parse(stored); } catch (e) {}
                }
                const existingIdx = customProfiles.findIndex(p => p.id === profile.id);
                if (existingIdx >= 0) {
                    customProfiles[existingIdx].customSkills = updatedProfileCustomSkills;
                    localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(customProfiles));
                }
            } else {
                try {
                    await apiClient.post('/api/user/skill-profiles', {
                        name: profile.name,
                        activeSkillIds: profile.activeSkillIds,
                        customSkills: updatedProfileCustomSkills
                    });
                } catch (e) {
                    console.error("[useSkillProfiles] Auto-save custom skill failed:", e);
                }
            }

            // Update profiles list state to prevent stale overwrite
            setProfiles(prev => prev.map(p => {
                if (p.id === profile.id) {
                    return { ...p, customSkills: updatedProfileCustomSkills };
                }
                return p;
            }));
        }

        // 3. Sync Bridge: Update active tasksLayout inline graphs immediately
        const store = useDashboardStore.getState();
        if (store.tasksLayout) {
            const updatedTasks = store.tasksLayout.map(t => {
                if (t.taskType === skill.id) {
                    return {
                        ...t,
                        gradingGraph: skill.gradingGraph
                    };
                }
                return t;
            });
            store.setTasksLayout(updatedTasks);
        }
    };

    const handleDeleteCustomSkill = async (id: string) => {
        // 1. Bereinige globalen customSkills State und localStorage
        setCustomSkills(prev => {
            const updated = { ...prev };
            delete updated[id];
            localStorage.setItem('koreki_custom_skills', JSON.stringify(updated));
            return updated;
        });
        
        // 2. Bereinige activeSkillIds State des aktuellen Profils
        const updatedActiveSkillIds = activeSkillIds.filter(sid => sid !== id);
        setActiveSkillIds(updatedActiveSkillIds);

        // 3. Globales Löschen aus allen benutzerdefinierten Profilen im State & Persistierung
        const updatedProfiles = profiles.map(p => {
            if (p.isSystem) return p;
            
            const profileCustomSkills = p.customSkills ? { ...p.customSkills } : {};
            let isChanged = false;
            if (profileCustomSkills[id]) {
                delete profileCustomSkills[id];
                isChanged = true;
            }
            
            let pActiveSkillIds = Array.isArray(p.activeSkillIds) ? [...p.activeSkillIds] : [];
            if (pActiveSkillIds.includes(id)) {
                pActiveSkillIds = pActiveSkillIds.filter((sid: any) => sid !== id);
                isChanged = true;
            }
            
            if (isChanged) {
                return {
                    ...p,
                    customSkills: profileCustomSkills,
                    activeSkillIds: pActiveSkillIds
                };
            }
            return p;
        });

        // 4. Speicher-Persistierung aller geänderten benutzerdefinierten Profile
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            if (stored) {
                try {
                    let customProfiles = JSON.parse(stored);
                    const updatedCustomProfiles = customProfiles.map((p: any) => {
                        const profileCustomSkills = p.customSkills ? { ...p.customSkills } : {};
                        let isChanged = false;
                        if (profileCustomSkills[id]) {
                            delete profileCustomSkills[id];
                            isChanged = true;
                        }
                        let pActiveSkillIds = Array.isArray(p.activeSkillIds) ? [...p.activeSkillIds] : [];
                        if (pActiveSkillIds.includes(id)) {
                            pActiveSkillIds = pActiveSkillIds.filter((sid: any) => sid !== id);
                            isChanged = true;
                        }
                        if (isChanged) {
                            return {
                                ...p,
                                customSkills: profileCustomSkills,
                                activeSkillIds: pActiveSkillIds
                            };
                        }
                        return p;
                    });
                    localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(updatedCustomProfiles));
                } catch (e) {}
            }
        } else {
            // SaaS/Community: Für jedes geänderte benutzerdefinierte Profil ein API-POST absetzen
            for (const p of updatedProfiles) {
                if (p.isSystem) continue;
                
                // Prüfen ob dieses Profil tatsächlich den gelöschten Skill enthielt
                const originalProfile = profiles.find(op => op.name === p.name);
                const hadSkill = originalProfile?.customSkills?.[id] || originalProfile?.activeSkillIds?.includes(id);
                
                if (hadSkill) {
                    try {
                        await apiClient.post('/api/user/skill-profiles', {
                            name: p.name,
                            activeSkillIds: p.activeSkillIds,
                            customSkills: p.customSkills
                        });
                    } catch (err) {
                        console.error(`Fehler beim Synchronisieren des gelöschten Skills im Profil ${p.name} in der DB:`, err);
                    }
                }
            }
        }

        // 5. Aktualisiere profiles State global, um das UI synchron zu halten
        setProfiles(updatedProfiles);
    };

    const fetchProfiles = useCallback(async () => {
        // Desktop App (Tauri) uses pure localStorage
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            let customProfiles = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            const allProfiles = [...STANDARD_SKILL_PROFILES, ...customProfiles];
            setProfiles(allProfiles);
            const current = allProfiles.find((p: any) => p.name === selectedProfile);
            if (current) {
                const skills = Array.isArray(current.activeSkillIds) ? current.activeSkillIds : [];
                
                // Hydrate custom skills from the loaded profile with self-healing deduplication
                if (current.customSkills && typeof current.customSkills === 'object') {
                    setCustomSkills(prev => {
                        const merged = { ...prev, ...current.customSkills };
                        const { cleaned, updatedActiveIds } = deduplicateCustomSkills(merged, skills);
                        localStorage.setItem('koreki_custom_skills', JSON.stringify(cleaned));
                        setActiveSkillIds(updatedActiveIds);
                        setLastSavedSkillIds(updatedActiveIds);
                        return cleaned;
                    });
                } else {
                    setActiveSkillIds(skills);
                    setLastSavedSkillIds(skills);
                }
            }
            return;
        }

        // Community Server & SaaS use the API
        try {
            const res = await apiClient.get('/api/user/skill-profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
                const current = data.find((p: any) => p.name === selectedProfile);
                if (current) {
                    const skills = Array.isArray(current.activeSkillIds) ? current.activeSkillIds : [];
                    
                    // Hydrate custom skills from the loaded profile with self-healing deduplication
                    if (current.customSkills && typeof current.customSkills === 'object') {
                        setCustomSkills(prev => {
                            const merged = { ...prev, ...current.customSkills };
                            const { cleaned, updatedActiveIds } = deduplicateCustomSkills(merged, skills);
                            localStorage.setItem('koreki_custom_skills', JSON.stringify(cleaned));
                            setActiveSkillIds(updatedActiveIds);
                            setLastSavedSkillIds(updatedActiveIds);
                            return cleaned;
                        });
                    } else {
                        setActiveSkillIds(skills);
                        setLastSavedSkillIds(skills);
                    }
                }
            }
        } catch (err) {
            console.error("Fehler beim Laden der Skill-Profile", err);
        }
    }, [selectedProfile]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    useEffect(() => {
        // If Standard is selected and we don't have active skills loaded yet, load them from presets
        if (selectedProfile && activeSkillIds.length === 0) {
            const current = profiles.find(p => p.name === selectedProfile);
            if (current) {
                const skills = Array.isArray(current.activeSkillIds) ? current.activeSkillIds : [];
                
                // Hydrate custom skills from the loaded profile with self-healing deduplication
                if (current.customSkills && typeof current.customSkills === 'object') {
                    setCustomSkills(prev => {
                        const merged = { ...prev, ...current.customSkills };
                        const { cleaned, updatedActiveIds } = deduplicateCustomSkills(merged, skills);
                        localStorage.setItem('koreki_custom_skills', JSON.stringify(cleaned));
                        setActiveSkillIds(updatedActiveIds);
                        setLastSavedSkillIds(updatedActiveIds);
                        return cleaned;
                    });
                } else {
                    setActiveSkillIds(skills);
                    setLastSavedSkillIds(skills);
                }
            }
        }
    }, [profiles, selectedProfile]);

    const handleSelectProfile = (profile: any) => {
        setIsCreatingNew(false);
        setSelectedProfile(profile.name);
        const skills = Array.isArray(profile.activeSkillIds) ? profile.activeSkillIds : [];
        setShowEditorMobile(true);
        
        // Hydrate custom skills immediately on manual select with self-healing deduplication
        if (profile.customSkills && typeof profile.customSkills === 'object') {
            setCustomSkills(prev => {
                const merged = { ...prev, ...profile.customSkills };
                const { cleaned, updatedActiveIds } = deduplicateCustomSkills(merged, skills);
                localStorage.setItem('koreki_custom_skills', JSON.stringify(cleaned));
                setActiveSkillIds(updatedActiveIds);
                setLastSavedSkillIds(updatedActiveIds);
                return cleaned;
            });
        } else {
            setActiveSkillIds(skills);
            setLastSavedSkillIds(skills);
        }
    };

    const handleStartNew = (initialSkills?: string[], initialName?: string) => {
        setIsCreatingNew(true);
        setSelectedProfile('');
        setActiveSkillIds(Array.isArray(initialSkills) ? initialSkills : []);
        setLastSavedSkillIds([]);
        setNewProfileName(initialName || "");
        setShowEditorMobile(true);
    };

    const handleImportParsedProfile = (parsed: { metadata: any; content?: string; correctionPrompt?: string }, isSingleSkill?: boolean) => {
        // Check if this is an individual skill import rather than a profile layout
        if (isSingleSkill || parsed.metadata?.type === 'skill' || parsed.metadata?.id?.startsWith('skill-') || parsed.metadata?.promptSnippet) {
            const promptText = parsed.metadata?.promptSnippet || parsed.metadata?.prompt || (typeof parsed.content === 'string' ? parsed.content : "");
            const newSkill = {
                id: parsed.metadata?.id || `custom-skill-${Date.now()}`,
                name: parsed.metadata?.name || "Importierter Skill",
                category: parsed.metadata?.category || "feedback",
                description: parsed.metadata?.description || "Über KEP-MD-1 importiert.",
                promptSnippet: promptText,
                isCustom: true
            };
            handleSaveCustomSkill(newSkill);
            // Auto check / enable
            setActiveSkillIds(prev => {
                if (prev.includes(newSkill.id)) return prev;
                return [...prev, newSkill.id];
            });
            alert(`Skill "${newSkill.name}" erfolgreich importiert und aktiviert!`);
            return;
        }

        if (parsed.metadata?.skills) {
            setIsCreatingNew(true);
            setSelectedProfile('');
            
            const importedSkills = Array.isArray(parsed.metadata.skills) ? parsed.metadata.skills : [];
            setActiveSkillIds(importedSkills);
            setLastSavedSkillIds([]);
            setNewProfileName(parsed.metadata.name || "Importiertes Skill-Profil");
            setShowEditorMobile(true);
            return;
        }

        alert("Warnung: Die importierte Datei enthält kein gültiges Skill-Set. Bitte nutze die Upload-Area für Skills rechts, wenn du einen einzelnen Skill importieren möchtest.");
    };

    const handleSaveToDB = async () => {
        const nameToSave = isCreatingNew ? newProfileName.trim() : selectedProfile;
        if (!nameToSave) {
            alert("Bitte gib einen Namen für das Skill-Profil ein.");
            return;
        }

        setSaving(true);
        
        // 1. Fetch freshest custom skills directly from localStorage to prevent stale state overwrites
        let freshCustomSkills = { ...customSkills };
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('koreki_custom_skills');
            if (stored) {
                try { freshCustomSkills = JSON.parse(stored); } catch (e) {}
            }
        }

        // 2. Filter to save ONLY the custom skills active in this profile (Stage 10 Parity)
        const activeCustomSkills = Object.keys(freshCustomSkills)
            .filter(key => activeSkillIds.includes(key))
            .reduce((obj, key) => {
                obj[key] = freshCustomSkills[key];
                return obj;
            }, {} as Record<string, any>);

        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            let customProfiles: any[] = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            const existingIdx = customProfiles.findIndex(p => p.name === nameToSave);
            if (existingIdx >= 0) {
                customProfiles[existingIdx].activeSkillIds = activeSkillIds;
                customProfiles[existingIdx].customSkills = activeCustomSkills;
            } else {
                customProfiles.push({
                    id: `local-skill-${Date.now()}`,
                    name: nameToSave,
                    activeSkillIds,
                    customSkills: activeCustomSkills,
                    isSystem: false
                });
            }
            localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(customProfiles));
            
            await fetchProfiles();
            setSelectedProfile(nameToSave);
            setLastSavedSkillIds(activeSkillIds);
            setIsCreatingNew(false);
            setNewProfileName('');
            alert("Skill-Profil erfolgreich lokal gespeichert!");
            setSaving(false);
            return;
        }

        try {
            const res = await apiClient.post('/api/user/skill-profiles', {
                name: nameToSave,
                activeSkillIds,
                customSkills: activeCustomSkills
            });

            const data = await res.json();

            if (res.ok) {
                await fetchProfiles();
                setSelectedProfile(data.name);
                setLastSavedSkillIds(Array.isArray(data.activeSkillIds) ? data.activeSkillIds : []);
                setIsCreatingNew(false);
                setNewProfileName('');
                alert("Skill-Profil erfolgreich gespeichert!");
            } else {
                alert(`Fehler: ${data.message || 'Speichern fehlgeschlagen'}`);
            }
        } catch (err) {
            console.error("Save Skill Error:", err);
            alert("Speichern fehlgeschlagen. Bitte prüfe deine Internetverbindung.");
        } finally {
            setSaving(false);
        }
    };

    const handleApplyToSession = () => {
        const profile = profiles.find(p => p.name === selectedProfile);
        const profileId = profile?.id || profile?.name;
        
        onSave({
            ...settings,
            activeSkillProfileId: profileId,
            activeSkillIds: activeSkillIds,
            customSkills: customSkills
        }, selectedProfile, profileId);
        
        // Zero-latency local storage persistence
        if (profileId) {
            localStorage.setItem('koreki_active_skill_profile_id', profileId);
        }
        onClose();
    };

    const handleDeleteProfile = async (id: string) => {
        if (!window.confirm("Dieses Skill-Profil wirklich dauerhaft löschen?")) return;
        
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            if (stored) {
                let customProfiles = JSON.parse(stored);
                customProfiles = customProfiles.filter((p: any) => p.id !== id);
                localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(customProfiles));
                await fetchProfiles();
                if (selectedProfileData?.id === id) {
                    setSelectedProfile(STANDARD_SKILL_PROFILES[0].name);
                    const standard = STANDARD_SKILL_PROFILES[0];
                    setActiveSkillIds(standard.activeSkillIds);
                    setLastSavedSkillIds(standard.activeSkillIds);
                }
            }
            return;
        }

        try {
            const res = await apiClient.fetch(`/api/user/skill-profiles?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchProfiles();
                if (selectedProfileData?.id === id) {
                    setSelectedProfile(STANDARD_SKILL_PROFILES[0].name);
                    const standard = STANDARD_SKILL_PROFILES[0];
                    setActiveSkillIds(standard.activeSkillIds);
                    setLastSavedSkillIds(standard.activeSkillIds);
                }
            }
        } catch (err) {
            alert("Löschen fehlgeschlagen.");
        }
    };

    const handleConfirmRename = async () => {
        if (!editingName.trim() || !editingProfileId) {
            setEditingProfileId(null);
            return;
        }

        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            if (stored) {
                let customProfiles = JSON.parse(stored);
                if (findNameCollision(customProfiles, editingProfileId, editingName)) {
                    alert('Ein Skill-Profil mit diesem Namen existiert bereits');
                    return;
                }
                customProfiles = customProfiles.map((p: any) =>
                    p.id === editingProfileId ? { ...p, name: editingName.trim() } : p
                );
                localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(customProfiles));
                const oldName = profiles.find(p => p.id === editingProfileId)?.name;
                await fetchProfiles();
                if (selectedProfile === oldName) {
                    setSelectedProfile(editingName.trim());
                }
                setEditingProfileId(null);
            }
            return;
        }

        try {
            const res = await apiClient.fetch('/api/user/skill-profiles', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingProfileId, newName: editingName.trim() })
            });

            if (res.ok) {
                const oldName = profiles.find(p => p.id === editingProfileId)?.name;
                await fetchProfiles();
                if (selectedProfile === oldName) {
                    setSelectedProfile(editingName.trim());
                }
                setEditingProfileId(null);
            } else {
                const data = await res.json();
                alert(data.message || "Fehler beim Umbenennen");
            }
        } catch (err) {
            alert("Netzwerkfehler beim Umbenennen.");
        }
    };

    return {
        profiles,
        selectedProfile,
        setSelectedProfile,
        isCreatingNew,
        setIsCreatingNew,
        newProfileName,
        setNewProfileName,
        activeSkillIds,
        setActiveSkillIds,
        lastSavedSkillIds,
        customSkills,
        handleSaveCustomSkill,
        handleDeleteCustomSkill,
        saving,
        showEditorMobile,
        setShowEditorMobile,
        editingProfileId,
        setEditingProfileId,
        editingName,
        setEditingName,
        isDirty,
        isSystemSelected,
        selectedProfileData,
        handleSelectProfile,
        handleStartNew,
        handleImportParsedProfile,
        handleSaveToDB,
        handleApplyToSession,
        handleDeleteProfile,
        handleConfirmRename
    };
};
