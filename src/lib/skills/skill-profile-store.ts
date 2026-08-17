import type { CustomSkillDefinition, SkillProfile } from '@/types';
import { apiClient } from '@/lib/api-client';
import { isDesktopTarget } from '@/lib/env-context';
import { isSameName } from '@/lib/services/profile-naming';

/**
 * Wo Skill-Profile liegen — lokal oder in der Datenbank.
 * 🗄️
 *
 * Im Desktop-Betrieb gibt es keinen Server, im SaaS keinen lokalen Speicher.
 * Diese Fallunterscheidung stand SECHSMAL in `useSkillProfiles` verteilt:
 * beim Laden, Speichern, Löschen, Umbenennen und zweimal in der
 * Skill-Verwaltung.
 *
 * Sie liegt jetzt hier. Der Hook entscheidet danach nur noch, was mit dem
 * Ergebnis geschehen soll — nicht mehr, woher es kommt.
 */

const SPEICHER_SCHLUESSEL = 'koreki_local_skill_profiles';

const leseLokal = (): SkillProfile[] => {
    const stored = localStorage.getItem(SPEICHER_SCHLUESSEL);
    if (!stored) return [];
    try {
        return JSON.parse(stored) as SkillProfile[];
    } catch {
        return [];
    }
};

const schreibeLokal = (profile: SkillProfile[]) => {
    localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(profile));
};

export interface SpeicherErgebnis {
    id: string;
    /** Der Stand, wie er tatsächlich abgelegt wurde. */
    activeSkillIds: string[];
}

export interface SpeichereSkillProfilParams {
    /** Leer beim Neuanlegen, sonst die Kennung des bearbeiteten Profils. */
    zielId: string;
    name: string;
    activeSkillIds: string[];
    customSkills: Record<string, CustomSkillDefinition>;
}

/**
 * Legt ein Skill-Profil an oder aktualisiert es.
 *
 * Beim Bearbeiten entscheidet die KENNUNG, welcher Datensatz getroffen wird —
 * nicht der Name. Nur beim Neuanlegen fällt die Entscheidung über den Namen,
 * und dem hat die Lehrkraft dann ausdrücklich zugestimmt.
 */
export async function speichereSkillProfil(p: SpeichereSkillProfilParams): Promise<SpeicherErgebnis> {
    const { zielId, name, activeSkillIds, customSkills } = p;

    if (isDesktopTarget()) {
        const profile = leseLokal();
        const existingIdx = zielId
            ? profile.findIndex(x => x.id === zielId)
            : profile.findIndex(x => isSameName(x.name, name));

        if (existingIdx >= 0) {
            profile[existingIdx].activeSkillIds = activeSkillIds;
            profile[existingIdx].customSkills = customSkills;
            schreibeLokal(profile);
            return { id: profile[existingIdx].id, activeSkillIds };
        }

        const neueId = `local-skill-${Date.now()}`;
        profile.push({ id: neueId, name, activeSkillIds, customSkills, isSystem: false });
        schreibeLokal(profile);
        return { id: neueId, activeSkillIds };
    }

    const res = await apiClient.post('/api/user/skill-profiles', {
        id: zielId || undefined,
        name,
        activeSkillIds,
        customSkills
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || 'Speichern fehlgeschlagen');
    }

    return {
        id: data.id,
        activeSkillIds: Array.isArray(data.activeSkillIds) ? data.activeSkillIds : []
    };
}

/** Entfernt ein Profil. Systemvorlagen sind davon ausgenommen. */
export async function loescheSkillProfil(id: string): Promise<void> {
    if (isDesktopTarget()) {
        schreibeLokal(leseLokal().filter(p => p.id !== id));
        return;
    }

    const res = await apiClient.fetch(`/api/user/skill-profiles?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Löschen fehlgeschlagen');
    }
}

/**
 * Benennt ein Profil um.
 *
 * @returns `false`, wenn der Name lokal bereits vergeben ist.
 */
export async function benenneSkillProfilUm(id: string, neuerName: string): Promise<boolean> {
    if (isDesktopTarget()) {
        const profile = leseLokal();
        if (profile.some(p => p.id !== id && isSameName(p.name, neuerName))) return false;

        schreibeLokal(profile.map(p => p.id === id ? { ...p, name: neuerName.trim() } : p));
        return true;
    }

    const res = await apiClient.fetch('/api/user/skill-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newName: neuerName.trim() })
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Umbenennen fehlgeschlagen');
    }
    return true;
}
