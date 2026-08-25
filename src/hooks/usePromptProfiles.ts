import { useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings } from '@/types';
import { isDesktopTarget, isLocalInstance } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { EXPERT_REGISTRY } from '@/prompts/expert-profiles';
import { readLocalArray, readLocalArrayForUpdate, writeLocalArray } from '@/lib/local-vault';
import { isSameName, nameTakenMessage, resolveProfileRef } from '@/lib/services/profile-naming';
import { askConfirmation, confirmOverwrite } from '@/lib/confirm-dialog';
import { createProfileStore } from '@/lib/services/profile-store';
import { toErrorMessage } from '@/lib/error-message';

/** Kennung der Standard-Vorlage aus der Experten-Registry. */
const DEFAULT_EXPERT_PROFILE_ID = 'id-standard';

const PROFILE_KEY = 'koreki_local_profiles';

/** Ablage der Experten-Profile — Desktop wie Server, siehe profile-store. */
const promptProfileStore = createProfileStore<LocalPromptProfile>({
    speicherSchluessel: PROFILE_KEY,
    endpunkt: '/api/user/prompt-profiles',
    idPraefix: 'local'
});
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
    /** Verweis auf das aktive Profil — Kennung ODER Name (Altbestand). */
    currentProfileRef: string = DEFAULT_EXPERT_PROFILE_ID
) => {
    const [profiles, setProfiles] = useState<any[]>([]);
    /** 🏮 Identitaet ueber die Kennung — Begruendung siehe useSkillProfiles. */
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
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
    const selectedProfileData = profiles.find(p => p.id === selectedProfileId);
    /** Reine Anzeige. */
    const selectedProfile = selectedProfileData?.name || '';
    const isSystemSelected = !!selectedProfileData?.isSystem;

    // Auswahl und Anlege-Modus werden ueber Referenzen gelesen, nicht ueber
    // Abhaengigkeiten. Sonst entsteht ein Effekt, der seine eigene Abhaengigkeit
    // veraendert: `uebernehmeProfile` haengt an `selectedProfileId`, also auch
    // `fetchProfiles`, also feuert der Lade-Effekt erneut — und schreibt dabei
    // genau diese Auswahl.
    const auswahlRef = useRef(selectedProfileId);
    const legtNeuAnRef = useRef(isCreatingNew);
    useEffect(() => { auswahlRef.current = selectedProfileId; }, [selectedProfileId]);
    useEffect(() => { legtNeuAnRef.current = isCreatingNew; }, [isCreatingNew]);

    /** Setzt die Liste und richtet die Auswahl auf den Verweis des Aufrufers aus. */
    const uebernehmeProfile = useCallback((alle: any[]) => {
        setProfiles(alle);

        // Waehrend ein neues Profil entsteht, darf ein Nachladen die Auswahl
        // NICHT zurueckstellen. Sonst steht der kopierte Prompt neben dem
        // `lastSavedPrompt` eines fremden Profils: die Ansicht zeigt das falsche
        // Profil als "ungespeichert", und Speichern ueberschreibt es.
        if (legtNeuAnRef.current) return;

        const current = resolveProfileRef<any>(alle, auswahlRef.current || currentProfileRef);
        if (current) {
            setSelectedProfileId(current.id);
            setLastSavedPrompt(current.correctionPrompt);
        }
    }, [currentProfileRef]);

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
            uebernehmeProfile([...systemExperts, ...customProfiles]);
            return;
        }

        // Community Server & SaaS use the API
        try {
            const res = await apiClient.get('/api/user/prompt-profiles');
            if (res.ok) {
                uebernehmeProfile(await res.json());
            }
        } catch (err) {
            console.error("Fehler beim Laden der Profile", err);
        }
    }, [uebernehmeProfile]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    useEffect(() => {
        // Der Vergleich lief zuvor gegen den Namen 'Standard' — den es gar nicht
        // gibt (die Vorlage heisst "Allgemeine Korrektur"). Ueber die Kennung
        // greift der Rueckfall jetzt tatsaechlich.
        if (selectedProfileId === DEFAULT_EXPERT_PROFILE_ID && !correctionPrompt && selectedProfileData) {
            setCorrectionPrompt(selectedProfileData.correctionPrompt);
        }
    }, [selectedProfileId, selectedProfileData, correctionPrompt]);

    const handleSelectProfile = (profile: any) => {
        setIsCreatingNew(false);
        setSelectedProfileId(profile.id);
        setCorrectionPrompt(profile.correctionPrompt);
        setLastSavedPrompt(profile.correctionPrompt);
        setShowEditorMobile(true);
    };

    const handleStartNew = (initialPrompt?: string | any, initialName?: string) => {
        setIsCreatingNew(true);
        setSelectedProfileId('');
        const promptString = typeof initialPrompt === 'string' ? initialPrompt : "Achte bei der Korrektur besonders auf...";
        setCorrectionPrompt(promptString);
        setLastSavedPrompt("");
        setNewProfileName(initialName || "");
        setShowEditorMobile(true);
    };

    const handleImportParsedProfile = (parsed: { metadata: any, correctionPrompt: string }) => {
        setIsCreatingNew(true);
        setSelectedProfileId('');
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
        // Beim Bearbeiten entscheidet die Kennung, nicht der Name.
        const zielId = isCreatingNew ? '' : selectedProfileId;
        const nameToSave = isCreatingNew ? newProfileName.trim() : (selectedProfileData?.name || '');
        if (!nameToSave) {
            alert("Bitte gib einen Namen für das Profil ein.");
            return;
        }
        if (!correctionPrompt.trim()) {
            alert("Bitte gib erst deine pädagogischen Anweisungen ein.");
            return;
        }

        // Nur fürs Neuanlegen — das Speichern eines gewählten Profils ist der
        // reguläre Aktualisierungspfad (System-Vorlagen inklusive, die in SaaS
        // ein ADMIN bearbeiten darf). Siehe useSkillProfiles.
        if (isCreatingNew) {
            if (profiles.some(p => p.isSystem && isSameName(p.name, nameToSave))) {
                alert('Dieser Name gehört zu einer System-Vorlage. Bitte wähle einen anderen Namen.');
                return;
            }

            const belegt = profiles.some(p => !p.isSystem && isSameName(p.name, nameToSave));
            if (belegt && !(await confirmOverwrite('Profil', nameToSave))) return;
        }

        setSaving(true);

        if (isDesktopTarget()) {
            const customProfiles = readLocalArrayForUpdate<LocalPromptProfile>(PROFILE_KEY);
            // Bearbeiten trifft die Kennung; nur beim Neuanlegen entscheidet der
            // Name, ob ueberschrieben wird — dem hat der Nutzer oben zugestimmt.
            const existingIdx = zielId
                ? customProfiles.findIndex(p => p.id === zielId)
                : customProfiles.findIndex(p => isSameName(p.name, nameToSave));

            let gespeicherteId = zielId;
            if (existingIdx >= 0) {
                customProfiles[existingIdx].correctionPrompt = correctionPrompt;
                gespeicherteId = customProfiles[existingIdx].id;
            } else {
                gespeicherteId = `local-${Date.now()}`;
                customProfiles.push({
                    id: gespeicherteId,
                    name: nameToSave,
                    correctionPrompt,
                    isSystem: false
                });
            }
            writeLocalArray(PROFILE_KEY, customProfiles);

            // Handle AI Profile Save
            if (createAiProfile && importedAiParams) {
                // 🏮 Zuvor wurde blind angehängt: Zweimal Speichern erzeugte zwei
                // gleichnamige KI-Profile — genau die Dublette, die das
                // Umbenennen inzwischen verhindert.
                const customAiProfiles = readLocalArrayForUpdate<{ id?: string; name?: string }>(AI_PROFILE_KEY);
                const aiIdx = customAiProfiles.findIndex(p => isSameName(p.name, nameToSave));
                const aiProfil = { id: `local-ai-${Date.now()}`, name: nameToSave, ...importedAiParams, isSystem: false };
                if (aiIdx >= 0) {
                    customAiProfiles[aiIdx] = { ...aiProfil, id: customAiProfiles[aiIdx].id || aiProfil.id };
                } else {
                    customAiProfiles.push(aiProfil);
                }
                writeLocalArray(AI_PROFILE_KEY, customAiProfiles);
            }
            
            setSelectedProfileId(gespeicherteId);
            await fetchProfiles();
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
                id: zielId || undefined,
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

                setSelectedProfileId(data.id);
                await fetchProfiles();
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
        const profileId = selectedProfileId;
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

    /**
     * Nach dem Loeschen des gewaehlten Profils auf die Standard-Vorlage
     * zurueckfallen. Zuvor stand hier zweimal ein Vergleich gegen den Namen
     * 'Standard' — den kein Profil traegt (die Vorlage heisst „Allgemeine
     * Korrektur"), der Rueckfall lief also ins Leere.
     */
    const faellZurueckAufStandard = () => {
        const standard = profiles.find(p => p.id === DEFAULT_EXPERT_PROFILE_ID);
        if (!standard) return;
        setSelectedProfileId(standard.id);
        setCorrectionPrompt(standard.correctionPrompt);
        setLastSavedPrompt(standard.correctionPrompt);
    };

    const handleDeleteProfile = async (id: string) => {
        if (!(await askConfirmation({ title: 'Profil löschen', message: 'Dieses Profil wirklich dauerhaft löschen?' }))) return;

        try {
            await promptProfileStore.loesche(id);
            await fetchProfiles();
            if (selectedProfileId === id) faellZurueckAufStandard();
        } catch (err) {
            alert(toErrorMessage(err, 'Löschen fehlgeschlagen.'));
        }
    };

    const handleConfirmRename = async () => {
        if (!editingName.trim() || !editingProfileId) {
            setEditingProfileId(null);
            return;
        }

        try {
            const erfolgreich = await promptProfileStore.benenneUm(editingProfileId, editingName);
            if (!erfolgreich) {
                alert(nameTakenMessage('Profil'));
                return;
            }

            // Die Auswahl haengt an der Kennung — kein Nachziehen noetig.
            await fetchProfiles();
            setEditingProfileId(null);
        } catch (err) {
            alert(toErrorMessage(err, 'Fehler beim Umbenennen'));
        }
    };


    return {
        profiles,
        /** Kennung des gewaehlten Profils — die Identitaet. */
        selectedProfileId,
        /** Name des gewaehlten Profils — reine Anzeige. */
        selectedProfile,
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
