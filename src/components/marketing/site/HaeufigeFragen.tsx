import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Abschnitt, AbschnittsKopf } from './Bausteine';

/*
 * Antworten beschreiben, was das System tut — ohne Superlative und ohne
 * Rechtsstatus (marketing-communication §3). Lizenz: PolyForm Noncommercial,
 * also "Quellcode einsehbar", nicht "Open Source".
 */
const FRAGEN = [
    {
        frage: 'Braucht Koreki eine Internetverbindung?',
        antwort: 'Nicht, wenn Sie ein lokales Modell über Ollama nutzen – dann läuft die Korrektur vollständig auf Ihrem Rechner oder dem Schulserver. Mit Mistral werden die Arbeiten ohne Namen an Mistral übertragen.',
    },
    {
        frage: 'Was passiert mit den Schülerdaten?',
        antwort: 'Bei lokaler Nutzung bleiben sie auf Ihrem Gerät bzw. im Schulnetz. Namen werden vor jeder Übergabe an eine KI durch Platzhalter ersetzt. Koreki selbst erhebt keine Daten für eigene Zwecke.',
    },
    {
        frage: 'Was kostet Koreki?',
        antwort: 'Desktop-Version und Community Edition sind für den nicht-kommerziellen Einsatz kostenlos (Lizenz: PolyForm Noncommercial). Nutzen Sie Mistral, berechnet Mistral die Nutzung über Ihren eigenen Schlüssel.',
    },
    {
        frage: 'Vergibt Koreki die Noten?',
        antwort: 'Nein. Koreki macht Vorschläge für Punkte und Rückmeldungen. Jede Bewertung prüfen, ändern und bestätigen Sie selbst.',
    },
    {
        frage: 'Kann ich Koreki an mein Fach anpassen?',
        antwort: 'Ja. Mit der Expertise beschreiben Sie, worauf es in Ihrem Fach ankommt; Skills ergänzen Regeln für bestimmte Aufgabenarten; der Erfahrungsschatz hält Ihre Bewertungsbeispiele fest.',
    },
];

export const HaeufigeFragen: React.FC = () => (
    <Abschnitt>
        <div className="max-w-3xl mx-auto">
            <AbschnittsKopf zentriert kicker="Häufige Fragen" titel="Was Lehrkräfte uns fragen." />
            <div className="mt-12 divide-y divide-border border-y border-border">
                {FRAGEN.map(({ frage, antwort }) => (
                    <details key={frage} className="group py-5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-foreground">
                            {frage}
                            <ChevronDown size={18} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-3 text-muted-foreground">{antwort}</p>
                    </details>
                ))}
            </div>
        </div>
    </Abschnitt>
);
