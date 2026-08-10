/**
 * Koreki Standard Skill Profiles Registry
 * 🏮🛡️🏛️
 * Pre-defined configurations combining multiple modular correction skills.
 */

export interface StandardSkillProfile {
    /**
     * 🏮 Feste Kennung — bewusst ein Slug und keine generierte ID.
     *
     * Dieselbe Vorlage existiert in drei Ablagen: als Registry-Eintrag (Desktop),
     * als Registry-Eintrag hinter der API (Community) und als Datenbankzeile
     * (SaaS). Eine von Prisma vergebene `cuid()` waere in jeder Umgebung eine
     * andere — es gaebe also keine Kennung, auf die sich eine gespeicherte
     * Auswahl modusuebergreifend berufen koennte. Genau deshalb hing die
     * Identitaet bisher am NAMEN, und `useSkillGovernance` musste ueberall
     * `p.id === ref || p.name === ref` pruefen.
     *
     * Slugs sind stabil, menschenlesbar und in allen drei Modi identisch.
     * Sie duerfen deshalb NIE geaendert werden — eine gespeicherte Auswahl
     * verweist darauf.
     */
    id: string;
    name: string;
    description: string;
    activeSkillIds: string[];
    isSystem: boolean;
}

/** Name des Profils, das gilt, solange der Nutzer keines ausgewaehlt hat. */
export const DEFAULT_SKILL_PROFILE_NAME = 'MINT Standard (Allgemein)';

/** Kennung desselben Profils — der Vorzugsweg, den Namen loest nur noch Altbestand auf. */
export const DEFAULT_SKILL_PROFILE_ID = 'system-mint-standard';

export const STANDARD_SKILL_PROFILES: StandardSkillProfile[] = [
    {
        id: "system-grundschule-mathematik",
        name: "Grundschule Mathematik",
        description: "Perfekt auf das Grundschulniveau abgestimmtes Set. Kombiniert kulante Folgefehler-Kompensation, Orthographie-Ignoranz, klassisch einfache Korrekturzeichen, Rechenweg-Ergebnis-Trennung und aktives Nachrechnen.",
        activeSkillIds: ["skill-consecutive-errors", "skill-orthography-lenient", "skill-marks-classic", "skill-feedback-general", "skill-math-isolated-grading", "skill-math-scratchpad"],
        isSystem: true
    },
    {
        id: DEFAULT_SKILL_PROFILE_ID,
        name: "MINT Standard (Allgemein)",
        description: "Standardkonfiguration für Mathematik, Physik und Chemie. Enthält Folgefehler-Tracking, mathematische Äquivalenz, Rechenweg-Ergebnis-Trennung, aktives Nachrechnen sowie klassische Korrekturzeichen mit allgemeinem Feedback.",
        // Ohne ein Korrekturzeichen-Skill sind die Kuerzel im Feedback nirgends definiert — das
        // Modell erfindet sie dann aus eigenem Weltwissen und setzt sie uneinheitlich ein.
        // skill-feedback-general setzt skill-marks-classic voraus, beide gehoeren deshalb zusammen.
        activeSkillIds: ["skill-consecutive-errors", "skill-math-equivalence", "skill-math-isolated-grading", "skill-math-scratchpad", "skill-marks-classic", "skill-feedback-general"],
        isSystem: true
    },
    {
        id: "system-bayern-standard",
        name: "Bayern Standard (MINT & Feedback)",
        description: "Optimiert für bayerische Realschulen und Gymnasien. Enthält bayerische Korrekturzeichen, Folgefehler-Tracking, mathematische Äquivalenz, Rechenweg-Ergebnis-Trennung und Sandwich-Feedback.",
        activeSkillIds: ["skill-consecutive-errors", "skill-math-equivalence", "skill-math-isolated-grading", "skill-math-scratchpad", "skill-marks-bayern", "skill-feedback-sandwich"],
        isSystem: true
    },
    {
        id: "system-sprachen-geistes-standard",
        name: "Sprachen & Geisteswissenschaften Standard",
        description: "Fokus auf Textverständnis und Rechtschreibung. Nutzt das NRW-Korrekturschema und die Sandwich-Feedback-Methode.",
        activeSkillIds: ["skill-marks-nrw", "skill-feedback-sandwich"],
        isSystem: true
    },
    {
        id: "system-kulante-bewertung",
        name: "Kulante Bewertung (Rechtschreibungs-Blind)",
        description: "Ignoriert Rechtschreibung und Grammatik komplett, um ausschließlich die fachlich-inhaltliche Substanz fair zu bewerten.",
        activeSkillIds: ["skill-orthography-lenient", "skill-feedback-sandwich"],
        isSystem: true
    }
];

/**
 * Skill-Set, mit dem ein neu angelegtes Profil startet.
 *
 * Bewusst aus dem Standard-Profil abgeleitet statt als eigene Liste gepflegt: Eine zweite,
 * handgepflegte Kopie laeuft mit der Zeit auseinander — dann startet ein neues Profil
 * stillschweigend ohne Skills, die im Standard laengst gesetzt sind.
 */
export function getDefaultSkillIds(): string[] {
    const standard = STANDARD_SKILL_PROFILES.find(p => p.id === DEFAULT_SKILL_PROFILE_ID);
    return [...(standard?.activeSkillIds || [])];
}
