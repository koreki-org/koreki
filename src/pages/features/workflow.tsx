import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function WorkflowFeature() {
    return (
        <FunktionsSeite
            seitentitel="Ablauf | Koreki"
            beschreibung="Von der Musterlösung bis zur Einschätzungsliste: So korrigierst du eine Klassenarbeit mit Koreki."
            kicker="Ablauf"
            titel="Von der Musterlösung bis zur fertigen Liste."
            text="Du lädst Musterlösung und Arbeiten hoch, prüfst die Vorschläge und gibst Liste und Rückmeldungen aus. Jeder Schritt bleibt sichtbar und änderbar."
            bild={{ src: '/marketing/musterloesung.webp', alt: 'Musterlösung mit erkannter Aufgabenstruktur und Punkten' }}
            punkte={[
                { titel: 'Musterlösung als Maßstab', text: 'Koreki erkennt Aufgaben und Punkte aus deinem Erwartungshorizont. Du kannst jede Aufgabe und jede Punktzahl anpassen, bevor korrigiert wird.' },
                { titel: 'Ganze Stapel auf einmal', text: 'Lade die Arbeiten einer Klasse gemeinsam hoch. Ein eingescannter Stapel lässt sich in einzelne Arbeiten aufteilen.' },
                { titel: 'Texterkennung zum Prüfen', text: 'Bei Scans zeigt Koreki den erkannten Text neben dem Original. Unsichere Stellen sind markiert, und du kannst sie korrigieren.' },
                { titel: 'Moodle-Exporte direkt', text: 'Freitextantworten aus einem Moodle-Test übernimmst du als XLSX-Export – ohne Umweg über Papier und Scanner.' },
                { titel: 'Vorschläge prüfen', text: 'Links die Schülerantwort, rechts der Vorschlag mit Punkten und Begründung. Du übernimmst oder änderst – Aufgabe für Aufgabe.' },
                { titel: 'Ausgabe für deine Unterlagen', text: 'Am Ende stehen eine Einschätzungsliste als Tabelle und Rückmeldungen für jede Schülerin und jeden Schüler.' },
            ]}
        />
    );
}
