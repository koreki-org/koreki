import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function SkillsFeature() {
    return (
        <FunktionsSeite
            seitentitel="Skills | Koreki"
            beschreibung="Zuschaltbare Bewertungsbausteine für typische Aufgabenarten – zum Beispiel mathematische Äquivalenz."
            kicker="Skills"
            titel="Bausteine für typische Aufgaben."
            text="Skills sind zuschaltbare Regeln für bestimmte Aufgabenarten. Sie sagen Koreki zum Beispiel, dass gleichwertige Rechenwege gleich viel zählen."
            punkte={[
                { titel: 'Zuschalten statt erklären', text: 'Statt dieselbe Regel in jeder Expertise neu zu formulieren, schaltest du den passenden Skill einfach dazu.' },
                { titel: 'Mitgelieferte Sammlungen', text: 'Für naturwissenschaftliche Fächer gibt es eine fertige Sammlung, die du unverändert nutzen oder anpassen kannst.' },
                { titel: 'Eigene Skills', text: 'Schreib eigene Regeln für Aufgabenarten, die in deinem Unterricht häufig vorkommen.' },
                { titel: 'Mit der Expertise kombinierbar', text: 'Expertise beschreibt dein Fach, Skills die Aufgabenart. Beides wirkt zusammen auf jeden Vorschlag.' },
            ]}
        />
    );
}
