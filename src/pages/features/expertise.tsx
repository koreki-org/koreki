import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function ExpertiseFeature() {
    return (
        <FunktionsSeite
            seitentitel="Expertise | Koreki"
            beschreibung="Leg fest, worauf es in deinem Fach ankommt. Koreki bewertet nach deinen fachlichen Vorgaben."
            kicker="Expertise"
            titel="Dein Fach, deine Maßstäbe."
            text="Mit der Expertise beschreibst du in eigenen Worten, worauf du bei der Korrektur achtest. Koreki richtet seine Vorschläge danach aus."
            punkte={[
                { titel: 'In deinen eigenen Worten', text: 'Zum Beispiel: „Achte vor allem auf logische Korrektheit, Rechtschreibung ist zweitrangig.“ Kein Fachvokabular nötig.' },
                { titel: 'Vorlagen zum Start', text: 'Mitgelieferte Profile, etwa für Mathematik, Informatik oder Wirtschaft, kannst du übernehmen und anpassen.' },
                { titel: 'Eigene Profile', text: 'Leg für jedes Fach oder jede Lerngruppe ein eigenes Profil an und wechsle mit einem Klick.' },
                { titel: 'Teilen im Kollegium', text: 'Profile lassen sich aus einer Datei importieren – so kann eine Fachschaft mit denselben Vorgaben arbeiten.' },
            ]}
        />
    );
}
