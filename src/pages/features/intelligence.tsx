import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function IntelligenceFeature() {
    return (
        <FunktionsSeite
            seitentitel="Intelligenz | Koreki"
            beschreibung="Wähle, welches Sprachmodell korrigiert: lokal über Ollama oder über Mistral mit eigenem Schlüssel."
            kicker="Intelligenz"
            titel="Du wählst, welche KI korrigiert."
            text="Koreki ist an kein Modell gebunden. Du entscheidest, ob ein Modell auf deinem eigenen Rechner arbeitet oder ein Anbieter mit deinem Schlüssel."
            punkte={[
                { titel: 'Lokal über Ollama', text: 'Das Modell läuft auf deinem Gerät oder dem Schulserver. Die Arbeiten verlassen dabei nicht dein Netzwerk.' },
                { titel: 'Mistral mit eigenem Schlüssel', text: 'Wer keinen leistungsfähigen Rechner hat, nutzt Mistral. Namen werden vorher pseudonymisiert.' },
                { titel: 'Einstellungen als Profile', text: 'Leg verschiedene Modell-Einstellungen als Profile an und wähle je Klassenarbeit das passende.' },
                { titel: 'Hinweise zur Hardware', text: 'Welche Modelle sich für welchen Rechner eignen, steht in der Einrichtungsanleitung der Desktop-Version.' },
            ]}
        />
    );
}
