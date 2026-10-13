import React from 'react';
import Link from 'next/link';
import { Check, Download, ArrowRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Abschnitt, AbschnittsKopf, NACH_KOPF, RASTER } from '../site/Bausteine';

const editionen = [
    {
        wer: 'Für einzelne Lehrkräfte',
        name: 'Koreki Desktop',
        text: 'Installieren wie jedes andere Programm und direkt loslegen.',
        punkte: ['Windows 10/11 und Ubuntu', 'Lokales Modell oder eigener Mistral-Schlüssel', 'Kostenlos für den nicht-kommerziellen Einsatz'],
        href: '/desktop',
        knopf: 'Herunterladen',
        haupt: true,
    },
    {
        wer: 'Für Schulen und Fachschaften',
        name: 'Community Edition',
        text: 'Auf einem Server der Schule – einmal eingerichtet, für alle nutzbar.',
        punkte: ['Zentrale Benutzerverwaltung', 'Ein KI-Zugang für das ganze Kollegium', 'Installation mit Docker'],
        href: '/self-hosting',
        knopf: 'Installationsanleitung',
        haupt: false,
    },
];

export const LandingEditionen: React.FC = () => (
    <Abschnitt>
            <AbschnittsKopf zentriert kicker="Zwei Wege zu Koreki" titel="Für Sie allein oder für die ganze Fachschaft." />
            <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-2")}>
                {editionen.map((e) => (
                    <div
                        key={e.name}
                        className={cn(
                            "bg-card rounded-hero p-6 md:p-8 flex flex-col",
                            e.haupt ? "ring-2 ring-primary shadow-card" : "shadow-card"
                        )}
                    >
                        <p className="text-sm text-muted-foreground">{e.wer}</p>
                        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{e.name}</h3>
                        <p className="mt-2 text-muted-foreground">{e.text}</p>
                        <ul className="mt-6 mb-8 space-y-2.5 text-sm text-muted-foreground">
                            {e.punkte.map((p) => (
                                <li key={p} className="flex gap-2.5"><Check size={16} className="text-primary shrink-0 mt-0.5" />{p}</li>
                            ))}
                        </ul>
                        <Link
                            href={e.href}
                            className={cn(buttonVariants({ variant: e.haupt ? 'default' : 'outline', size: 'lg' }), "mt-auto self-start h-11")}
                        >
                            {e.haupt && <Download size={16} />}{e.knopf}{!e.haupt && <ArrowRight size={16} />}
                        </Link>
                    </div>
                ))}
            </div>
    </Abschnitt>
);

interface LandingSchlussProps {
    href: string;
    text: string;
}

export const LandingSchluss: React.FC<LandingSchlussProps> = ({ href, text }) => (
    <Abschnitt className="border-t border-border text-center md:py-20">
            <AbschnittsKopf
                zentriert
                titel="Probieren Sie es mit Ihrer nächsten Klassenarbeit."
                text="Mit dem mitgelieferten Beispiel sehen Sie, wie Koreki bewertet – bevor Sie eigene Arbeiten hochladen."
            />
            <Link href={href} className={cn(buttonVariants({ variant: 'default', size: 'lg' }), "mt-8 h-12 px-6 text-base")}>
                {text}
            </Link>
    </Abschnitt>
);
