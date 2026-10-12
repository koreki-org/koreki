import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Instagram, Linkedin, Github } from 'lucide-react';
import Logo from '../Logo';
import { LEGAL_CONFIG } from '@/config/legal-contact';
import { getKorekiMode } from '@/lib/env-context';

const spalte = "flex flex-col gap-2.5 text-sm";
const verweis = "text-muted-foreground hover:text-foreground transition-colors";

const MarketingFooter: React.FC = () => {
    const [mode, setMode] = useState<'saas' | 'community' | 'desktop'>('saas');

    useEffect(() => {
        setMode(getKorekiMode());
    }, []);

    return (
        <footer className="border-t border-border bg-card">
            <div className="max-w-6xl mx-auto px-6 md:px-page-inline py-12">
                <div className="flex flex-col md:flex-row justify-between gap-10">
                    <div className="flex flex-col gap-4 max-w-xs">
                        <Logo showText={true} size={24} className="self-start" />
                        <p className="text-sm text-muted-foreground">
                            Korrekturvorschläge für Klassenarbeiten. Die Note vergeben Sie.
                        </p>
                        <div className="flex gap-4 items-center">
                            <a href="https://www.instagram.com/koreki_org/" target="_blank" rel="noopener noreferrer" aria-label="Koreki auf Instagram" className={verweis}><Instagram className="w-5 h-5" /></a>
                            <a href="https://www.linkedin.com/company/koreki-org/" target="_blank" rel="noopener noreferrer" aria-label="Koreki auf LinkedIn" className={verweis}><Linkedin className="w-5 h-5" /></a>
                            <a href="https://github.com/koreki-org/koreki" target="_blank" rel="noopener noreferrer" aria-label="Koreki auf GitHub" className={verweis}><Github className="w-5 h-5" /></a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-10 md:gap-16">
                        <div className={spalte}>
                            <h4 className="font-medium text-foreground mb-1">Produkt</h4>
                            <Link href="/features" className={verweis}>Funktionen</Link>
                            <Link href="/security" className={verweis}>Datenschutz</Link>
                            {mode === 'saas' && <Link href="/desktop" className={verweis}>Desktop</Link>}
                            {mode === 'saas' && <Link href="/self-hosting" className={verweis}>Für Schulen</Link>}
                        </div>
                        <div className={spalte}>
                            <h4 className="font-medium text-foreground mb-1">Rechtliches</h4>
                            <Link href="/impressum" className={verweis}>Impressum</Link>
                            <Link href="/privacy" className={verweis}>Datenschutzerklärung</Link>
                        </div>
                        <div className={`${spalte} col-span-2 md:col-span-1`}>
                            <h4 className="font-medium text-foreground mb-1">Kontakt</h4>
                            {mode === 'saas' && <Link href="/contact" className={verweis}>Kontaktformular</Link>}
                            <a href={`mailto:${LEGAL_CONFIG.contact.email}`} className={verweis}>{LEGAL_CONFIG.contact.email}</a>
                        </div>
                    </div>
                </div>

                <p className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} Koreki. Entwickelt in Deutschland.
                </p>
            </div>
        </footer>
    );
};

export default MarketingFooter;
