import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Github, Mail, ShieldCheck } from 'lucide-react';
import Logo from '../Logo';
import { LEGAL_CONFIG } from '@/config/legal-contact';
import { getKorekiMode } from '@/lib/env-context';

const MarketingFooter: React.FC = () => {
    const [mode, setMode] = useState<'saas' | 'community' | 'desktop'>('saas');

    useEffect(() => {
        setMode(getKorekiMode());
    }, []);

    return (
        <footer className="relative bg-muted/30 py-8 overflow-hidden border-t border-border">
            {/* Subtle Gradient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <div className="max-w-7xl mx-auto px-8 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-6 pb-6 border-b border-border/60">
                    <div className="flex flex-col gap-4">
                        <Logo showText={true} size={24} className="text-foreground" />
                        <p className="max-w-xs text-[11px] text-muted-foreground font-medium leading-relaxed">
                            Die intelligente Korrektur-Infrastruktur für Bildungs- und Prüfungsinstitutionen.
                        </p>
                        <div className="flex gap-4 items-center">
                            <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110"><Twitter className="w-3.5 h-3.5" /></a>
                            <a href="#" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110"><Linkedin className="w-3.5 h-3.5" /></a>
                            <a href="https://github.com/koreki-org/koreki" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-110"><Github className="w-3.5 h-3.5" /></a>
                        </div>
                    </div>
 
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground font-outfit">Plattform</h4>
                            <nav className="flex flex-col gap-2 text-[11px] font-bold">
                                <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors duration-300">Features</Link>
                                <Link href="/security" className="text-muted-foreground hover:text-primary transition-colors duration-300">Sicherheit</Link>
                            </nav>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground font-outfit">Rechtliches</h4>
                            <nav className="flex flex-col gap-2 text-[11px] font-bold">
                                <Link href="/impressum" className="text-muted-foreground hover:text-primary transition-colors duration-300">Impressum</Link>
                                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors duration-300">Datenschutz</Link>
                            </nav>
                        </div>
                        <div className="space-y-3 col-span-2 md:col-span-1">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground font-outfit">Kontakt</h4>
                            <div className="flex flex-col gap-2 text-[11px] font-bold">
                                {mode === 'saas' && (
                                    <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors duration-300 flex items-center gap-2">
                                        <Mail className="w-3.5 h-3.5" /> Kontaktformular
                                    </Link>
                                )}
                                <a href={`mailto:${LEGAL_CONFIG.contact.email}`} className="text-muted-foreground hover:text-primary transition-colors duration-300 flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5" /> {LEGAL_CONFIG.contact.email}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
 
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
                    <p>&copy; {new Date().getFullYear()} Koreki<span className="text-primary">.</span> Made in Germany.</p>
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" /> Datenschutz-Fokus</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default MarketingFooter;
