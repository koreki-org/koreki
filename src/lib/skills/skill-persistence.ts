import { Task, AppSettings, CustomSkillDefinition } from '@/types';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_SKILL_PROFILES, getDefaultSkillIds, DEFAULT_SKILL_PROFILE_ID } from '@/lib/ai/standard-skills-profiles';
import { resolveProfileRef } from '@/lib/services/profile-naming';
import { resolveCustomSkillId } from '@/lib/custom-skill-id';
import { planSkillProfileSync } from '@/lib/skill-profile-sync';
import { toErrorMessage } from '@/lib/error-message';
import { logger } from '@/lib/logger';
import type { SkillProfile } from '@/types';

/**
 * Einen erzeugten Skill überall hinschreiben, wo er hingehört.
 * 💾
 *
 * Wenn die KI aus einer Aufgabe einen Bewertungsgraphen erzeugt, entsteht
 * daraus ein eigener Skill. Der muss an vier Stellen ankommen:
 *
 * 1. `localStorage` unter `koreki_custom_skills` (die Skill-Sammlung),
 * 2. den Zustandsspeicher der Oberfläche,
 * 3. die Aufgabe selbst (ihr `taskType` zeigt danach auf den neuen Skill),
 * 4. das aktive Skill-Profil — lokal oder in der Datenbank.
 *
 * Stand als 160-Zeilen-Callback in `ModelSolutionCard`. Es ist keine
 * Darstellung, sondern Persistenz mit vier Zielen; nach
 * architectural-vision §6.1 gehört das in `lib/`, nicht in eine Komponente.
 *
 * Der Desktop- und der SaaS-Zweig treffen DIESELBE Entscheidung und
 * unterscheiden sich nur im Ziel — genau dafür gibt es `planSkillProfileSync`.
 */

export interface PersistGeneratedSkillParams {
    /** Anzeigename, aus dem die Kennung abgeleitet wird. */
    name: string;
    skill: CustomSkillDefinition;
    taskIdx: number;
    /** Die Aufgabe im aktuellen Stand — für die Kennungs-Auflösung. */
    currentTask?: Task;
    settings?: AppSettings;
    /** Trägt das Ergebnis in die Aufgabe ein (Graph oder Rechenkette). */
    updateTaskLayout: (task: Task) => Task;
    onTasksChange?: (updater: (prev: Task[]) => Task[]) => void;
}

const lesenAusSpeicher = <T,>(schluessel: string, standard: T): T => {
    const roh = localStorage.getItem(schluessel);
    if (!roh) return standard;
    try {
        return JSON.parse(roh) as T;
    } catch {
        return standard;
    }
};

/**
 * Schreibt den Skill in die vier Ziele und gibt seine Kennung zurück.
 */
export async function persistGeneratedSkill(p: PersistGeneratedSkillParams): Promise<string> {
    const { name, skill, taskIdx, currentTask, settings, updateTaskLayout, onTasksChange } = p;

    // --- 1. Skill-Sammlung im lokalen Speicher ---
    const customSkills = lesenAusSpeicher<Record<string, CustomSkillDefinition>>('koreki_custom_skills', {});

    // Duplikatvermeidung samt Regelwerk liegt in lib/custom-skill-id.ts.
    const id = resolveCustomSkillId({ name, customSkills, currentTask, taskIdx });
    const gespeicherterSkill: CustomSkillDefinition = { ...skill, id };

    customSkills[id] = gespeicherterSkill;
    try {
        localStorage.setItem('koreki_custom_skills', JSON.stringify(customSkills));
    } catch (e) {
        // Im privaten Fenster ist der Speicher gedeckelt. Der Skill lebt dann
        // nur in dieser Sitzung weiter — besser als ein Abbruch.
        logger.warn('Skill konnte nicht lokal gesichert werden (Speicherlimit?)', { message: toErrorMessage(e) });
    }

    // --- 2. Zustandsspeicher der Oberfläche ---
    const store = useDashboardStore.getState();
    if (store.aiSettings) {
        store.setAiSettings({
            ...store.aiSettings,
            customSkills: { ...store.aiSettings.customSkills, [id]: gespeicherterSkill },
            activeSkillIds: Array.from(new Set([...(store.aiSettings.activeSkillIds || []), id]))
        });
    }

    // --- 3. Die Aufgabe zeigt jetzt auf den neuen Skill ---
    onTasksChange?.(prevTasks => {
        const updated = [...prevTasks];
        if (updated[taskIdx]) {
            updated[taskIdx] = { ...updateTaskLayout(updated[taskIdx]), taskType: id };
        }
        return updated;
    });

    // --- 4. Aktives Skill-Profil (Desktop und SaaS gleichermaßen) ---
    const activeProfileId = settings?.activeSkillProfileId
        || localStorage.getItem('koreki_active_skill_profile_id')
        || DEFAULT_SKILL_PROFILE_ID;

    if (isDesktopTarget()) {
        await syncLokalesProfil(id, gespeicherterSkill, activeProfileId, store);
    } else {
        await syncProfilInDatenbank(id, gespeicherterSkill, activeProfileId, store);
    }

    return id;
}

