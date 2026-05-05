import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_PROFILES } from '@/lib/ai/standard-profiles';

/**
 * Industrial Prompt Profile Hook (Stage 18)
 * 🏮🛡️🏛️
 * Unified hook for SaaS and Local modes.
 * The backend handles persistence (Prisma vs. Filesystem) transparently.
 */
export const usePromptProfiles = (
    settings: AppSettings, 
    onSave: (newSettings: AppSettings, profileName?: string, profileId?: string) => void,
    onClose: () => void,
    currentProfileName: string = 'Standard'
) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>(currentProfileName);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [correctionPrompt, setCorrectionPrompt] = useState<string>(
        typeof settings.correctionPrompt === 'string' ? settings.correctionPrompt : ''
    );
    const [lastSavedPrompt, setLastSavedPrompt] = useState<string>(
        typeof settings.correctionPrompt === 'string' ? settings.correctionPrompt : ''
    );
    const [saving, setSaving] = useState(false);
    const [showEditorMobile, setShowEditorMobile] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const isDirty = correctionPrompt !== lastSavedPrompt;
    const selectedProfileData = profiles.find(p => p.name === selectedProfile);
    const isSystemSelected = selectedProfileData?.isSystem || selectedProfile === 'Standard';

    const fetchProfiles = useCallback(async () => {
        // Desktop App (Tauri) uses pure localStorage
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_profiles');
            let customProfiles = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            const allProfiles = [...STANDARD_PROFILES, ...customProfiles];
            setProfiles(allProfiles);
            const current = allProfiles.find((p: any) => p.name === selectedProfile);
            if (current) setLastSavedPrompt(current.correctionPrompt);
            return;
        }

        // Community Server & SaaS use the API
        try {
            const res = await apiClient.get('/api/user/prompt-profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
                const current = data.find((p: any) => p.name === selectedProfile);
                if (current) setLastSavedPrompt(current.correctionPrompt);
            }
        } catch (err) {
            console.error("Fehler beim Laden der Profile", err);
        }
    }, [selectedProfile]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    useEffect(() => {
        if (selectedProfile === 'Standard' && !correctionPrompt) {
            const standardInDB = profiles.find(p => p.name === 'Standard');
            if (standardInDB) {
                setCorrectionPrompt(standardInDB.correctionPrompt);
            }
        }
    }, [profiles, selectedProfile, correctionPrompt]);

    const handleSelectProfile = (profile: any) => {
        setIsCreatingNew(false);
        setSelectedProfile(profile.name);
        setCorrectionPrompt(profile.correctionPrompt);
        setLastSavedPrompt(profile.correctionPrompt);
        setShowEditorMobile(true);
    };

    const handleStartNew = (initialPrompt?: string | any) => {
        setIsCreatingNew(true);
        setSelectedProfile('');
        const promptString = typeof initialPrompt === 'string' ? initialPrompt : "Achte bei der Korrektur besonders auf...";
        setCorrectionPrompt(promptString);
        setLastSavedPrompt("");
        setNewProfileName("");
        setShowEditorMobile(true);
    };

    const handleSaveToDB = async () => {
        const nameToSave = isCreatingNew ? newProfileName.trim() : selectedProfile;
        if (!nameToSave) {
            alert("Bitte gib einen Namen für das Profil ein.");
            return;
        }
        if (!correctionPrompt.trim()) {
            alert("Bitte gib erst deine pädagogischen Anweisungen ein.");
            return;
        }

        setSaving(true);
        
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_profiles');
            let customProfiles: any[] = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            const existingIdx = customProfiles.findIndex(p => p.name === nameToSave);
            if (existingIdx >= 0) {
                customProfiles[existingIdx].correctionPrompt = correctionPrompt;
            } else {
                customProfiles.push({
                    id: `local-${Date.now()}`,
                    name: nameToSave,
                    correctionPrompt,
                    isSystem: false
                });
            }
            localStorage.setItem('koreki_local_profiles', JSON.stringify(customProfiles));
            await fetchProfiles();
            setSelectedProfile(nameToSave);
            setLastSavedPrompt(correctionPrompt);
            setIsCreatingNew(false);
            setNewProfileName('');
            alert("Profil erfolgreich lokal gespeichert!");
            setSaving(false);
            return;
        }

        try {
            const res = await apiClient.post('/api/user/prompt-profiles', {
                name: nameToSave,
                correctionPrompt
            });

            const data = await res.json();

            if (res.ok) {
                await fetchProfiles();
                setSelectedProfile(data.name);
                setLastSavedPrompt(data.correctionPrompt);
                setIsCreatingNew(false);
                setNewProfileName('');
                alert("Profil erfolgreich gespeichert!");
            } else {
                alert(`Fehler: ${data.message || 'Speichern fehlgeschlagen'}`);
            }
        } catch (err) {
            console.error("Save Error:", err);
            alert("Speichern fehlgeschlagen. Bitte prüfe deine Internetverbindung oder ob der Server erreichbar ist.");
        } finally {
            setSaving(false);
        }
    };

    const handleApplyToSession = () => {
        const profile = profiles.find(p => p.name === selectedProfile);
        onSave({
            ...settings,
            correctionPrompt
        }, selectedProfile, profile?.id || profile?.name);
        onClose();
    };

    const handleDeleteProfile = async (id: string) => {
        if (!window.confirm("Dieses Profil wirklich dauerhaft löschen?")) return;
        
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_profiles');
            if (stored) {
                let customProfiles = JSON.parse(stored);
                customProfiles = customProfiles.filter((p: any) => p.id !== id);
                localStorage.setItem('koreki_local_profiles', JSON.stringify(customProfiles));
                await fetchProfiles();
                if (selectedProfileData?.id === id) {
                    setSelectedProfile('Standard');
                    const standard = profiles.find(p => p.name === 'Standard') || STANDARD_PROFILES[0];
                    if (standard) {
                        setCorrectionPrompt(standard.correctionPrompt);
                        setLastSavedPrompt(standard.correctionPrompt);
                    }
                }
            }
            return;
        }

        try {
            const res = await apiClient.fetch(`/api/user/prompt-profiles?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchProfiles();
                if (selectedProfileData?.id === id) {
                    setSelectedProfile('Standard');
                    const standard = profiles.find(p => p.name === 'Standard');
                    if (standard) {
                        setCorrectionPrompt(standard.correctionPrompt);
                        setLastSavedPrompt(standard.correctionPrompt);
                    }
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
            const stored = localStorage.getItem('koreki_local_profiles');
            if (stored) {
                let customProfiles = JSON.parse(stored);
                customProfiles = customProfiles.map((p: any) => 
                    p.id === editingProfileId ? { ...p, name: editingName.trim() } : p
                );
                localStorage.setItem('koreki_local_profiles', JSON.stringify(customProfiles));
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
            const res = await apiClient.fetch('/api/user/prompt-profiles', {
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
        correctionPrompt,
        setCorrectionPrompt,
        lastSavedPrompt,
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
        handleSaveToDB,
        handleApplyToSession,
        handleDeleteProfile,
        handleConfirmRename
    };
};
