import { Task } from '../types';

/**
 * Auflösung der ID eines benutzerdefinierten Skills.
 * 🧩
 *
 * Ausgelagert aus ModelSolutionCard. Hier stecken die Regeln gegen doppelte
 * Skill-Karten — die Stelle, an der aus einer Aufgabe still zwei Einträge
 * werden können, wenn eine Bedingung kippt. Als Teil einer 1200-Zeilen-
 * Komponente war das nur über das Rendern der ganzen Karte erreichbar und
 * damit praktisch ungetestet.
 *
 * Die Reihenfolge ist fachlich, nicht technisch:
 * 1. Die Aufgabe hängt bereits an einem eigenen Skill → dessen ID behalten.
 * 2. Es gibt einen Skill mit genau diesem Namen → den wiederverwenden.
 * 3. Es gibt einen automatisch erzeugten Skill zu dieser Aufgabe → den nehmen.
 * 4. Sonst eine neue ID bilden.
 */

/** Präfix, an dem automatisch erzeugte Skills einer Aufgabe erkennbar sind. */
const AUTO_SKILL_PREFIX = 'auto_';

/** Skill-IDs, die auf eine benutzerdefinierte Karte zeigen. */
const CUSTOM_SKILL_PREFIX = 'custom-skill-';

export interface CustomSkillLike {
    name?: string;
    [key: string]: unknown;
}

export interface ResolveCustomSkillIdInput {
    /** Der von der Lehrkraft vergebene Name. */
    name: string;
    /** Bestand aus dem localStorage, Schlüssel ist die Skill-ID. */
    customSkills: Record<string, CustomSkillLike>;
    /** Die Aufgabe, zu der der Skill gehört — kann fehlen. */
    currentTask?: Task;
    /** Position der Aufgabe im Layout, nur für den Ersatznamen. */
    taskIdx: number;
}

/** Macht aus einem Anzeigenamen ein ID-taugliches Fragment. */
export function slugifySkillName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Namensstamm, unter dem automatisch erzeugte Skills einer Aufgabe liegen. */
export function buildAutoSkillPrefix(currentTask: Task | undefined, taskIdx: number): string {
    const cleanTaskName = (currentTask?.name || `Aufgabe-${taskIdx + 1}`)
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

    return `${AUTO_SKILL_PREFIX}${cleanTaskName}`;
}

/**
 * Findet die ID, unter der der Skill gespeichert werden soll.
 *
 * `uniqueSuffix` ist injizierbar, damit die neu gebildete ID testbar bleibt;
 * produktiv sind es die letzten vier Stellen des Zeitstempels.
 */
export function resolveCustomSkillId(
    input: ResolveCustomSkillIdInput,
    uniqueSuffix: () => string = () => Date.now().toString().slice(-4)
): string {
    const { name, customSkills, currentTask, taskIdx } = input;

    // 1. Die Aufgabe zeigt schon auf einen eigenen Skill — nie einen zweiten anlegen.
    if (currentTask?.taskType?.startsWith(CUSTOM_SKILL_PREFIX)) {
        return currentTask.taskType;
    }

    // 2. Ein Skill mit genau diesem Namen existiert bereits (Groß-/Kleinschreibung
    //    und Leerraum ignoriert).
    const cleanName = name.trim().toLowerCase();
    const existingByName = Object.keys(customSkills).find(key => {
        const skillName = customSkills[key]?.name;
        return typeof skillName === 'string' && skillName.trim().toLowerCase() === cleanName;
    });
    if (existingByName) return existingByName;

    // 3. Ein automatisch erzeugter Skill zu dieser Aufgabe. Der Name trägt einen
    //    Zeitstempel, deshalb zählt der Präfix — exakt oder mit `_` getrennt,
    //    damit "auto_aufgabe-1" nicht auf "auto_aufgabe-12" passt.
    const prefix = buildAutoSkillPrefix(currentTask, taskIdx);
    const existingAuto = Object.keys(customSkills).find(key => {
        const skillName = customSkills[key]?.name;
        if (typeof skillName !== 'string') return false;
        const lower = skillName.toLowerCase();
        return lower === prefix || lower.startsWith(`${prefix}_`);
    });
    if (existingAuto) return existingAuto;

    // 4. Neu.
    return `${CUSTOM_SKILL_PREFIX}${slugifySkillName(name)}-${uniqueSuffix()}`;
}
