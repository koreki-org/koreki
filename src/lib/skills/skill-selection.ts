/**
 * Auswahlregeln fuer Skills.
 * 🧩⚖️
 *
 * Ein Skill kann andere voraussetzen (`requires`) und sich mit anderen
 * ausschliessen (`conflictsWith`). Beim An- und Abhaken muss die Auswahl
 * stimmig bleiben. Diese Regel stand im Rumpf von SkillsModules und war nur
 * ueber das Rendern der gesamten Einstellungsseite erreichbar.
 *
 * DIE ZUSICHERUNG, die hier gilt:
 * Kein Skill ist aktiv, ohne dass seine Voraussetzungen aktiv sind.
 *
 * Vorher galt sie nur auf einem der beiden Wege. Beim Abhaken wurden abhaengige
 * Skills mit entfernt — beim Verdraengen durch einen Konflikt aber nicht. Mit
 * den ausgelieferten Skills war das erreichbar: `feedback-general` setzt
 * `skill-marks-classic` voraus, und `skill-marks-classic` steht im Konflikt mit
 * `skill-marks-bayern`. Wer bei aktivem `feedback-general` auf Bayern
 * umstellte, behielt einen Skill, dessen Voraussetzung still verschwunden war.
 */

export interface SkillLike {
    id?: string;
    /** Kommagetrennte Liste oder Array — beide Formen kommen aus den Profilen. */
    requires?: string | string[];
    conflictsWith?: string | string[];
    [key: string]: any;
}

/**
 * Deutet `requires`/`conflictsWith`. Die Felder kommen aus Markdown-Frontmatter
 * (dort kommagetrennt) und aus gespeicherten Profilen (dort als Array).
 */
export function parseSkillList(value: string | string[] | undefined | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return value.split(',').map(entry => entry.trim()).filter(Boolean);
}

/**
 * Entfernt einen Skill und alles, was ihn voraussetzt — bis sich nichts mehr
 * aendert. Der Fixpunkt statt eines einzelnen Durchlaufs: setzt A den Skill B
 * voraus und B den Skill C, muss das Entfernen von C auch A treffen.
 */
export function removeSkillAndDependents(
    activeIds: string[],
    removedId: string,
    allSkills: SkillLike[]
): string[] {
    let remaining = activeIds.filter(id => id !== removedId);
    let gone = [removedId];

    while (gone.length > 0) {
        const nextGone: string[] = [];

        remaining.forEach(activeId => {
            const skill = allSkills.find(s => s.id === activeId);
            if (!skill) return;

            const requires = parseSkillList(skill.requires);
            if (requires.some(reqId => gone.includes(reqId))) {
                nextGone.push(activeId);
            }
        });

        remaining = remaining.filter(id => !nextGone.includes(id));
        gone = nextGone;
    }

    return remaining;
}

/**
 * Alle aktiven Skills, die sich mit `skillId` ausschliessen — in BEIDE
 * Richtungen gelesen.
 *
 * Ein Ausschluss ist seinem Wesen nach gegenseitig, in den Skill-Dateien steht
 * er aber nur einseitig: `marks-classic` nennt `marks-bayern`, umgekehrt nicht.
 * Wurde nur die Liste des neu angehakten Skills gelesen, wirkte der Ausschluss
 * deshalb nur in einer Richtung — Bayern anhaken liess Classic stehen, und die
 * Lehrkraft hatte zwei sich widersprechende Notenschluessel gleichzeitig aktiv.
 */
function conflictingIds(skillId: string, activeIds: string[], allSkills: SkillLike[]): string[] {
    const own = parseSkillList(allSkills.find(s => s.id === skillId)?.conflictsWith);

    const foreign = activeIds.filter(activeId => {
        if (activeId === skillId) return false;
        const other = allSkills.find(s => s.id === activeId);
        return parseSkillList(other?.conflictsWith).includes(skillId);
    });

    return Array.from(new Set([...own, ...foreign]));
}

export interface ApplySkillToggleInput {
    skillId: string;
    activeSkillIds: string[];
    /** Alle bekannten Skills — Registry-Metadaten und eigene zusammen. */
    allSkills: SkillLike[];
}

/**
 * Hakt einen Skill an oder ab und haelt die Auswahl dabei stimmig.
 *
 * Anhaken: der Skill kommt dazu, seine Voraussetzungen ebenfalls, und
 * widersprechende Skills weichen — samt allem, was auf ihnen aufbaut.
 *
 * Abhaken: der Skill geht, und mit ihm alles, was ihn vorausgesetzt hat.
 */
export function applySkillToggle(input: ApplySkillToggleInput): string[] {
    const { skillId, activeSkillIds, allSkills } = input;

    if (activeSkillIds.includes(skillId)) {
        return removeSkillAndDependents(activeSkillIds, skillId, allSkills);
    }

    const skill = allSkills.find(s => s.id === skillId);
    if (!skill) return [...activeSkillIds];

    let nextIds = [...activeSkillIds, skillId];

    parseSkillList(skill.requires).forEach(reqId => {
        if (!nextIds.includes(reqId)) nextIds.push(reqId);
    });

    // Widersprechende Skills weichen — und mit ihnen, was sie voraussetzt.
    conflictingIds(skillId, nextIds, allSkills).forEach(conflictId => {
        if (nextIds.includes(conflictId)) {
            nextIds = removeSkillAndDependents(nextIds, conflictId, allSkills);
        }
    });

    return nextIds;
}
