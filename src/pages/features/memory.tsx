import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function MemoryFeature() {
    return (
        <FunktionsSeite
            seitentitel="Erfahrungsschatz | Koreki"
            beschreibung="Gespeicherte Bewertungsbeispiele als Maßstab: So bewertet Koreki neue Arbeiten so, wie du es bisher getan hast."
            kicker="Erfahrungsschatz"
            titel="Deine Beispiele werden zum Maßstab."
            text="Hast du eine Antwort bewertet, kannst du sie als Beispiel speichern. Koreki zieht diese Beispiele bei den nächsten Arbeiten heran."
            bild={{ src: '/marketing/pruefansicht.webp', alt: 'Prüfansicht, aus der eine Bewertung in den Erfahrungsschatz übernommen werden kann' }}
            punkte={[
                { titel: 'Direkt aus der Prüfansicht', text: 'Eine Bewertung, die du geprüft oder angepasst hast, übernimmst du mit einem Klick in den Erfahrungsschatz.' },
                { titel: 'Gute und lückenhafte Antworten', text: 'Speichere Beispiele für volle Punktzahl ebenso wie für typische Fehler – beides schärft den Maßstab.' },
                { titel: 'Je Klassenarbeit auswählbar', text: 'Du entscheidest, welcher Erfahrungsschatz für eine Korrektur gilt. Ohne Auswahl korrigiert Koreki nach Musterlösung und Expertise.' },
                { titel: 'Nachvollziehbar', text: 'Jedes Beispiel bleibt einsehbar und änderbar. Nichts geschieht im Verborgenen.' },
            ]}
        />
    );
}
