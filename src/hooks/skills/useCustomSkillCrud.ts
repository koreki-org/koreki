import type { CustomSkillDefinition, SkillProfile, GespeicherterSkill } from '@/types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { deduplicateCustomSkills, entferneSkillAusProfil } from '@/lib/skills/skill-dedup';

/**
 * Eigene Skills anlegen und loeschen.
 * 🧩
 *
 * Ein Skill lebt an drei Stellen: in der Sammlung des Nutzers, im
 * Zustandsspeicher der Oberflaeche und in den Skill-Profilen, die ihn
 * verwenden. Wird er geloescht, muss er ueberall verschwinden — sonst zeigt
 * ein Profil auf einen Skill, den es nicht mehr gibt.
 *
 * Herausgezogen aus `useSkillProfiles`, wo diese Verwaltung neben der
 * Profil-Verwaltung lag.
 */

export interface UseCustomSkillCrudParams {
    customSkills: Record<string, CustomSkillDefinition>;
    setCustomSkills: React.Dispatch<React.SetStateAction<Record<string, CustomSkillDefinition>>>;
    activeSkillIds: string[];
    setActiveSkillIds: React.Dispatch<React.SetStateAction<string[]>>;
    /** Nur zum Nachziehen der Profile, die den geloeschten Skill fuehren. */
    profiles: SkillProfile[];
    setProfiles: React.Dispatch<React.SetStateAction<SkillProfile[]>>;
    /** Das gerade gewaehlte Profil — bestimmt, wohin ein neuer Skill gehoert. */
    selectedProfileData?: SkillProfile;
}

export function useCustomSkillCrud({
    customSkills,
    setCustomSkills,
    activeSkillIds,
    setActiveSkillIds,
    profiles,
    setProfiles,
    selectedProfileData
}: UseCustomSkillCrudParams) {
    const handleSaveCustomSkill = async (skill: GespeicherterSkill) => {
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
        // Vorlagen aus der Registry werden nie veraendert, sondern kopiert.
        const updatedProfiles = profiles.map(p => p.isSystem ? p : entferneSkillAusProfil(p, id));

        // 4. Speicher-Persistierung aller geänderten benutzerdefinierten Profile
        if (isDesktopTarget()) {
            const stored = localStorage.getItem('koreki_local_skill_profiles');
            if (stored) {
                try {
                    const customProfiles: SkillProfile[] = JSON.parse(stored);
                    const updatedCustomProfiles = customProfiles.map(p => entferneSkillAusProfil(p, id));
                    localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(updatedCustomProfiles));
                } catch {
                    // Unlesbare Ablage — die Profile im Zustand sind bereits bereinigt.
                }
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

    return { handleSaveCustomSkill, handleDeleteCustomSkill };
}
