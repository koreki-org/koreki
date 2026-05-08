import { useState, useEffect, useCallback } from 'react';
import { AppSettings, AiProfile } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';

/**
 * Standard default AI model profile values.
 */
export const STANDARD_AI_PROFILE: AiProfile & { isSystem: boolean } = {
    id: 'system-standard',
    name: 'Koreki Standard',
    temperature: 0.7,
    topP: 0.8,
    maxTokens: 32768,
    presencePenalty: 0.0,
    enableThinking: false,
    visionTemperature: 0.2,
    visionTopP: 0.8,
    visionMaxTokens: 4000,
    visionPresencePenalty: 0.0,
    isSystem: true
};

/**
 * Unified state hook for saving and loading custom AI parameters.
 * Seamlessly manages LocalStorage for Desktop/Offline/Local-Dev and Postgres SQL DB for SaaS modes.
 * Detects local instance status dynamically from api-controller data structures.
 */
export const useAiProfiles = (
    settings: AppSettings,
    onSave: (newSettings: AppSettings, profileName?: string, profileId?: string) => void,
    onClose: () => void,
    currentProfileId: string = 'system-standard'
) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<string>('Koreki Standard');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [saving, setSaving] = useState(false);
    
    const [showEditorMobile, setShowEditorMobile] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Active tuning slider properties
    const [temperature, setTemperature] = useState(settings.temperature ?? 0.7);
    const [topP, setTopP] = useState(settings.topP ?? 0.8);
    const [maxTokens, setMaxTokens] = useState(settings.maxTokens ?? 32768);
    const [presencePenalty, setPresencePenalty] = useState(settings.presencePenalty ?? 0.0);
    const [enableThinking, setEnableThinking] = useState(settings.enableThinking ?? false);

    const [visionTemperature, setVisionTemperature] = useState(settings.visionTemperature ?? 0.2);
    const [visionTopP, setVisionTopP] = useState(settings.visionTopP ?? 0.8);
    const [visionMaxTokens, setVisionMaxTokens] = useState(settings.visionMaxTokens ?? 4000);
    const [visionPresencePenalty, setVisionPresencePenalty] = useState(settings.visionPresencePenalty ?? 0.0);

    const selectedProfileData = profiles.find(p => p.name === selectedProfile);
    const isSystemSelected = selectedProfile === 'Koreki Standard' || selectedProfileData?.isSystem;

    const isLocal = isDesktopTarget();

    // Compare current state parameters to loaded baseline to detect unsaved changes
    const isDirty = (() => {
        const base = selectedProfileData || STANDARD_AI_PROFILE;
        return (
            temperature !== base.temperature ||
            topP !== base.topP ||
            maxTokens !== base.maxTokens ||
            presencePenalty !== base.presencePenalty ||
            enableThinking !== base.enableThinking ||
            visionTemperature !== base.visionTemperature ||
            visionTopP !== base.visionTopP ||
            visionMaxTokens !== base.visionMaxTokens ||
            visionPresencePenalty !== base.visionPresencePenalty
        );
    })();

    const fetchProfiles = useCallback(async () => {
        if (isLocal) {
            const stored = localStorage.getItem('koreki_local_ai_profiles');
            let customProfiles = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            const allProfiles = [STANDARD_AI_PROFILE, ...customProfiles];
            setProfiles(allProfiles);
            return;
        }

        try {
            const res = await apiClient.get('/api/user/ai-profiles');
            if (res.ok) {
                const data = await res.json();
                
                if (Array.isArray(data)) {
                    setProfiles([STANDARD_AI_PROFILE, ...data]);
                } else {
                    setProfiles([STANDARD_AI_PROFILE]);
                }
            }
        } catch (err) {
            console.error("Fehler beim Laden der KI-Profile", err);
        }
    }, [isLocal]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    // Initial Hydration matching settings.activeAiProfileId
    useEffect(() => {
        if (profiles.length > 0) {
            const activeId = settings.activeAiProfileId || currentProfileId;
            const found = profiles.find(p => p.id === activeId || p.name === activeId);
            if (found) {
                setSelectedProfile(found.name);
                setTemperature(found.temperature);
                setTopP(found.topP);
                setMaxTokens(found.maxTokens);
                setPresencePenalty(found.presencePenalty);
                setEnableThinking(found.enableThinking);
                setVisionTemperature(found.visionTemperature);
                setVisionTopP(found.visionTopP);
                setVisionMaxTokens(found.visionMaxTokens);
                setVisionPresencePenalty(found.visionPresencePenalty);
            }
        }
    }, [profiles, settings.activeAiProfileId]);

    const handleSelectProfile = (profile: any) => {
        setIsCreatingNew(false);
        setSelectedProfile(profile.name);
        
        setTemperature(profile.temperature);
        setTopP(profile.topP);
        setMaxTokens(profile.maxTokens);
        setPresencePenalty(profile.presencePenalty);
        setEnableThinking(profile.enableThinking);

        setVisionTemperature(profile.visionTemperature);
        setVisionTopP(profile.visionTopP);
        setVisionMaxTokens(profile.visionMaxTokens);
        setVisionPresencePenalty(profile.visionPresencePenalty);
        setShowEditorMobile(true);
    };

    const handleStartNew = () => {
        setIsCreatingNew(true);
        setSelectedProfile('');
        setNewProfileName('');
        
        // Reset settings to default values for a clean start
        setTemperature(0.7);
        setTopP(0.8);
        setMaxTokens(32768);
        setPresencePenalty(0.0);
        setEnableThinking(false);

        setVisionTemperature(0.2);
        setVisionTopP(0.8);
        setVisionMaxTokens(4000);
        setVisionPresencePenalty(0.0);
        setShowEditorMobile(true);
    };

    const handleSaveProfile = async () => {
        const nameToSave = isCreatingNew ? newProfileName.trim() : selectedProfile;
        if (!nameToSave) {
            alert("Bitte gib einen Namen für das KI-Profil ein.");
            return;
        }

        setSaving(true);

        const payload = {
            id: isCreatingNew ? undefined : selectedProfileData?.id,
            name: nameToSave,
            temperature,
            topP,
            maxTokens,
            presencePenalty,
            enableThinking,
            visionTemperature,
            visionTopP,
            visionMaxTokens,
            visionPresencePenalty
        };

        if (isLocal) {
            const stored = localStorage.getItem('koreki_local_ai_profiles');
            let customProfiles: any[] = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }

            if (isCreatingNew) {
                const newId = `local-ai-${Date.now()}`;
                customProfiles.push({
                    ...payload,
                    id: newId,
                    isSystem: false
                });
                localStorage.setItem('koreki_local_ai_profiles', JSON.stringify(customProfiles));
                setIsCreatingNew(false);
                setNewProfileName('');
                await fetchProfiles();
                setSelectedProfile(nameToSave);
            } else {
                const existingIdx = customProfiles.findIndex(p => p.name === selectedProfile);
                if (existingIdx >= 0) {
                    customProfiles[existingIdx] = {
                        ...customProfiles[existingIdx],
                        ...payload
                    };
                    localStorage.setItem('koreki_local_ai_profiles', JSON.stringify(customProfiles));
                    await fetchProfiles();
                }
            }
            alert("KI-Profil erfolgreich lokal gespeichert!");
            setSaving(false);
            return;
        }

        try {
            const res = await apiClient.post('/api/user/ai-profiles', payload);
            const data = await res.json();

            if (res.ok) {
                await fetchProfiles();
                setSelectedProfile(data.name);
                setIsCreatingNew(false);
                setNewProfileName('');
                alert("KI-Profil erfolgreich gespeichert!");
            } else {
                alert(`Fehler: ${data.message || 'Speichern fehlgeschlagen'}`);
            }
        } catch (err) {
            console.error("Save AI Profile Error:", err);
            alert("Speichern fehlgeschlagen. Bitte Internetverbindung prüfen.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProfile = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (id === 'system-standard') return;
        if (!window.confirm("Dieses KI-Profil wirklich dauerhaft löschen?")) return;

        if (isLocal) {
            const stored = localStorage.getItem('koreki_local_ai_profiles');
            if (stored) {
                let customProfiles = JSON.parse(stored);
                customProfiles = customProfiles.filter((p: any) => p.id !== id);
                localStorage.setItem('koreki_local_ai_profiles', JSON.stringify(customProfiles));
                await fetchProfiles();
                if (selectedProfileData?.id === id) {
                    handleSelectProfile(STANDARD_AI_PROFILE);
                }
            }
            return;
        }

        try {
            const res = await apiClient.fetch(`/api/user/ai-profiles?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchProfiles();
                if (selectedProfileData?.id === id) {
                    handleSelectProfile(STANDARD_AI_PROFILE);
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

        if (isLocal) {
            const stored = localStorage.getItem('koreki_local_ai_profiles');
            if (stored) {
                let customProfiles = JSON.parse(stored);
                customProfiles = customProfiles.map((p: any) => 
                    p.id === editingProfileId ? { ...p, name: editingName.trim() } : p
                );
                localStorage.setItem('koreki_local_ai_profiles', JSON.stringify(customProfiles));
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
            const res = await apiClient.fetch('/api/user/ai-profiles', {
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

    const handleApplyToSession = () => {
        const profile = profiles.find(p => p.name === selectedProfile);
        onSave({
            ...settings,
            temperature,
            topP,
            maxTokens,
            presencePenalty,
            enableThinking,
            visionTemperature,
            visionTopP,
            visionMaxTokens,
            visionPresencePenalty,
            activeAiProfileId: !profile || profile.id === 'system-standard' ? undefined : profile.id
        }, selectedProfile, profile?.id || 'system-standard');
        onClose();
    };

    return {
        profiles,
        selectedProfile,
        setSelectedProfile,
        selectedProfileData,
        isSystemSelected,
        isCreatingNew,
        setIsCreatingNew,
        newProfileName,
        setNewProfileName,
        saving,
        isDirty,
        
        showEditorMobile,
        setShowEditorMobile,
        editingProfileId,
        setEditingProfileId,
        editingName,
        setEditingName,

        temperature, setTemperature,
        topP, setTopP,
        maxTokens, setMaxTokens,
        presencePenalty, setPresencePenalty,
        enableThinking, setEnableThinking,
        
        visionTemperature, setVisionTemperature,
        visionTopP, setVisionTopP,
        visionMaxTokens, setVisionMaxTokens,
        visionPresencePenalty, setVisionPresencePenalty,

        handleSelectProfile,
        handleStartNew,
        handleSaveProfile,
        handleDeleteProfile,
        handleConfirmRename,
        handleApplyToSession
    };
};
