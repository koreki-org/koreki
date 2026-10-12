import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function WorkflowFeature() {
    return (
        <FunktionsSeite
            seitentitel="Ablauf | Koreki"
            beschreibung="Von der Musterlösung bis zur Einschätzungsliste: So korrigieren Sie eine Klassenarbeit mit Koreki."
            kicker="Ablauf"
            titel="Von der Musterlösung bis zur fertigen Liste."
            text="Sie laden Musterlösung und Arbeiten hoch, prüfen die Vorschläge und geben Liste und Rückmeldungen aus. Jeder Schritt bleibt sichtbar und änderbar."
            bild={{ src: '/marketing/musterloesung.webp', alt: 'Musterlösung mit erkannter Aufgabenstruktur und Punkten' }}
            punkte={[
                { titel: 'Musterlösung als Maßstab', text: 'Koreki erkennt Aufgaben und Punkte aus Ihrem Erwartungshorizont. Sie können jede Aufgabe und jede Punktzahl anpassen, bevor korrigiert wird.' },
                { titel: 'Ganze Stapel auf einmal', text: 'Laden Sie die Arbeiten einer Klasse gemeinsam hoch. Ein eingescannter Stapel lässt sich in einzelne Arbeiten aufteilen.' },
                { titel: 'Texterkennung zum Prüfen', text: 'Bei Scans zeigt Koreki den erkannten Text neben dem Original. Unsichere Stellen sind markiert, und Sie können sie korrigieren.' },
                { titel: 'Moodle-Exporte direkt', text: 'Freitextantworten aus einem Moodle-Test übernehmen Sie als XLSX-Export – ohne Umweg über Papier und Scanner.' },
                { titel: 'Vorschläge prüfen', text: 'Links die Schülerantwort, rechts der Vorschlag mit Punkten und Begründung. Sie übernehmen oder ändern – Aufgabe für Aufgabe.' },
                { titel: 'Ausgabe für Ihre Unterlagen', text: 'Am Ende stehen eine Einschätzungsliste als Tabelle und Rückmeldungen für jede Schülerin und jeden Schüler.' },
            ]}
        />
    );
}
