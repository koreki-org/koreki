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

export const STANDARD_SKILL_PROFILES: StandardSkillProfile[] = [
    {
        name: "Grundschule Mathematik",
        description: "Perfekt auf das Grundschulniveau abgestimmtes Set. Kombiniert kulante Folgefehler-Kompensation, Orthographie-Ignoranz, klassisch einfache Korrekturzeichen, Rechenweg-Ergebnis-Trennung und aktives Nachrechnen.",
        activeSkillIds: ["skill-consecutive-errors", "skill-orthography-lenient", "skill-marks-classic", "skill-feedback-general", "skill-math-isolated-grading", "skill-math-scratchpad"],
        isSystem: true
    },
    {
        name: "MINT Standard (Allgemein)",
        description: "Standardkonfiguration für Mathematik, Physik und Chemie. Enthält Folgefehler-Tracking, mathematische Äquivalenz, Rechenweg-Ergebnis-Trennung und aktives Nachrechnen.",
        activeSkillIds: ["skill-consecutive-errors", "skill-math-equivalence", "skill-math-isolated-grading", "skill-math-scratchpad"],
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
