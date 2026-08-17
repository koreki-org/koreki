import type { CustomSkillDefinition } from '@/types';

/**
 * Vergleichbarkeit und Eindeutigkeit von Skill-Sammlungen.
 * 🔍
 *
 * Zwei reine Funktionen ohne React — sie standen am Kopf von
 * `useSkillProfiles` und gehoeren nach architectural-vision §6.1 nach `lib/`.
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
