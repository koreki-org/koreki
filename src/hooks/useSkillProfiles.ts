import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_SKILL_PROFILES } from '@/lib/ai/standard-skills-profiles';

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

    const isDirty = JSON.stringify([...activeSkillIds].sort()) !== JSON.stringify([...lastSavedSkillIds].sort());
    const selectedProfileData = profiles.find(p => p.name === selectedProfile);
    const isSystemSelected = selectedProfileData?.isSystem || selectedProfile.includes('Standard') || selectedProfile.includes('Standard (Allgemein)') || selectedProfile.includes('Realschule') || selectedProfile.includes('Gymnasium') || selectedProfile.includes('Standard (MINT & Feedback)') || selectedProfile.includes('Sprachfächer Standard') || selectedProfile.includes('Kulante Bewertung') || selectedProfile.includes('Grundschule') || selectedProfile.includes('Grundschule Mathematik');

    // Load custom skills on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('koreki_custom_skills');
            if (stored) {
                try {
                    setCustomSkills(JSON.parse(stored));
                } catch (e) { /* noop */ }
            }
        }
    }, []);

    const handleSaveCustomSkill = (skill: any) => {
        setCustomSkills(prev => {
            const updated = { ...prev, [skill.id]: skill };
            localStorage.setItem('koreki_custom_skills', JSON.stringify(updated));
            return updated;
        });
    };

    const handleDeleteCustomSkill = (id: string) => {
        setCustomSkills(prev => {
            const updated = { ...prev };
            delete updated[id];
            localStorage.setItem('koreki_custom_skills', JSON.stringify(updated));
            return updated;
        });
        setActiveSkillIds(prev => prev.filter(sid => sid !== id));
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
                setActiveSkillIds(skills);
                setLastSavedSkillIds(skills);
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
                    setActiveSkillIds(skills);
                    setLastSavedSkillIds(skills);
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
                setActiveSkillIds(skills);
                setLastSavedSkillIds(skills);
            }
        }
    }, [profiles, selectedProfile]);

    const handleSelectProfile = (profile: any) => {
        setIsCreatingNew(false);
        setSelectedProfile(profile.name);
        const skills = Array.isArray(profile.activeSkillIds) ? profile.activeSkillIds : [];
        setActiveSkillIds(skills);
        setLastSavedSkillIds(skills);
        setShowEditorMobile(true);
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
        if (isSingleSkill || parsed.metadata?.type === 'skill' || parsed.metadata?.promptSnippet || parsed.metadata?.prompt) {
            const promptText = parsed.metadata?.promptSnippet || parsed.metadata?.prompt || parsed.correctionPrompt || parsed.content || "";
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
        
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            let customProfiles: any[] = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            const existingIdx = customProfiles.findIndex(p => p.name === nameToSave);
            if (existingIdx >= 0) {
                customProfiles[existingIdx].activeSkillIds = activeSkillIds;
            } else {
                customProfiles.push({
                    id: `local-skill-${Date.now()}`,
                    name: nameToSave,
                    activeSkillIds,
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
                activeSkillIds
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
