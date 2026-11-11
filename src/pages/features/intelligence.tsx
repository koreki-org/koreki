import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function IntelligenceFeature() {
    return (
        <FunktionsSeite
            seitentitel="Intelligenz | Koreki"
            beschreibung="Wähle, welches Sprachmodell korrigiert: lokal über Ollama oder über Mittwald bzw. Mistral mit eigenem Schlüssel."
            kicker="Intelligenz"
            titel="Du wählst, welche KI korrigiert."
            text="Koreki ist an kein Modell gebunden. Du entscheidest, ob ein Modell auf deinem eigenen Rechner arbeitet oder ein Anbieter mit deinem Schlüssel."
            bild={{ src: '/marketing/intelligenz.webp', schmal: true, alt: 'KI-Profil „Standard“ mit Feineinstellungen für Korrektur und Texterkennung' }}
            punkte={[
                { titel: 'Lokal über Ollama', text: 'Das Modell läuft auf deinem Gerät oder dem Schulserver. Die Arbeiten verlassen dabei nicht dein Netzwerk.' },
                { titel: 'Mittwald oder Mistral mit eigenem Schlüssel', text: 'Wer keinen leistungsfähigen Rechner hat, nutzt eine KI in der EU. Dateinamen werden vorher durch Pseudonyme ersetzt, Namen auf dem Blatt schwärzt du.' },
                { titel: 'Einstellungen als Profile', text: 'Leg verschiedene Modell-Einstellungen als Profile an und wähle je Klassenarbeit das passende.' },
                { titel: 'Hinweise zur Hardware', text: 'Welche Modelle sich für welchen Rechner eignen, steht in der Einrichtungsanleitung der Desktop-Version.' },
            ]}
        />
    );
}
