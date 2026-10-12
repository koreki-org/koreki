import React from 'react';
import { FunktionsSeite } from '@/components/marketing/site/FunktionsSeite';

export default function IntelligenceFeature() {
    return (
        <FunktionsSeite
            seitentitel="Intelligenz | Koreki"
            beschreibung="Wählen Sie, welches Sprachmodell korrigiert: lokal über Ollama oder über Mistral mit eigenem Schlüssel."
            kicker="Intelligenz"
            titel="Sie wählen, welche KI korrigiert."
            text="Koreki ist an kein Modell gebunden. Sie entscheiden, ob ein Modell auf Ihrem eigenen Rechner arbeitet oder ein Anbieter mit Ihrem Schlüssel."
            punkte={[
                { titel: 'Lokal über Ollama', text: 'Das Modell läuft auf Ihrem Gerät oder dem Schulserver. Die Arbeiten verlassen dabei nicht Ihr Netzwerk.' },
                { titel: 'Mistral mit eigenem Schlüssel', text: 'Wer keinen leistungsfähigen Rechner hat, nutzt Mistral. Namen werden vorher pseudonymisiert.' },
                { titel: 'Einstellungen als Profile', text: 'Legen Sie verschiedene Modell-Einstellungen als Profile an und wählen Sie je Klassenarbeit das passende.' },
                { titel: 'Hinweise zur Hardware', text: 'Welche Modelle sich für welchen Rechner eignen, steht in der Einrichtungsanleitung der Desktop-Version.' },
            ]}
        />
    );
}
