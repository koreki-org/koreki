import { useState, useEffect, useCallback } from 'react';
import { AppSettings } from '@/types';
import { isDesktopTarget, isLocalInstance } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { EXPERT_REGISTRY } from '@/prompts/expert-profiles';
import { readLocalArray, readLocalArrayForUpdate, writeLocalArray } from '@/lib/local-vault';

const PROFILE_KEY = 'koreki_local_profiles';
const AI_PROFILE_KEY = 'koreki_local_ai_profiles';

interface LocalPromptProfile {
    id: string;
    name: string;
    correctionPrompt: string;
    isSystem?: boolean;
}

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
    
    // --- KEP-MD-1 AI Profile Import State ---
    const [importedAiParams, setImportedAiParams] = useState<any>(null);
    const [createAiProfile, setCreateAiProfile] = useState(true);

    const isDirty = correctionPrompt !== lastSavedPrompt;
    const selectedProfileData = profiles.find(p => p.name === selectedProfile);
    const isSystemSelected = selectedProfileData?.isSystem || selectedProfile === 'Standard';

    const fetchProfiles = useCallback(async () => {
        // Desktop App (Tauri) uses pure localStorage
        if (isDesktopTarget()) {
            const customProfiles = readLocalArray<LocalPromptProfile>(PROFILE_KEY);
            const systemExperts = Object.values(EXPERT_REGISTRY).map(entry => ({
                id: entry.metadata.id,
                name: entry.metadata.name,
                isSystem: true,
                correctionPrompt: entry.promptSnippet
            }));
            const allProfiles = [...systemExperts, ...customProfiles];
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

    const handleStartNew = (initialPrompt?: string | any, initialName?: string) => {
        setIsCreatingNew(true);
        setSelectedProfile('');
        const promptString = typeof initialPrompt === 'string' ? initialPrompt : "Achte bei der Korrektur besonders auf...";
        setCorrectionPrompt(promptString);
        setLastSavedPrompt("");
        setNewProfileName(initialName || "");
        setShowEditorMobile(true);
    };

    const handleImportParsedProfile = (parsed: { metadata: any, correctionPrompt: string }) => {
        setIsCreatingNew(true);
        setSelectedProfile('');
        setCorrectionPrompt(parsed.correctionPrompt);
        setLastSavedPrompt("");
        setNewProfileName(parsed.metadata.name || "Importierter Prompt");
        setShowEditorMobile(true);

        // KEP-MD-1: AI Parameter Extraction
        const aiParams: any = {};
        const validKeys = ['temperature', 'topP', 'maxTokens', 'presencePenalty', 'enableThinking', 'visionTemperature', 'visionTopP', 'visionMaxTokens', 'visionPresencePenalty'];
        let hasParams = false;
        validKeys.forEach(k => {
            if (parsed.metadata[k] !== undefined) {
                aiParams[k] = parsed.metadata[k];
                hasParams = true;
            }
        });

        if (hasParams) {
            setImportedAiParams(aiParams);
            setCreateAiProfile(true);
        } else {
            setImportedAiParams(null);
            setCreateAiProfile(false);
        }
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
            const customProfiles = readLocalArrayForUpdate<LocalPromptProfile>(PROFILE_KEY);
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
            writeLocalArray(PROFILE_KEY, customProfiles);

            // Handle AI Profile Save
            if (createAiProfile && importedAiParams) {
                const customAiProfiles = readLocalArrayForUpdate<Record<string, unknown>>(AI_PROFILE_KEY);
                customAiProfiles.push({ id: `local-ai-${Date.now()}`, name: nameToSave, ...importedAiParams, isSystem: false });
                writeLocalArray(AI_PROFILE_KEY, customAiProfiles);
            }
            
            await fetchProfiles();
            setSelectedProfile(nameToSave);
            setLastSavedPrompt(correctionPrompt);
            setIsCreatingNew(false);
            setNewProfileName('');
            setImportedAiParams(null);
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
                // Handle AI Profile Save for SaaS / Server
                if (createAiProfile && importedAiParams) {
                    try {
                        await apiClient.post('/api/user/ai-profiles', {
                            name: nameToSave,
                            ...importedAiParams
                        });
                    } catch (e) {
                        console.error("AI Profile konnte nicht gespeichert werden", e);
                    }
                }

                await fetchProfiles();
                setSelectedProfile(data.name);
                setLastSavedPrompt(data.correctionPrompt);
                setIsCreatingNew(false);
                setNewProfileName('');
                setImportedAiParams(null);
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
        const profileId = profile?.id || profile?.name;
        onSave({
            ...settings,
            correctionPrompt,
            activePromptProfileId: profileId
        }, selectedProfile, profileId);
        // Hybrid Sync (Arch §2): Zero-latency unconditional local fallback
        if (profileId) {
            localStorage.setItem('koreki_active_prompt_profile_id', profileId);
        }
        onClose();
    };

    const handleDeleteProfile = async (id: string) => {
        if (!window.confirm("Dieses Profil wirklich dauerhaft löschen?")) return;
        
        if (isDesktopTarget()) {
            const remaining = readLocalArrayForUpdate<LocalPromptProfile>(PROFILE_KEY).filter(p => p.id !== id);
            writeLocalArray(PROFILE_KEY, remaining);
            await fetchProfiles();
            if (selectedProfileData?.id === id) {
                setSelectedProfile('Standard');
                const standard = profiles.find(p => p.name === 'Standard') || Object.values(EXPERT_REGISTRY)[0].promptSnippet;
                if (standard) {
                    setCorrectionPrompt(standard.correctionPrompt);
                    setLastSavedPrompt(standard.correctionPrompt);
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
            const renamed = readLocalArrayForUpdate<LocalPromptProfile>(PROFILE_KEY).map(p =>
                p.id === editingProfileId ? { ...p, name: editingName.trim() } : p
            );
            writeLocalArray(PROFILE_KEY, renamed);
            const oldName = profiles.find(p => p.id === editingProfileId)?.name;
            await fetchProfiles();
            if (selectedProfile === oldName) {
                setSelectedProfile(editingName.trim());
            }
            setEditingProfileId(null);
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
        importedAiParams,
        createAiProfile,
        setCreateAiProfile,
        handleSelectProfile,
        handleStartNew,
        handleImportParsedProfile,
        handleSaveToDB,
        handleApplyToSession,
        handleDeleteProfile,
        handleConfirmRename
    };
};
