import { useState, useEffect, useCallback, useRef } from 'react';
import { AppSettings, CustomSkillDefinition, SkillProfile } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_SKILL_PROFILES, DEFAULT_SKILL_PROFILE_ID } from '@/lib/ai/standard-skills-profiles';
import { findNameCollision } from '@/lib/local-vault';
import { isSameName, nameTakenMessage, overwriteQuestion, resolveProfileRef } from '@/lib/services/profile-naming';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import type { ParsedProfile } from '@/lib/parsers/markdown-profile-parser';

/**
 * Deterministischer, Key-sortierter Objekt-Stringifier für robustes Dirty-Checking.
 */
export const sortObjectKeys = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);

    const quelle = obj as Record<string, unknown>;
    return Object.keys(quelle)
        .sort()
        .reduce<Record<string, unknown>>((sorted, key) => {
            sorted[key] = sortObjectKeys(quelle[key]);
            return sorted;
        }, {});
};

/**
 * Konsolidiert namensgleiche Skills (case-insensitiv & getrimmt) und leitet Duplikat-IDs um.
 */
export const deduplicateCustomSkills = (
    skills: Record<string, CustomSkillDefinition>,
    activeIds?: string[]
): { cleaned: Record<string, CustomSkillDefinition>; updatedActiveIds: string[] } => {
    const seenNames = new Map<string, string>(); // lowerName -> keptId
    const cleaned: Record<string, CustomSkillDefinition> = {};
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
    /**
     * Verweis auf das beim Oeffnen aktive Set — Kennung ODER Name. Der Aufrufer
     * reicht durch, was er hat; `resolveProfileRef` loest beides auf, solange
     * Altbestand existiert.
     */
    currentProfileRef: string = DEFAULT_SKILL_PROFILE_ID
) => {
    const [profiles, setProfiles] = useState<SkillProfile[]>([]);
    /**
     * 🏮 Die Auswahl haengt an der KENNUNG, nicht mehr am Namen.
     *
     * Zuvor war der Name der Schluessel: Zwei gleichnamige Sets waren damit
     * ununterscheidbar, ein Umbenennen musste den Auswahl-Zustand nachziehen
     * (und tat es nur, wenn der alte Name exakt passte), und ein Speichern traf
     * den ersten Namenstreffer statt das bearbeitete Set. Leer = Neuanlage.
     */
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    
    // Tracks currently checked/toggled skill IDs
    const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);
    // Tracks the skill IDs from the last saved state of the active profile
    const [lastSavedSkillIds, setLastSavedSkillIds] = useState<string[]>([]);
    
    // Custom individual teacher skills list
    const [customSkills, setCustomSkills] = useState<Record<string, CustomSkillDefinition>>({});

    const [saving, setSaving] = useState(false);
    const [showEditorMobile, setShowEditorMobile] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const selectedProfileData = profiles.find(p => p.id === selectedProfileId);
    /** Reine Anzeige — die Oberflaeche beschriftet damit Kopfzeile und Kopien. */
    const selectedProfile = selectedProfileData?.name || '';

    // Precise Custom Skills dirty checking (Stage 10 Parity with sorting protection)
    const currentProfileCustomSkills = Object.keys(customSkills)
        .filter(key => activeSkillIds.includes(key))
        .reduce((obj, key) => {
            obj[key] = customSkills[key];
            return obj;
        }, {} as Record<string, CustomSkillDefinition>);

    const savedProfileCustomSkills = selectedProfileData?.customSkills && typeof selectedProfileData.customSkills === 'object'
        ? selectedProfileData.customSkills
        : {};

    const isCustomSkillsDirty = JSON.stringify(sortObjectKeys(currentProfileCustomSkills)) !== JSON.stringify(sortObjectKeys(savedProfileCustomSkills));
    const isDirty = JSON.stringify([...activeSkillIds].sort()) !== JSON.stringify([...lastSavedSkillIds].sort()) || isCustomSkillsDirty;
    const isSystemSelected = !!selectedProfileData?.isSystem;

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

    const handleSaveCustomSkill = async (skill: CustomSkillDefinition & { id: string }) => {
        // 1. Update global customSkills state & localStorage
        setCustomSkills(prev => {
            const updated = { ...prev, [skill.id]: skill };
            localStorage.setItem('koreki_custom_skills', JSON.stringify(updated));
            return updated;
        });

        // 2. Direct Sync and Persistence: Auto-save immediately to active profile
        const profile = selectedProfileData;
        if (profile && !profile.isSystem) {
            const updatedProfileCustomSkills = {
                ...(profile.customSkills || {}),
                [skill.id]: skill
            };

            if (isDesktopTarget()) {
                const stored = localStorage.getItem('koreki_local_skill_profiles');
                let customProfiles: SkillProfile[] = [];
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
                        id: profile.id,
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
                pActiveSkillIds = pActiveSkillIds.filter((sid: string) => sid !== id);
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
                    let customProfiles: SkillProfile[] = JSON.parse(stored);
                    const updatedCustomProfiles = customProfiles.map(p => {
                        const profileCustomSkills = p.customSkills ? { ...p.customSkills } : {};
                        let isChanged = false;
                        if (profileCustomSkills[id]) {
                            delete profileCustomSkills[id];
                            isChanged = true;
                        }
                        let pActiveSkillIds = Array.isArray(p.activeSkillIds) ? [...p.activeSkillIds] : [];
                        if (pActiveSkillIds.includes(id)) {
                            pActiveSkillIds = pActiveSkillIds.filter((sid: string) => sid !== id);
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

    /**
     * Uebernimmt Skills und eigene Skills eines Profils in den Bearbeitungs-
     * zustand. Stand zuvor dreimal wortgleich im Hook.
     */
    const hydrateFromProfile = useCallback((profile: SkillProfile) => {
        const skills = Array.isArray(profile?.activeSkillIds) ? profile.activeSkillIds : [];

        if (profile?.customSkills && typeof profile.customSkills === 'object') {
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
    }, []);

    // Auswahl und Anlege-Modus ueber Referenzen statt ueber Abhaengigkeiten:
    // sonst haengt `uebernehmeProfile` an `selectedProfileId`, damit auch
    // `fetchProfiles`, damit feuert der Lade-Effekt erneut — und schreibt dabei
    // genau die Auswahl, an der er haengt.
    const auswahlRef = useRef(selectedProfileId);
    const legtNeuAnRef = useRef(isCreatingNew);
    useEffect(() => { auswahlRef.current = selectedProfileId; }, [selectedProfileId]);
    useEffect(() => { legtNeuAnRef.current = isCreatingNew; }, [isCreatingNew]);

    /**
     * Setzt die geladene Liste und richtet die Auswahl darauf aus.
     *
     * Solange noch nichts gewaehlt ist, entscheidet der Verweis des Aufrufers —
     * `resolveProfileRef` nimmt dafuer Kennung wie Name entgegen. Danach steht
     * die Kennung fest und ueberlebt jedes Umbenennen.
     */
    const uebernehmeProfile = useCallback((alle: SkillProfile[]) => {
        setProfiles(alle);

        // Waehrend ein neues Set entsteht, darf ein Nachladen die Auswahl NICHT
        // zurueckstellen — sonst stehen die kopierten Skills neben dem Zustand
        // eines fremden Sets und Speichern trifft das falsche.
        if (legtNeuAnRef.current) return;

        const current = resolveProfileRef<SkillProfile>(alle, auswahlRef.current || currentProfileRef);
        if (current) {
            setSelectedProfileId(current.id);
            hydrateFromProfile(current);
        }
    }, [currentProfileRef, hydrateFromProfile]);

    const fetchProfiles = useCallback(async () => {
        // Desktop App (Tauri) uses pure localStorage
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            let customProfiles = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            uebernehmeProfile([...STANDARD_SKILL_PROFILES, ...customProfiles]);
            return;
        }

        // Community Server & SaaS use the API
        try {
            const res = await apiClient.get('/api/user/skill-profiles');
            if (res.ok) {
                uebernehmeProfile(await res.json());
            }
        } catch (err) {
            console.error("Fehler beim Laden der Skill-Profile", err);
        }
    }, [uebernehmeProfile]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    useEffect(() => {
        // If a profile is selected and we don't have active skills loaded yet, load them from presets
        if (selectedProfileId && activeSkillIds.length === 0) {
            const current = profiles.find(p => p.id === selectedProfileId);
            if (current) hydrateFromProfile(current);
        }
    }, [profiles, selectedProfileId, activeSkillIds.length, hydrateFromProfile]);

    const handleSelectProfile = (profile: SkillProfile) => {
        setIsCreatingNew(false);
        setSelectedProfileId(profile.id);
        setShowEditorMobile(true);
        hydrateFromProfile(profile);
    };

    const handleStartNew = (initialSkills?: string[], initialName?: string) => {
        setIsCreatingNew(true);
        setSelectedProfileId('');
        setActiveSkillIds(Array.isArray(initialSkills) ? initialSkills : []);
        setLastSavedSkillIds([]);
        setNewProfileName(initialName || "");
        setShowEditorMobile(true);
    };

    const handleImportParsedProfile = (parsed: ParsedProfile, isSingleSkill?: boolean) => {
        // Check if this is an individual skill import rather than a profile layout
        if (isSingleSkill || parsed.metadata?.type === 'skill' || parsed.metadata?.id?.startsWith('skill-') || parsed.metadata?.promptSnippet) {
            // Der Rumpf der Markdown-Datei liegt im `correctionPrompt` — so gibt
            // ihn `parseMarkdownProfile` zurueck. Vorher stand hier
            // `parsed.content`, ein Feld, das der Parser NIE liefert: ein Skill,
            // dessen Anweisung im Rumpf steht (der Normalfall), wurde still mit
            // leerem Prompt importiert. `usePromptProfiles` liest seit jeher das
            // richtige Feld — die beiden Import-Wege waren auseinandergelaufen.
            const promptText = parsed.metadata?.promptSnippet || parsed.metadata?.prompt || parsed.correctionPrompt || "";
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
            setSelectedProfileId('');

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
        // 🏮 Beim Bearbeiten entscheidet die KENNUNG, welcher Datensatz getroffen
        // wird — nicht der Name. Zuvor lief auch das Aktualisieren ueber einen
        // Namensvergleich und landete beim ersten Treffer.
        const zielId = isCreatingNew ? '' : selectedProfileId;
        const nameToSave = isCreatingNew ? newProfileName.trim() : (selectedProfileData?.name || '');
        if (!nameToSave) {
            alert("Bitte gib einen Namen für das Skill-Profil ein.");
            return;
        }

        // Beide Prüfungen gelten NUR fürs Neuanlegen. Das Speichern eines bereits
        // gewählten Sets ist der reguläre Aktualisierungspfad — inklusive der
        // System-Vorlagen, die in SaaS ein ADMIN bearbeiten darf.
        if (isCreatingNew) {
            const vergleichsName = nameToSave.toLowerCase();
            const istSystemName = profiles.some(p => p.isSystem && (p.name || '').trim().toLowerCase() === vergleichsName);

            // Die Datenbank lehnt das Speichern unter einem System-Namen ab; die
            // dateibasierte und die Desktop-Ablage legten bisher ein gleichnamiges
            // Nutzerprofil daneben — es erschien dann in beiden Listen-Abschnitten.
            if (istSystemName) {
                alert('Dieser Name gehört zu einer System-Vorlage. Bitte wähle einen anderen Namen.');
                return;
            }

            // Speichern ist ein Upsert über den NAMEN. Beim Neuanlegen traf das
            // bisher ohne Rückfrage ein bestehendes gleichnamiges Set — dessen
            // Skills waren damit weg.
            const belegt = profiles.some(p => !p.isSystem && (p.name || '').trim().toLowerCase() === vergleichsName);
            if (belegt && !window.confirm(overwriteQuestion('Skill-Profil', nameToSave))) {
                return;
            }
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
            }, {} as Record<string, CustomSkillDefinition>);

        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            let customProfiles: SkillProfile[] = [];
            if (stored) {
                try { customProfiles = JSON.parse(stored); } catch(e) {}
            }
            // Bearbeiten trifft die Kennung; nur beim Neuanlegen entscheidet der
            // Name, ob ueberschrieben wird — dem hat der Nutzer oben zugestimmt.
            const existingIdx = zielId
                ? customProfiles.findIndex(p => p.id === zielId)
                : customProfiles.findIndex(p => isSameName(p.name, nameToSave));

            let gespeicherteId = zielId;
            if (existingIdx >= 0) {
                customProfiles[existingIdx].activeSkillIds = activeSkillIds;
                customProfiles[existingIdx].customSkills = activeCustomSkills;
                gespeicherteId = customProfiles[existingIdx].id;
            } else {
                gespeicherteId = `local-skill-${Date.now()}`;
                customProfiles.push({
                    id: gespeicherteId,
                    name: nameToSave,
                    activeSkillIds,
                    customSkills: activeCustomSkills,
                    isSystem: false
                });
            }
            localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(customProfiles));

            setSelectedProfileId(gespeicherteId);
            await fetchProfiles();
            setLastSavedSkillIds(activeSkillIds);
            setIsCreatingNew(false);
            setNewProfileName('');
            alert("Skill-Profil erfolgreich lokal gespeichert!");
            setSaving(false);
            return;
        }

        try {
            const res = await apiClient.post('/api/user/skill-profiles', {
                id: zielId || undefined,
                name: nameToSave,
                activeSkillIds,
                customSkills: activeCustomSkills
            });

            const data = await res.json();

            if (res.ok) {
                setSelectedProfileId(data.id);
                await fetchProfiles();
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
        // Seit die System-Vorlagen Slugs tragen, ist die Kennung in allen drei
        // Modi vorhanden und stabil — der Name wird nur noch mitgegeben, damit
        // die Kopfzeile ihn anzeigen kann.
        const profileId = selectedProfileId;

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
                let customProfiles: SkillProfile[] = JSON.parse(stored);
                customProfiles = customProfiles.filter(p => p.id !== id);
                localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(customProfiles));
                await fetchProfiles();
                if (selectedProfileId === id) {
                    const standard = STANDARD_SKILL_PROFILES[0];
                    setSelectedProfileId(standard.id);
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
                if (selectedProfileId === id) {
                    const standard = STANDARD_SKILL_PROFILES[0];
                    setSelectedProfileId(standard.id);
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
                let customProfiles: SkillProfile[] = JSON.parse(stored);
                if (findNameCollision(customProfiles, editingProfileId, editingName)) {
                    alert(nameTakenMessage('Skill-Profil'));
                    return;
                }
                customProfiles = customProfiles.map(p =>
                    p.id === editingProfileId ? { ...p, name: editingName.trim() } : p
                );
                localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(customProfiles));
                // Die Auswahl haengt an der Kennung und bleibt unberuehrt — das
                // Nachziehen des Namens (und sein Scheitern bei jeder
                // Abweichung) entfaellt ersatzlos.
                await fetchProfiles();
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

    return {
        profiles,
        /** Kennung des gewaehlten Sets — die Identitaet. */
        selectedProfileId,
        /** Name des gewaehlten Sets — reine Anzeige. */
        selectedProfile,
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
