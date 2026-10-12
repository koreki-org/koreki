import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function ExpertiseFeature() {
    return (
        <FunktionsSeite
            seitentitel="Expertise | Koreki"
            beschreibung="Legen Sie fest, worauf es in Ihrem Fach ankommt. Koreki bewertet nach Ihren fachlichen Vorgaben."
            kicker="Expertise"
            titel="Ihr Fach, Ihre Maßstäbe."
            text="Mit der Expertise beschreiben Sie in eigenen Worten, worauf Sie bei der Korrektur achten. Koreki richtet seine Vorschläge danach aus."
            punkte={[
                { titel: 'In Ihren eigenen Worten', text: 'Zum Beispiel: „Achte vor allem auf logische Korrektheit, Rechtschreibung ist zweitrangig.“ Kein Fachvokabular nötig.' },
                { titel: 'Vorlagen zum Start', text: 'Mitgelieferte Profile, etwa für Mathematik, Informatik oder Wirtschaft, können Sie übernehmen und anpassen.' },
                { titel: 'Eigene Profile', text: 'Legen Sie für jedes Fach oder jede Lerngruppe ein eigenes Profil an und wechseln Sie mit einem Klick.' },
                { titel: 'Teilen im Kollegium', text: 'Profile lassen sich aus einer Datei importieren – so kann eine Fachschaft mit denselben Vorgaben arbeiten.' },
            ]}
        />
    );
}
