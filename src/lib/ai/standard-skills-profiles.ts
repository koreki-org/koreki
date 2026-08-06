/**
 * Koreki Standard Skill Profiles Registry
 * 🏮🛡️🏛️
 * Pre-defined configurations combining multiple modular correction skills.
 */

export interface StandardSkillProfile {
    name: string;
    description: string;
    activeSkillIds: string[];
    isSystem: boolean;
}

/** Name des Profils, das gilt, solange der Nutzer keines ausgewaehlt hat. */
export const DEFAULT_SKILL_PROFILE_NAME = 'MINT Standard (Allgemein)';

export const STANDARD_SKILL_PROFILES: StandardSkillProfile[] = [
    {
        name: "Grundschule Mathematik",
        description: "Perfekt auf das Grundschulniveau abgestimmtes Set. Kombiniert kulante Folgefehler-Kompensation, Orthographie-Ignoranz, klassisch einfache Korrekturzeichen, Rechenweg-Ergebnis-Trennung und aktives Nachrechnen.",
        activeSkillIds: ["skill-consecutive-errors", "skill-orthography-lenient", "skill-marks-classic", "skill-feedback-general", "skill-math-isolated-grading", "skill-math-scratchpad"],
        isSystem: true
    },
    {
        name: "MINT Standard (Allgemein)",
        description: "Standardkonfiguration für Mathematik, Physik und Chemie. Enthält Folgefehler-Tracking, mathematische Äquivalenz, Rechenweg-Ergebnis-Trennung, aktives Nachrechnen sowie klassische Korrekturzeichen mit allgemeinem Feedback.",
        // Ohne ein Korrekturzeichen-Skill sind die Kuerzel im Feedback nirgends definiert — das
        // Modell erfindet sie dann aus eigenem Weltwissen und setzt sie uneinheitlich ein.
        // skill-feedback-general setzt skill-marks-classic voraus, beide gehoeren deshalb zusammen.
        activeSkillIds: ["skill-consecutive-errors", "skill-math-equivalence", "skill-math-isolated-grading", "skill-math-scratchpad", "skill-marks-classic", "skill-feedback-general"],
        isSystem: true
    },
    {
        name: "Bayern Standard (MINT & Feedback)",
        description: "Optimiert für bayerische Realschulen und Gymnasien. Enthält bayerische Korrekturzeichen, Folgefehler-Tracking, mathematische Äquivalenz, Rechenweg-Ergebnis-Trennung und Sandwich-Feedback.",
        activeSkillIds: ["skill-consecutive-errors", "skill-math-equivalence", "skill-math-isolated-grading", "skill-math-scratchpad", "skill-marks-bayern", "skill-feedback-sandwich"],
        isSystem: true
    },
    {
        name: "Sprachen & Geisteswissenschaften Standard",
        description: "Fokus auf Textverständnis und Rechtschreibung. Nutzt das NRW-Korrekturschema und die Sandwich-Feedback-Methode.",
        activeSkillIds: ["skill-marks-nrw", "skill-feedback-sandwich"],
        isSystem: true
    },
    {
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
    const standard = STANDARD_SKILL_PROFILES.find(p => p.name === DEFAULT_SKILL_PROFILE_NAME);
    return [...(standard?.activeSkillIds || [])];
}
