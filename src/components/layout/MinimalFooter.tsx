import React from 'react';
import Link from 'next/link';
import { Github, Heart } from 'lucide-react';
import { isLocalInstance } from '@/lib/env-context';

const MinimalFooter: React.FC = () => {
    return (
        <footer className="mt-auto py-6 px-8 border-t border-border/50 bg-background/40 backdrop-blur-md">
            <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xxs font-bold text-muted-foreground uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <span>&copy; {new Date().getFullYear()} Koreki. Open Source. Developed with</span>
                    <Heart size={10} className="text-primary fill-primary" />
                    <span>in Germany.</span>
                </div>
                <div className="flex items-center gap-8">
                    {!isLocalInstance() && (
                        <>
                            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
                            <Link href="/privacy" className="hover:text-foreground transition-colors">Datenschutz</Link>
                        </>
                    )}
                    {/*
                     * Betriebsanleitung — nur auf lokalen Instanzen.
                     *
                     * Artikel 13 der KI-Verordnung verlangt, dass die Betriebsanleitung dem
                     * System BEILIEGT. Sie wird zwar in jeder Betriebsart ausgeliefert
                     * (`src/legal/`, gerendert unter /app/compliance/manual), war bis zum
                     * 03.09.2026 aber nur aus dem AVV-Ablauf heraus verlinkt — und der
                     * existiert allein im SaaS. Wer Koreki selbst betreibt, fand die Seite
                     * nicht: Sie lag bei, ohne auffindbar zu sein.
                     *
                     * Im SaaS bleibt der Weg über den AVV-Ablauf; dort wird die Anleitung
                     * beim Onboarding der Schule ausdrücklich vorgelegt und quittiert.
                     */}
                    {isLocalInstance() && (
                        <Link href="/app/compliance/manual" className="hover:text-foreground transition-colors">
                            Betriebsanleitung
                        </Link>
                    )}
                    <a 
                        href="https://github.com/koreki-org/koreki" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                        <Github size={12} />
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default MinimalFooter;
