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
 * Nimmt einen geloeschten Skill aus einem Profil heraus.
 * 🧹
 *
 * Beides muss geschehen: die Definition aus `customSkills` UND die Kennung aus
 * `activeSkillIds`. Bleibt die Kennung stehen, verweist das Profil auf einen
 * Skill, den es nicht mehr gibt — die Instruktion faellt beim naechsten
 * Korrekturlauf stillschweigend weg, ohne dass irgendwo etwas fehlschlaegt.
 *
 * Gibt das Profil UNVERAENDERT zurueck, wenn es den Skill gar nicht kannte.
 * Aufrufer erkennen daran (per Identitaetsvergleich), ob sie speichern muessen.
 *
 * WARUM DAS EINE FUNKTION IST
 * ---------------------------
 * Dieser Ablauf stand zweimal in `useCustomSkillCrud` — einmal fuer die
 * Profile im Zustand, einmal fuer die lokal abgelegten der Desktop-Fassung.
 * Beide Male dieselben acht Zeilen. Der Duplikat-Waechter sah das bis zum
 * 18.08.2026 nicht: er verglich nur ueber Dateigrenzen hinweg.
 */
export const entferneSkillAusProfil = <T extends {
    customSkills?: Record<string, CustomSkillDefinition>;
    activeSkillIds?: string[];
}>(profil: T, skillId: string): T => {
    const customSkills = profil.customSkills ? { ...profil.customSkills } : {};
    const vorhandeneIds = Array.isArray(profil.activeSkillIds) ? profil.activeSkillIds : [];

    const hatDefinition = !!customSkills[skillId];
    const istAktiv = vorhandeneIds.includes(skillId);
    if (!hatDefinition && !istAktiv) return profil;

    delete customSkills[skillId];
    return {
        ...profil,
        customSkills,
        activeSkillIds: vorhandeneIds.filter(id => id !== skillId)
    };
};
