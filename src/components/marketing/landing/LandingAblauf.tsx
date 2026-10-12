import React from 'react';
import { cn } from '@/lib/utils';
import { Abschnitt, AbschnittsKopf, NACH_KOPF, Produktbild, RASTER } from '../site/Bausteine';

const schritte = [
    {
        nr: '01',
        titel: 'Musterlösung hochladen',
        text: 'Ihr Erwartungshorizont mit Punkten je Aufgabe – als PDF oder Scan. Koreki erkennt die Aufgabenstruktur.',
        bild: '/marketing/musterloesung.webp',
        alt: 'Musterlösung mit erkannten Aufgaben und Punkten',
        breite: 'w-[115%]',
    },
    {
        nr: '02',
        titel: 'Arbeiten der Klasse hochladen',
        text: 'Getippt oder gescannt. Namen werden vor der Übergabe an die KI durch Platzhalter ersetzt.',
        bild: '/marketing/stapel.webp',
        alt: 'Stapel mit den Arbeiten der Klasse, bereit zur Korrektur',
        breite: 'w-[190%]',
    },
    {
        nr: '03',
        titel: 'Prüfen und exportieren',
        text: 'Vorschläge übernehmen oder ändern. Danach Einschätzungsliste und Einzel-Feedbacks ausgeben.',
        bild: '/marketing/einschaetzungsliste.webp',
        alt: 'Exportierte Einschätzungsliste als Tabelle',
        breite: 'w-[200%]',
    },
];

export const LandingAblauf: React.FC = () => (
    <Abschnitt id="ablauf">
            <AbschnittsKopf
                zentriert
                kicker="So funktioniert es"
                titel="Drei Schritte, die Sie aus Ihrer eigenen Korrektur kennen."
            />
            <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-3")}>
                {schritte.map((s) => (
                    <div key={s.nr} className="bg-card rounded-2xl shadow-card overflow-hidden flex flex-col">
                        {/* Ausschnitt statt Miniatur: links oben, gross genug zum Lesen */}
                        <div className="relative h-52 bg-background overflow-hidden border-b border-border/60">
                            <Produktbild
                                src={s.bild}
                                alt={s.alt}
                                klein
                                className={cn("absolute left-5", s.breite, s.breite === "w-[115%]" ? "top-5" : "top-1/2 -translate-y-1/2")}
                            />
                        </div>
                        <div className="p-6 md:p-8">
                            <p className="text-sm text-muted-foreground tabular-nums mb-1.5">{s.nr}</p>
                            <h3 className="text-lg font-semibold tracking-tight text-foreground mb-1.5">{s.titel}</h3>
                            <p className="text-sm/relaxed text-muted-foreground">{s.text}</p>
                        </div>
                    </div>
                ))}
            </div>
    </Abschnitt>
);
