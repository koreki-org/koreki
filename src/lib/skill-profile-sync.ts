/**
 * Einordnung eines neuen Skills in das aktive Skill-Profil.
 * 🧩🔄
 *
 * Ausgelagert aus ModelSolutionCard. Dort stand dieselbe Entscheidung zweimal:
 * einmal für Desktop (localStorage) und einmal für SaaS (API). Beide Zweige
 * unterscheiden sich nur darin, WOHIN geschrieben wird — WAS geschrieben wird,
 * ist identisch. Doppelt geschriebene Regeln driften auseinander; genau das war
 * schon bei der Anbieter-Verbindung die Ursache einer Sicherheitslücke.
 *
 * Die Regel selbst:
 * - In ein System-Profil wird nie geschrieben. Es ist eine Vorlage und muss für
 *   alle gleich bleiben — deshalb entsteht in dem Fall eine eigene Kopie.
 * - Ein eigenes Profil wird ergänzt, nie ersetzt: die Skill-Liste bekommt die
 *   neue ID nur, wenn sie fehlt, und die Definitionen werden zusammengeführt.
 */

/** Name des Profils, das beim Abzweigen von einer Vorlage entsteht. */
export const DERIVED_SKILL_PROFILE_NAME = 'Mein Skill-Profil';

export interface SkillProfileLike {
    id?: string;
    name?: string;
    isSystem?: boolean;
    activeSkillIds?: string[];
    customSkills?: Record<string, unknown>;
}

export interface PlanSkillProfileSyncInput {
    /** Das aufgelöste aktive Profil — kann fehlen oder eine Vorlage sein. */
    activeProfile?: SkillProfileLike | null;
    skillId: string;
    skill: unknown;
    /**
     * Skills, auf denen eine neue Kopie aufsetzt. Kommt vom Aufrufer, weil
     * Desktop und SaaS die Vorlage unterschiedlich auflösen.
     */
    fallbackSkillIds: string[];
}

export interface SkillProfileSyncPlan {
    /** `update` schreibt in das bestehende Profil, `create` legt eine Kopie an. */
    action: 'update' | 'create';
    name: string;
    activeSkillIds: string[];
    customSkills: Record<string, unknown>;
}

/**
 * Entscheidet, was mit dem Profil geschehen soll — ohne es zu speichern.
 * Die Persistenz bleibt beim Aufrufer, weil sie sich je Tier unterscheidet.
 */
export function planSkillProfileSync(input: PlanSkillProfileSyncInput): SkillProfileSyncPlan {
    const { activeProfile, skillId, skill, fallbackSkillIds } = input;

    const isOwnProfile = !!activeProfile && !activeProfile.isSystem;

    if (isOwnProfile) {
        const current = Array.isArray(activeProfile.activeSkillIds) ? activeProfile.activeSkillIds : [];

        return {
            action: 'update',
            name: activeProfile.name ?? DERIVED_SKILL_PROFILE_NAME,
            // Nur ergänzen, wenn die ID fehlt — sonst entstünden Doppelte.
            activeSkillIds: current.includes(skillId) ? current : [...current, skillId],
            customSkills: { ...(activeProfile.customSkills || {}), [skillId]: skill }
        };
    }

    // Kein eigenes Profil: aus der Vorlage eine eigene Kopie ableiten.
    const baseSkillIds = activeProfile?.activeSkillIds
        ? [...activeProfile.activeSkillIds]
        : [...fallbackSkillIds];

    return {
        action: 'create',
        name: DERIVED_SKILL_PROFILE_NAME,
        activeSkillIds: baseSkillIds.includes(skillId) ? baseSkillIds : [...baseSkillIds, skillId],
        customSkills: { [skillId]: skill }
    };
}
