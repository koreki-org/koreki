import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArrowRight } from 'lucide-react';
import MarketingLayout from '@/layouts/MarketingLayout';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Abschnitt, AbschnittsKopf, Kachel, NACH_KOPF, Produktbild, RASTER } from './Bausteine';

/**
 * Vorlage der fuenf Funktions-Unterseiten (Stand 12.10.2026).
 *
 * Vorher waren es fuenf fast wortgleiche Seiten mit je eigenem Glas-Rahmen,
 * alten Screenshots und Aussagen wie "garantiert absolute Fairness". Jetzt
 * liefert jede Seite nur noch ihre Daten; Aufbau und Optik stehen hier.
 */

export const FUNKTIONEN = [
    { name: 'Ablauf', href: '/features/workflow' },
    { name: 'Expertise', href: '/features/expertise' },
    { name: 'Skills', href: '/features/skills' },
    { name: 'Erfahrungsschatz', href: '/features/memory' },
    { name: 'Intelligenz', href: '/features/intelligence' },
];

export interface FunktionsPunkt {
    titel: string;
    text: string;
}

export interface FunktionsSeiteProps {
    seitentitel: string;
    beschreibung: string;
    kicker: string;
    titel: string;
    text: string;
    bild?: { src: string; alt: string };
    punkte: FunktionsPunkt[];
    /** Optionaler Zusatzabschnitt unter den Punkten. */
    zusatz?: React.ReactNode;
}

export const FunktionsNavigation: React.FC = () => {
    const { pathname } = useRouter();
    return (
        <nav aria-label="Funktionen" className="flex w-fit max-w-full mx-auto gap-1 overflow-x-auto p-1 rounded-xl bg-foreground/5 no-scrollbar">
            {FUNKTIONEN.map((f) => (
                <Link
                    key={f.href}
                    href={f.href}
                    className={cn(
                        "px-4 h-9 inline-flex items-center rounded-lg text-sm whitespace-nowrap transition-colors",
                        pathname === f.href ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {f.name}
                </Link>
            ))}
        </nav>
    );
};

export const FunktionsSeite: React.FC<FunktionsSeiteProps> = ({
    seitentitel, beschreibung, kicker, titel, text, bild, punkte, zusatz
}) => {
    const { pathname } = useRouter();
    const index = FUNKTIONEN.findIndex(f => f.href === pathname);
    const naechste = FUNKTIONEN[(index + 1) % FUNKTIONEN.length];

    return (
        <MarketingLayout>
            <Head>
                <title>{seitentitel}</title>
                <meta name="description" content={beschreibung} />
            </Head>

            <Abschnitt kopfband className="pt-10 md:pt-12">
                    <FunktionsNavigation />
                    <div className="mt-12 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">{kicker}</p>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-0.045em] leading-[1.05] text-foreground max-w-3xl mx-auto">
                            {titel}
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">{text}</p>
                    </div>
                {bild && (
                    <div className="mt-12">
                        <Produktbild src={bild.src} alt={bild.alt} />
                    </div>
                )}
            </Abschnitt>

            <Abschnitt>
                    <AbschnittsKopf kicker="Im Einzelnen" titel="Was diese Funktion für Sie tut." />
                    <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-2")}>
                        {punkte.map((p) => (
                            <Kachel key={p.titel}>
                                <h3 className="text-lg font-semibold tracking-tight text-foreground">{p.titel}</h3>
                                <p className="mt-1.5 text-sm/relaxed text-muted-foreground">{p.text}</p>
                            </Kachel>
                        ))}
                    </div>
                    {zusatz}
            </Abschnitt>

            <Abschnitt className="pt-0 md:pt-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t border-border pt-10">
                    <p className="text-muted-foreground">
                        Weiter mit <span className="text-foreground font-medium">{naechste.name}</span>
                    </p>
                    <div className="flex gap-3">
                        <Link href={naechste.href} className={cn(buttonVariants({ variant: 'outline' }), "h-11")}>
                            {naechste.name} <ArrowRight size={16} />
                        </Link>
                        <Link href="/desktop" className={cn(buttonVariants({ variant: 'default' }), "h-11")}>
                            Koreki herunterladen
                        </Link>
                    </div>
                </div>
            </Abschnitt>
        </MarketingLayout>
    );
};
