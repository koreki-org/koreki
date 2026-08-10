import { useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings, AiProfile } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { findNameCollision } from '@/lib/local-vault';
import { isSameName, nameTakenMessage, overwriteQuestion, resolveProfileRef } from '@/lib/services/profile-naming';

/**
 * Standard default AI model profile values.
 */
export const STANDARD_AI_PROFILE: AiProfile & { isSystem: boolean } = {
    id: 'system-standard',
    name: 'Standard',
    temperature: 0.2,
    topP: 0.8,
    maxTokens: 32768,
    presencePenalty: 0.0,
    enableThinking: true,
    visionTemperature: 0.0,
    visionTopP: 0.8,
    visionMaxTokens: 16000,
    visionPresencePenalty: 0.0,
    ollamaNumCtx: 0,
    isSystem: true
};

export const MATH_AI_PROFILE: AiProfile & { isSystem: boolean } = {
    id: 'system-math',
    name: 'Logik & Mathe',
    temperature: 0.0,
    topP: 0.1,
    maxTokens: 32768,
    presencePenalty: 0.0,
    enableThinking: true,
    visionTemperature: 0.0,
    visionTopP: 0.5,
    visionMaxTokens: 16000,
    visionPresencePenalty: 0.0,
    ollamaNumCtx: 0,
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
    /** 🏮 Identitaet ueber die Kennung — Begruendung siehe useSkillProfiles. */
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [saving, setSaving] = useState(false);
    
    const [showEditorMobile, setShowEditorMobile] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Active tuning slider properties
    const [temperature, setTemperature] = useState(settings.temperature ?? 0.2);
    const [topP, setTopP] = useState(settings.topP ?? 0.8);
    const [maxTokens, setMaxTokensState] = useState(settings.maxTokens ?? 32768);
    const [presencePenalty, setPresencePenalty] = useState(settings.presencePenalty ?? 0.0);
    const [enableThinking, setEnableThinking] = useState(settings.enableThinking ?? true);

    const [visionTemperature, setVisionTemperature] = useState(settings.visionTemperature ?? 0.0);
    const [visionTopP, setVisionTopP] = useState(settings.visionTopP ?? 0.8);
    const [visionMaxTokens, setVisionMaxTokensState] = useState(settings.visionMaxTokens ?? 16000);
    const [visionPresencePenalty, setVisionPresencePenalty] = useState(settings.visionPresencePenalty ?? 0.0);
    
    const [ollamaNumCtx, setOllamaNumCtxState] = useState(settings.ollamaNumCtx ?? 0);

    const setMaxTokens = (val: number) => {
        setMaxTokensState(val);
        if (ollamaNumCtx > 0 && ollamaNumCtx < val + 4000) {
            setOllamaNumCtxState(val + 4000);
        }
    };

    const setVisionMaxTokens = (val: number) => {
        setVisionMaxTokensState(val);
        if (ollamaNumCtx > 0 && ollamaNumCtx < val + 4000) {
            setOllamaNumCtxState(val + 4000);
        }
    };

    const setOllamaNumCtx = (val: number) => {
        setOllamaNumCtxState(val);
        if (val > 0) {
            if (val < maxTokens + 4000) {
                setMaxTokensState(Math.max(2000, val - 4000));
            }
            if (val < visionMaxTokens + 4000) {
                setVisionMaxTokensState(Math.max(1000, val - 4000));
            }
        }
    };

    const selectedProfileData = profiles.find(p => p.id === selectedProfileId);
    /** Reine Anzeige. */
    const selectedProfile = selectedProfileData?.name || '';
    const isSystemSelected = !!selectedProfileData?.isSystem;

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
            visionPresencePenalty !== base.visionPresencePenalty ||
            ollamaNumCtx !== (base.ollamaNumCtx ?? 0)
        );
    })();

    const fetchProfiles = useCallback(async () => {
        if (isLocal) {
            const stored = localStorage.getItem('koreki_local_ai_profiles');
            let customProfiles = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            const allProfiles = [STANDARD_AI_PROFILE, MATH_AI_PROFILE, ...customProfiles];
            setProfiles(allProfiles);
            return;
        }

        try {
            const res = await apiClient.get('/api/user/ai-profiles');
            if (res.ok) {
                const data = await res.json();
                
                if (Array.isArray(data)) {
                    setProfiles([STANDARD_AI_PROFILE, MATH_AI_PROFILE, ...data]);
                } else {
                    setProfiles([STANDARD_AI_PROFILE, MATH_AI_PROFILE]);
                }
            }
        } catch (err) {
            console.error("Fehler beim Laden der KI-Profile", err);
        }
    }, [isLocal]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    const hasHydratedRef = useRef(false);

    // Initial Hydration matching settings.activeAiProfileId
    useEffect(() => {
        if (profiles.length > 0 && !hasHydratedRef.current) {
            const found = resolveProfileRef<any>(profiles, settings.activeAiProfileId || currentProfileId);
            if (found) {
                setSelectedProfileId(found.id);
                setTemperature(found.temperature);
                setTopP(found.topP);
                setMaxTokensState(found.maxTokens);
                setPresencePenalty(found.presencePenalty);
                setEnableThinking(found.enableThinking);
                setVisionTemperature(found.visionTemperature);
                setVisionTopP(found.visionTopP);
                setVisionMaxTokensState(found.visionMaxTokens);
                setVisionPresencePenalty(found.visionPresencePenalty);
                setOllamaNumCtxState(found.ollamaNumCtx ?? 0);
            }
            hasHydratedRef.current = true;
        }
    }, [profiles, settings.activeAiProfileId, currentProfileId]);

    const handleSelectProfile = (profile: any) => {
        setIsCreatingNew(false);
        setSelectedProfileId(profile.id);

        setTemperature(profile.temperature);
        setTopP(profile.topP);
        setMaxTokensState(profile.maxTokens);
        setPresencePenalty(profile.presencePenalty);
        setEnableThinking(profile.enableThinking);

        setVisionTemperature(profile.visionTemperature);
        setVisionTopP(profile.visionTopP);
        setVisionMaxTokensState(profile.visionMaxTokens);
        setVisionPresencePenalty(profile.visionPresencePenalty);
        setOllamaNumCtxState(profile.ollamaNumCtx ?? 0);
        setShowEditorMobile(true);
    };

    const handleStartNew = (template?: any) => {
        setIsCreatingNew(true);
        setSelectedProfileId('');

        if (template) {
            setNewProfileName(`Kopie von ${template.name}`);
            setTemperature(template.temperature ?? 0.2);
            setTopP(template.topP ?? 0.8);
            setMaxTokensState(template.maxTokens ?? 32768);
            setPresencePenalty(template.presencePenalty ?? 0.0);
            setEnableThinking(template.enableThinking ?? true);

            setVisionTemperature(template.visionTemperature ?? 0.0);
            setVisionTopP(template.visionTopP ?? 0.8);
            setVisionMaxTokensState(template.visionMaxTokens ?? 16000);
            setVisionPresencePenalty(template.visionPresencePenalty ?? 0.0);
            setOllamaNumCtxState(template.ollamaNumCtx ?? 0);
        } else {
            setNewProfileName('');
            // Reset settings to default values for a clean start
            setTemperature(0.2);
            setTopP(0.8);
            setMaxTokensState(32768);
            setPresencePenalty(0.0);
            setEnableThinking(true);

            setVisionTemperature(0.0);
            setVisionTopP(0.8);
            setVisionMaxTokensState(16000);
            setVisionPresencePenalty(0.0);
            setOllamaNumCtxState(0);
        }
        setShowEditorMobile(true);
    };

    const handleSaveProfile = async () => {
        // Beim Bearbeiten entscheidet die Kennung, nicht der Name.
        let zielId = isCreatingNew ? '' : selectedProfileId;
        const nameToSave = isCreatingNew ? newProfileName.trim() : (selectedProfileData?.name || '');
        if (!nameToSave) {
            alert("Bitte gib einen Namen für das KI-Profil ein.");
            return;
        }

        // Dieselbe Regel wie bei Skill-Sets und Experten-Profilen. Sie fehlte
        // hier: In SaaS und Community endete das Anlegen unter vergebenem Namen
        // in der Eindeutigkeits-Sperre der Datenbank, im Desktop-Modus entstand
        // ungefragt eine namensgleiche Dublette.
        if (isCreatingNew) {
            if (profiles.some(p => p.isSystem && isSameName(p.name, nameToSave))) {
                alert('Dieser Name gehört zu einer System-Vorlage. Bitte wähle einen anderen Namen.');
                return;
            }

            const belegt = profiles.find(p => !p.isSystem && isSameName(p.name, nameToSave));
            if (belegt) {
                if (!window.confirm(overwriteQuestion('KI-Profil', nameToSave))) return;
                // Zugesagtes Überschreiben heisst: den bestehenden Datensatz
                // treffen, nicht einen zweiten daneben legen.
                zielId = belegt.id;
            }
        }

        setSaving(true);

        const payload = {
            id: zielId || undefined,
            name: nameToSave,
            temperature,
            topP,
            maxTokens,
            presencePenalty,
            enableThinking,
            visionTemperature,
            visionTopP,
            visionMaxTokens,
            visionPresencePenalty,
            ollamaNumCtx
        };

        if (isLocal) {
            const stored = localStorage.getItem('koreki_local_ai_profiles');
            let customProfiles: any[] = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }

            // Ueber die Kennung statt ueber den Namen — ein gleichnamiges Profil
            // kann das bearbeitete nicht mehr verdraengen. `zielId` ist gesetzt,
            // wenn ein bestehendes Profil bearbeitet ODER sein Ueberschreiben
            // zugesagt wurde.
            const existingIdx = zielId ? customProfiles.findIndex(p => p.id === zielId) : -1;

            let gespeicherteId = zielId;
            if (existingIdx >= 0) {
                customProfiles[existingIdx] = {
                    ...customProfiles[existingIdx],
                    ...payload,
                    name: nameToSave
                };
            } else {
                gespeicherteId = `local-ai-${Date.now()}`;
                customProfiles.push({
                    ...payload,
                    id: gespeicherteId,
                    name: nameToSave,
                    isSystem: false
                });
            }

            localStorage.setItem('koreki_local_ai_profiles', JSON.stringify(customProfiles));
            setIsCreatingNew(false);
            setNewProfileName('');
            setSelectedProfileId(gespeicherteId);
            await fetchProfiles();
            alert("KI-Profil erfolgreich lokal gespeichert!");
            setSaving(false);
            return;
        }

        try {
            const res = await apiClient.post('/api/user/ai-profiles', payload);
            const data = await res.json();

            if (res.ok) {
                setSelectedProfileId(data.id);
                await fetchProfiles();
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
        const profile = profiles.find(p => p.id === id);
        if (profile?.isSystem) return;
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
                if (findNameCollision(customProfiles, editingProfileId, editingName)) {
                    alert(nameTakenMessage('KI-Profil'));
                    return;
                }
                customProfiles = customProfiles.map((p: any) =>
                    p.id === editingProfileId ? { ...p, name: editingName.trim() } : p
                );
                localStorage.setItem('koreki_local_ai_profiles', JSON.stringify(customProfiles));
                // Die Auswahl haengt an der Kennung — kein Nachziehen noetig.
                await fetchProfiles();
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
                await fetchProfiles();
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
        const profile = selectedProfileData;
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
            ollamaNumCtx,
            activeAiProfileId: !profile || profile.id === 'system-standard' ? undefined : profile.id
        }, selectedProfile, profile?.id || 'system-standard');
        onClose();
    };

    useEffect(() => {
        if (settings.provider === 'ollama' || settings.provider === 'openai-compatible') {
            // For Ollama / openai-compatible: enforce a minimum of 0.2 to avoid instability.
            // Users can raise this freely in the AI params modal.
            if (temperature < 0.2) setTemperature(0.2);
            if (visionTemperature < 0.2) setVisionTemperature(0.2);
        }
    }, [settings.provider, temperature, visionTemperature]);

    return {
        profiles,
        /** Kennung des gewaehlten KI-Profils — die Identitaet. */
        selectedProfileId,
        /** Name des gewaehlten KI-Profils — reine Anzeige. */
        selectedProfile,
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
        
        ollamaNumCtx, setOllamaNumCtx,

        handleSelectProfile,
        handleStartNew,
        handleSaveProfile,
        handleDeleteProfile,
        handleConfirmRename,
        handleApplyToSession
    };
};
