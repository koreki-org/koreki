import React from 'react';
import { Cpu, ShieldCheck, UserCheck, Code2, Laptop, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Abschnitt, AbschnittsKopf } from '../site/Bausteine';

const fakten = [
    { icon: Cpu, titel: 'Lokal, wenn du willst', text: 'Mit einem lokalen Modell über Ollama verlässt keine Arbeit dein Gerät.' },
    { icon: ShieldCheck, titel: 'Keine Namen an die KI', text: 'Namen werden vor der Übergabe pseudonymisiert – auch bei einem Cloud-Modell.' },
    { icon: UserCheck, titel: 'Du entscheidest jede Note', text: 'Koreki macht ausschließlich Vorschläge. Nichts geht ohne deine Prüfung hinaus.' },
    { icon: Code2, titel: 'Nachprüfbar', text: 'Der Quellcode ist einsehbar (Lizenz: PolyForm Noncommercial).' },
];

interface KnotenProps {
    icon: React.ReactNode;
    titel: string;
    text: string;
    marke: string;
    markeTon: 'ok' | 'neutral';
    gestrichelt?: boolean;
}

const Knoten: React.FC<KnotenProps> = ({ icon, titel, text, marke, markeTon, gestrichelt }) => (
    <div className={cn(
        "flex items-center gap-3.5 rounded-xl p-4",
        gestrichelt ? "border border-dashed border-border" : "bg-background"
    )}>
        <div className="w-10 h-10 rounded-xl bg-card shadow-card grid place-items-center text-foreground shrink-0">{icon}</div>
        <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{titel}</p>
            <p className="text-xs text-muted-foreground">{text}</p>
        </div>
        <span className={cn(
            "ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            markeTon === 'ok' ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
        )}>
            {marke}
        </span>
    </div>
);

const Verbindung: React.FC<{ text: string; leise?: boolean }> = ({ text, leise }) => (
    <div className={cn("ml-9 h-9 border-l-2 border-dashed pl-4 flex items-center text-xs text-muted-foreground", leise ? "border-border" : "border-primary/30")}>
        {text}
    </div>
);

export const LandingDatenschutz: React.FC = () => (
    <Abschnitt id="datenschutz" band>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
            <div>
                <AbschnittsKopf
                    kicker="Datenschutz"
                    titel="Schülerarbeiten gehören auf deinen Rechner."
                    text="Die Fragen deiner Schulleitung – beantwortet, bevor sie gestellt werden."
                />
                <ul className="mt-8">
                    {fakten.map(({ icon: Icon, titel, text }) => (
                        <li key={titel} className="flex gap-4 py-4 border-t border-primary/10">
                            <div className="w-9 h-9 rounded-xl bg-card shadow-card grid place-items-center text-primary shrink-0">
                                <Icon size={17} />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{titel}</p>
                                <p className="text-sm text-muted-foreground">{text}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="bg-card rounded-hero shadow-lift p-6 md:p-8" aria-label="Weg der Daten">
                <Knoten icon={<Laptop size={19} />} titel="Dein Rechner" text="Arbeiten, Musterlösung, Ergebnisse" marke="bleibt hier" markeTon="ok" />
                <Verbindung text="Namen ersetzt: Lena M. → Schüler #14" />
                <Knoten icon={<Cpu size={19} />} titel="Lokales Modell" text="Ollama, auf demselben Gerät" marke="offline möglich" markeTon="ok" />
                <Verbindung text="oder" leise />
                <Knoten icon={<Cloud size={19} />} titel="Mistral" text="mit deinem eigenen Schlüssel" marke="optional" markeTon="neutral" gestrichelt />
            </div>
        </div>
    </Abschnitt>
);
