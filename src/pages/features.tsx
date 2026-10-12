import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight, Workflow, GraduationCap, Puzzle, BookOpenCheck, Cpu } from 'lucide-react';
import MarketingLayout from '../layouts/MarketingLayout';
import { cn } from '@/lib/utils';
import { Abschnitt, AbschnittsKopf, Kachel, NACH_KOPF, Produktbild, RASTER, Symbol } from '@/components/marketing/site/Bausteine';
import { FunktionsNavigation } from '@/components/marketing/site/FunktionsSeite';
import { HaeufigeFragen } from '@/components/marketing/site/HaeufigeFragen';

const BEREICHE = [
    { icon: Workflow, name: 'Ablauf', href: '/features/workflow', text: 'Von der Musterlösung über die Texterkennung bis zur fertigen Einschätzungsliste.' },
    { icon: GraduationCap, name: 'Expertise', href: '/features/expertise', text: 'Beschreiben Sie in eigenen Worten, worauf es in Ihrem Fach ankommt.' },
    { icon: Puzzle, name: 'Skills', href: '/features/skills', text: 'Zuschaltbare Regeln für typische Aufgabenarten, etwa gleichwertige Rechenwege.' },
    { icon: BookOpenCheck, name: 'Erfahrungsschatz', href: '/features/memory', text: 'Ihre geprüften Bewertungen werden zum Maßstab für die nächsten Arbeiten.' },
    { icon: Cpu, name: 'Intelligenz', href: '/features/intelligence', text: 'Lokales Modell über Ollama oder Mistral mit eigenem Schlüssel – Sie wählen.' },
];

/**
 * Funktionsuebersicht (neu seit 12.10.2026): ein Einstieg in die fuenf
 * Bereiche, dann die haeufigen Fragen. Die Einzelheiten stehen auf den
 * Unterseiten, die alle dieselbe Vorlage nutzen.
 */
export default function FeaturesPage() {
    return (
        <MarketingLayout>
            <Head>
                <title>Funktionen | Koreki</title>
                <meta name="description" content="Was Koreki kann: Musterlösung, Texterkennung, Vorschläge mit Punkten und Feedback, Expertise, Skills, Erfahrungsschatz und freie Modellwahl." />
            </Head>

            <Abschnitt karo className="pt-10 md:pt-12">
                    <FunktionsNavigation />
                    <div className="mt-12 text-center">
                        <p className="text-sm font-medium text-primary mb-3">Funktionen</p>
                        <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] text-foreground max-w-3xl mx-auto">
                            Alles, was eine Korrektur braucht. Nichts darüber hinaus.
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Koreki übernimmt das Lesen und Vergleichen. Das Urteil bleibt bei Ihnen – und jede Einstellung lässt sich an Ihr Fach anpassen.
                        </p>
                    </div>
                <div className="mt-12">
                    <Produktbild src="/marketing/uebersicht.webp" alt="Koreki mit Musterlösung, Schülerarbeiten und Stapelverarbeitung" />
                </div>
            </Abschnitt>

            <Abschnitt>
                    <AbschnittsKopf kicker="Die Bereiche" titel="Fünf Bausteine, die zusammenwirken." />
                    <div className={cn(NACH_KOPF, RASTER, "sm:grid-cols-2 lg:grid-cols-3")}>
                        {BEREICHE.map(({ icon: Icon, name, href, text }) => (
                            <Link key={href} href={href} className="group">
                                <Kachel className="h-full transition-colors group-hover:ring-1 group-hover:ring-primary/30">
                                    <Symbol><Icon size={20} /></Symbol>
                                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                                        {name}
                                        <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                    </h3>
                                    <p className="mt-1.5 text-sm/relaxed text-muted-foreground">{text}</p>
                                </Kachel>
                            </Link>
                        ))}
                    </div>
            </Abschnitt>

            <HaeufigeFragen />
        </MarketingLayout>
    );
}
