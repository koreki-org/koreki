import type { CustomSkillDefinition, SkillProfile } from '@/types';
import { createProfileStore } from '@/lib/services/profile-store';

/**
 * Wo Skill-Profile liegen.
 * 🗄️
 *
 * Die Fallunterscheidung Desktop/Server steht seit dem 18.08.2026 nicht mehr
 * hier, sondern einmal in `lib/services/profile-store` — gemeinsam mit den
 * Experten- und den KI-Profilen. Diese Datei gibt der Familie nur noch ihren
 * Ablageort und die Form ihrer Nutzdaten.
 */

const store = createProfileStore<SkillProfile>({
    speicherSchluessel: 'koreki_local_skill_profiles',
    endpunkt: '/api/user/skill-profiles',
    idPraefix: 'local-skill'
});

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

/** Lädt die gespeicherten Skill-Profile — ohne die MINT-Standardsets. */
export const ladeSkillProfile = (): Promise<SkillProfile[]> => store.lade();

/**
 * Legt ein Skill-Profil an oder aktualisiert es.
 *
 * Gibt den Stand zurück, wie er TATSÄCHLICH abgelegt wurde. Der Hook setzt
 * seinen `lastSavedSkillIds` daraus — nicht aus dem, was er geschickt hat.
 * Sonst gälte eine serverseitige Bereinigung als ungespeicherte Änderung, und
 * die Oberfläche zeigte dauerhaft einen Punkt am Speichern-Knopf.
 */
export async function speichereSkillProfil(p: SpeichereSkillProfilParams): Promise<SpeicherErgebnis> {
    const { zielId, name, activeSkillIds, customSkills } = p;

    const gespeichert = await store.speichere({
        zielId,
        name,
        nutzdaten: { activeSkillIds, customSkills }
    });

    return {
        id: gespeichert.id,
        activeSkillIds: Array.isArray(gespeichert.activeSkillIds) ? gespeichert.activeSkillIds : []
    };
}

/** Entfernt ein Profil. Systemvorlagen sind davon ausgenommen. */
export const loescheSkillProfil = (id: string): Promise<void> => store.loesche(id);

/**
 * Benennt ein Profil um.
 *
 * @returns `false`, wenn der Name lokal bereits vergeben ist.
 */
export const benenneSkillProfilUm = (id: string, neuerName: string): Promise<boolean> =>
    store.benenneUm(id, neuerName);
