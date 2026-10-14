import React from 'react';
import Link from 'next/link';
import { ArrowRight, Download, Laptop, ShieldCheck, Code2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Abschnitt, Markenverlauf, Produktbild } from '../site/Bausteine';

export interface Hauptaktion {
    href: string;
    text: string;
    /** Download-Symbol nur fuer den Desktop-Download. */
    download?: boolean;
}

interface LandingHeroProps {
    aktion: Hauptaktion;
}

const merkmale = [
    { icon: Laptop, text: 'Windows 10/11 · Ubuntu' },
    { icon: ShieldCheck, text: 'Namen werden pseudonymisiert' },
    { icon: Code2, text: 'Quellcode einsehbar' },
];

export const LandingHero: React.FC<LandingHeroProps> = ({ aktion }) => (
    <Abschnitt kopfband className="pt-12 md:pt-16">
        <div className="text-center">
            <Link
                href="/desktop"
                className="inline-flex items-center gap-2.5 rounded-full bg-card shadow-card pl-1.5 pr-3.5 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
                <span className="rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5">Neu</span>
                Koreki Desktop für Windows und Ubuntu
                <ArrowRight size={14} />
            </Link>

            <h1 className="text-[2.6rem] leading-[1.05] sm:text-6xl md:text-7xl font-extrabold tracking-[-0.045em] text-foreground">
                Jede Arbeit.<br />
                <Markenverlauf>Derselbe Maßstab.</Markenverlauf>
            </h1>

            <p className="mt-7 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Koreki liest Klassenarbeiten – auch handschriftliche –, vergleicht sie mit deiner
                Musterlösung und schlägt Punkte und Feedback vor. Die Entscheidung triffst du.
                Auf deinem eigenen Rechner.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={aktion.href} className={cn(buttonVariants({ variant: 'default', size: 'lg' }), "h-12 px-6 text-base")}>
                    {aktion.download && <Download size={17} />}
                    {aktion.text}
                </Link>
                <Link href="#ablauf" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), "h-12 px-6 text-base")}>
                    So funktioniert es
                </Link>
            </div>

            <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {merkmale.map(({ icon: Icon, text }) => (
                    <li key={text} className="inline-flex items-center gap-1.5">
                        <Icon size={15} /> {text}
                    </li>
                ))}
            </ul>
        </div>

        <div className="mt-12">
            <Produktbild
                src="/marketing/startbildschirm.webp"
                alt="Startbildschirm von Koreki mit Musterlösung, Schülerarbeiten und den eigenen Profilen in der Kopfleiste"
            />
            <p className="mt-4 text-center text-sm text-muted-foreground">
                Echte Ansicht aus Koreki: Musterlösung links, Arbeiten der Klasse rechts – oben die eigenen Profile.
            </p>
        </div>
    </Abschnitt>
);
