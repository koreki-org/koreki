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
                { titel: 'Zuschalten statt erklären', text: 'Statt dieselbe Regel in jeder Expertise neu zu formulieren, schalten Sie den passenden Skill einfach dazu.' },
                { titel: 'Mitgelieferte Sammlungen', text: 'Für naturwissenschaftliche Fächer gibt es eine fertige Sammlung, die Sie unverändert nutzen oder anpassen können.' },
                { titel: 'Eigene Skills', text: 'Schreiben Sie eigene Regeln für Aufgabenarten, die in Ihrem Unterricht häufig vorkommen.' },
                { titel: 'Mit der Expertise kombinierbar', text: 'Expertise beschreibt Ihr Fach, Skills die Aufgabenart. Beides wirkt zusammen auf jeden Vorschlag.' },
            ]}
        />
    );
}
