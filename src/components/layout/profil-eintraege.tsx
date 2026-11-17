import React from 'react';
import { GraduationCap, Wrench, BookOpen, Brain } from 'lucide-react';

/**
 * Die vier Profil-Familien als EINE Liste.
 *
 * Seit dem 17.11.2026 erscheinen sie an zwei Stellen: in der Seitenleiste
 * (ab `md`) und als Schalter in der Kopfleiste (darunter). Beide lesen diese
 * Liste — sonst stuende jeder Vorgabewert ("MINT Standard",
 * "Standard-Korrektur" …) zweimal da, und eine Familie bekaeme irgendwann an
 * einer Stelle einen anderen Namen als an der anderen.
 */
export interface ProfilEintrag {
    schluessel: string;
    icon: React.ReactNode;
    label: string;
    wert: string;
    beschreibung: string;
    /** Weicht vom Vorgabewert ab. */
    aktiv: boolean;
    onOeffnen: () => void;
}

export interface ProfilQuellen {
    expertise?: string;
    skills?: string;
    erfahrungsschatz?: string;
    intelligenz?: string;
    onExpertise?: () => void;
    onSkills?: () => void;
    onErfahrungsschatz?: () => void;
    onIntelligenz?: () => void;
}

const eintrag = (
    schluessel: string, icon: React.ReactNode, label: string, wert: string | undefined,
    vorgabe: string, beschreibung: string, onOeffnen: (() => void) | undefined
): ProfilEintrag => ({
    schluessel, icon, label, beschreibung,
    wert: wert || vorgabe,
    aktiv: !!wert && wert !== vorgabe,
    onOeffnen: onOeffnen ?? (() => undefined)
});

export function profilEintraege(q: ProfilQuellen): ProfilEintrag[] {
    return [
        eintrag('expertise', <GraduationCap size={16} />, 'Expertise', q.expertise, 'Standard',
            'Fachprofile verwalten: worauf es in deinem Fach ankommt', q.onExpertise),
        eintrag('skills', <Wrench size={16} />, 'Skills', q.skills, 'MINT Standard',
            'Zuschaltbare Regeln für typische Aufgabenarten', q.onSkills),
        eintrag('erfahrungsschatz', <BookOpen size={16} />, 'Erfahrungsschatz', q.erfahrungsschatz, 'Standard-Korrektur',
            'Bewertete Beispiele als Maßstab', q.onErfahrungsschatz),
        eintrag('intelligenz', <Brain size={16} />, 'Intelligenz', q.intelligenz, 'Standard',
            'Welches Modell korrigiert und wie genau', q.onIntelligenz)
    ];
}