type DashboardStore = ReturnType<typeof useDashboardStore.getState>;

async function syncLokalesProfil(
    id: string,
    skill: CustomSkillDefinition,
    activeProfileId: string,
    store: DashboardStore
): Promise<void> {
    const localProfiles = lesenAusSpeicher<SkillProfile[]>('koreki_local_skill_profiles', []);

    const activeLocalProfile = resolveProfileRef(localProfiles, activeProfileId);
    const ownLocalProfile = activeLocalProfile && !activeLocalProfile.isSystem ? activeLocalProfile : null;

    // Zuvor `p.name === activeProfileId || p.isSystem`: da jede Vorlage
    // `isSystem` trägt, gewann bei nicht passender Referenz IMMER der erste
    // Registry-Eintrag — das neue Profil startete mit den Skills der
    // Grundschul-Vorlage. Die Slugs lösen die Referenz sauber auf.
    const matchingSystem = resolveProfileRef(STANDARD_SKILL_PROFILES, activeProfileId);
    const plan = planSkillProfileSync({
        activeProfile: ownLocalProfile,
        skillId: id,
        skill,
        fallbackSkillIds: matchingSystem ? [...matchingSystem.activeSkillIds] : getDefaultSkillIds()
    });

    if (plan.action === 'update' && ownLocalProfile) {
        ownLocalProfile.activeSkillIds = plan.activeSkillIds;
        ownLocalProfile.customSkills = plan.customSkills;
        localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(localProfiles));
        return;
    }

    const newProfileId = `local-skill-${Date.now()}`;
    localProfiles.push({
        id: newProfileId,
        name: plan.name,
        activeSkillIds: plan.activeSkillIds,
        customSkills: plan.customSkills,
        isSystem: false
    });

    localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(localProfiles));
    localStorage.setItem('koreki_active_skill_profile_id', newProfileId);

    if (store.aiSettings) {
        store.setAiSettings({ ...store.aiSettings, activeSkillProfileId: newProfileId });
    }
}

async function syncProfilInDatenbank(
    id: string,
    skill: CustomSkillDefinition,
    activeProfileId: string,
    store: DashboardStore
): Promise<void> {
    try {
        const res = await apiClient.get('/api/user/skill-profiles');
        if (!res.ok) return;

        const profilesList: SkillProfile[] = await res.json();
        // Über den Auflöser, damit auch eine noch namensbasierte Altreferenz das
        // aktive Profil trifft — sonst landete der neue Skill in einem frisch
        // angelegten „Mein Skill-Profil".
        const activeProfile = resolveProfileRef(profilesList, activeProfileId);

        // Dieselbe Entscheidung wie im Desktop-Zweig — nur das Ziel unterscheidet
        // sich (API statt localStorage).
        const plan = planSkillProfileSync({
            activeProfile,
            skillId: id,
            skill,
            fallbackSkillIds: getDefaultSkillIds()
        });

        const antwort = await apiClient.post('/api/user/skill-profiles', {
            name: plan.name,
            activeSkillIds: plan.activeSkillIds,
            customSkills: plan.customSkills
        });

        if (plan.action === 'update' || !antwort.ok) return;

        const newProfile = await antwort.json();
        await apiClient.post('/api/user/update-skill-profile', { profileId: newProfile.id });

        if (store.aiSettings) {
            store.setAiSettings({ ...store.aiSettings, activeSkillProfileId: newProfile.id });
        }
    } catch (err) {
        logger.error('Fehler beim Synchronisieren des neuen Skills mit dem Skill-Profil in der DB', {
            message: toErrorMessage(err)
        });
    }
}
