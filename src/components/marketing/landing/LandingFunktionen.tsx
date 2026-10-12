import React from 'react';
import { PenLine, Calculator, MessageSquare, BookOpenCheck, GraduationCap, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Abschnitt, AbschnittsKopf, Kachel, NACH_KOPF, Produktbild, RASTER, Symbol } from '../site/Bausteine';

/*
 * Jede Aussage hier beschreibt, was das System TUT — nicht, wie gut sein
 * Ergebnis ist (marketing-communication §3).
 */
const funktionen = [
    { icon: PenLine, titel: 'Liest Handschrift', text: 'Gescannte Arbeiten werden zu Text, den Sie neben dem Original prüfen und korrigieren.' },
    { icon: Calculator, titel: 'Rechnet nach', text: 'Rechenwege werden nachgerechnet, nicht geschätzt. Folgefehler werden als solche erkannt.' },
    { icon: BookOpenCheck, titel: 'Ihr Erfahrungsschatz', text: 'Bewertungsbeispiele, die Sie gespeichert haben, werden zum Maßstab für die nächsten Arbeiten.' },
    { icon: GraduationCap, titel: 'Ihre Fachsprache', text: 'Legen Sie fest, worauf es in Ihrem Fach ankommt – Koreki bewertet danach.' },
    { icon: FileSpreadsheet, titel: 'Export für Ihre Unterlagen', text: 'Einschätzungsliste als Tabelle und Rückmeldungen zum Ausdrucken oder digital.' },
];

export const LandingFunktionen: React.FC = () => (
    <Abschnitt>
            <AbschnittsKopf zentriert
                kicker="Funktionen"
                titel="Gebaut für echte Klassenarbeiten – nicht für Demos."
                text="Handschrift, Rechenwege, Folgefehler: Koreki arbeitet mit dem, was tatsächlich auf Ihrem Tisch liegt."
            />

            <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-3")}>
                <Kachel className="md:col-span-2 md:row-span-2 flex flex-col">
                    <Symbol><MessageSquare size={20} /></Symbol>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">Feedback für jede Arbeit</h3>
                    <p className="mt-1.5 text-sm/relaxed text-muted-foreground max-w-md">
                        Zu jeder Aufgabe eine Rückmeldung, die erklärt, was gelungen ist und was fehlt – für jede Schülerin und jeden Schüler.
                    </p>
                    <div className="mt-auto pt-6">
                        <Produktbild src="/marketing/feedback.webp" alt="Ausgegebenes Einzel-Feedback für einen Schüler" klein />
                    </div>
                </Kachel>
                {funktionen.map(({ icon: Icon, titel, text }) => (
                    <Kachel key={titel}>
                        <Symbol><Icon size={20} /></Symbol>
                        <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{titel}</h3>
                        <p className="mt-1.5 text-sm/relaxed text-muted-foreground">{text}</p>
                    </Kachel>
                ))}
            </div>
    </Abschnitt>
);
