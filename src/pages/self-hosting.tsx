import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Check, Github, Container, Cpu, Code2 } from 'lucide-react';
import MarketingLayout from '@/layouts/MarketingLayout';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Abschnitt, AbschnittsKopf, Kachel, NACH_KOPF, RASTER, Symbol } from '@/components/marketing/site/Bausteine';
import { ModelProfiles } from '@/components/marketing/ModelProfiles';
import { HaeufigeFragen } from '@/components/marketing/site/HaeufigeFragen';

const VARIANTEN = [
    {
        name: 'Community Single',
        wer: 'Für einzelne Lehrkräfte oder kleine Teams',
        text: 'Ein Rechner, ein Nutzer – etwa auf dem eigenen PC, einem NAS oder Heimserver.',
        punkte: ['Keine Anmeldung nötig', 'Daten im lokalen Dateisystem', 'Ollama oder Mistral mit eigenem Schlüssel'],
    },
    {
        name: 'Community Multi',
        wer: 'Für Schulen und Fachschaften',
        text: 'Ein Server der Schule für das ganze Kollegium, mit zentraler Benutzerverwaltung.',
        punkte: ['Anmeldung über Keycloak / OIDC', 'Zentrale Verwaltung von Nutzern und Rollen', 'Ein KI-Zugang für alle Nutzer'],
    },
];

const TECHNIK = [
    { icon: Container, titel: 'Docker', text: 'Fertige Images für Koreki, Keycloak und PostgreSQL. Start mit Docker Compose.' },
    { icon: Cpu, titel: 'Lokale Modelle', text: 'Ollama ist direkt angebunden. Mit eigener Grafikkarte läuft die KI ohne Internet.' },
    { icon: Code2, titel: 'Quellcode einsehbar', text: 'Lizenz: PolyForm Noncommercial. Prüfen und anpassen für den nicht-kommerziellen Einsatz.' },
];

export default function SelfHostingPage() {
    return (
        <MarketingLayout>
            <Head>
                <title>Für Schulen: Community Edition | Koreki</title>
                <meta name="description" content="Koreki auf dem eigenen Server: die Community Edition für einzelne Lehrkräfte oder das ganze Kollegium, mit Docker und lokalen Modellen." />
            </Head>

            <Abschnitt kopfband className="pt-16 md:pt-24 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">Community Edition</p>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-0.045em] leading-[1.05] text-foreground max-w-3xl mx-auto">
                        Koreki auf dem Server deiner Schule.
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Einmal eingerichtet, für alle nutzbar. Die Arbeiten bleiben im Schulnetz, und die Schule behält die Kontrolle über Nutzer und KI-Zugang.
                    </p>
                    <a
                        href="https://github.com/koreki-org/koreki/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: 'default', size: 'lg' }), "mt-10 h-12 px-6 text-base")}
                    >
                        <Github size={18} /> Installationsanleitung auf GitHub
                    </a>
            </Abschnitt>

            <Abschnitt>
                    <AbschnittsKopf kicker="Zwei Varianten" titel="Für einen Rechner oder für das ganze Kollegium." />
                    <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-2")}>
                        {VARIANTEN.map((v) => (
                            <Kachel key={v.name}>
                                <p className="text-sm text-muted-foreground">{v.wer}</p>
                                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{v.name}</h3>
                                <p className="mt-2 text-muted-foreground">{v.text}</p>
                                <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                                    {v.punkte.map((p) => (
                                        <li key={p} className="flex gap-2.5"><Check size={16} className="text-primary shrink-0 mt-0.5" />{p}</li>
                                    ))}
                                </ul>
                            </Kachel>
                        ))}
                    </div>
            </Abschnitt>

            <Abschnitt>
                    <AbschnittsKopf kicker="Technik" titel="Was deine IT wissen möchte." />
                    <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-3")}>
                        {TECHNIK.map(({ icon: Icon, titel, text }) => (
                            <Kachel key={titel}>
                                <Symbol><Icon size={20} /></Symbol>
                                <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{titel}</h3>
                                <p className="mt-1.5 text-sm/relaxed text-muted-foreground">{text}</p>
                            </Kachel>
                        ))}
                    </div>
                    <div className="mt-12">
                        <ModelProfiles />
                    </div>
                    <p className="mt-10 text-sm text-muted-foreground">
                        Lieber ohne Server? <Link href="/desktop" className="text-primary hover:underline">Koreki Desktop</Link> läuft direkt auf deinem Rechner.
                    </p>
            </Abschnitt>

            <HaeufigeFragen />
        </MarketingLayout>
    );
}
