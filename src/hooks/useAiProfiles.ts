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
 * Seamlessly manages LocalStorage for Desktop/Offline and Postgres SQL DB for SaaS/Community modes.
 */
export const useAiProfiles = (
    settings: AppSettings,
    onSave: (newSettings: AppSettings, profileName?: string, profileId?: string) => void,
    onClose: () => void,
    currentProfileId: string = 'system-standard'
) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>(currentProfileId);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [saving, setSaving] = useState(false);

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

    const selectedProfileData = profiles.find(p => p.id === selectedProfileId);
    const isSystemSelected = selectedProfileId === 'system-standard' || selectedProfileData?.isSystem;

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
        if (isDesktopTarget()) {
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
                setProfiles([STANDARD_AI_PROFILE, ...data]);
            }
        } catch (err) {
            console.error("Fehler beim Laden der KI-Profile", err);
        }
    }, []);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const handleSelectProfile = (profile: any) => {
        setIsCreatingNew(false);
        setSelectedProfileId(profile.id);
        
        setTemperature(profile.temperature);
        setTopP(profile.topP);
        setMaxTokens(profile.maxTokens);
        setPresencePenalty(profile.presencePenalty);
        setEnableThinking(profile.enableThinking);

        setVisionTemperature(profile.visionTemperature);
        setVisionTopP(profile.visionTopP);
        setVisionMaxTokens(profile.visionMaxTokens);
        setVisionPresencePenalty(profile.visionPresencePenalty);
    };

    const handleStartNew = () => {
        setIsCreatingNew(true);
        setSelectedProfileId('');
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
    };

    const handleSaveProfile = async () => {
        const nameToSave = isCreatingNew ? newProfileName.trim() : selectedProfileData?.name;
        if (!nameToSave) {
            alert("Bitte gib einen Namen für das KI-Profil ein.");
            return;
        }

        setSaving(true);

        const payload = {
            id: isCreatingNew ? undefined : selectedProfileId,
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

        if (isDesktopTarget()) {
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
                await fetchProfiles();
                setSelectedProfileId(newId);
                setIsCreatingNew(false);
                setNewProfileName('');
            } else {
                const existingIdx = customProfiles.findIndex(p => p.id === selectedProfileId);
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
                setSelectedProfileId(data.id);
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

    const handleDeleteProfile = async (id: string) => {
        if (id === 'system-standard') return;
        if (!window.confirm("Dieses KI-Profil wirklich dauerhaft löschen?")) return;

        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_ai_profiles');
            if (stored) {
                let customProfiles = JSON.parse(stored);
                customProfiles = customProfiles.filter((p: any) => p.id !== id);
                localStorage.setItem('koreki_local_ai_profiles', JSON.stringify(customProfiles));
                await fetchProfiles();
                if (selectedProfileId === id) {
                    handleSelectProfile(STANDARD_AI_PROFILE);
                }
            }
            return;
        }

        try {
            const res = await apiClient.fetch(`/api/user/ai-profiles?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchProfiles();
                if (selectedProfileId === id) {
                    handleSelectProfile(STANDARD_AI_PROFILE);
                }
            }
        } catch (err) {
            alert("Löschen fehlgeschlagen.");
        }
    };

    const handleApplyToSession = () => {
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
            activeAiProfileId: selectedProfileId === 'system-standard' ? undefined : selectedProfileId
        }, selectedProfileData?.name || 'Koreki Standard', selectedProfileId);
        onClose();
    };

    return {
        profiles,
        selectedProfileId,
        selectedProfileData,
        isSystemSelected,
        isCreatingNew,
        setIsCreatingNew,
        newProfileName,
        setNewProfileName,
        saving,
        isDirty,
        
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
        handleApplyToSession
    };
};
