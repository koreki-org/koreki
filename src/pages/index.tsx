import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Sparkles, FileText, CheckCircle, Zap, ShieldCheck, MessageSquare, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import MarketingLayout from '../layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';
import { isDesktopTarget, getKorekiMode } from '@/lib/env-context';
import { WorkflowVisual } from '@/components/marketing/WorkflowVisual';
import { PerformanceSection } from '@/components/marketing/PerformanceSection';
import { ImageLightbox } from '@/components/marketing/ImageLightbox';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
    const router = useRouter();
    const mode = getKorekiMode();
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const { userData, authLoading } = useAuth();

    useEffect(() => {
        if (isDesktopTarget()) {
            router.replace('/desktop');
        }
    }, [router]);

    // If we are logged in, we still show the landing page, 
    // but the Header will show "Zum Dashboard" instead of "Einloggen".

    return (
        <MarketingLayout>

            <div className="py-4 px-6 md:px-page-inline text-center animate-fade-down" />

            {/* Viewport-Centered Hero: pt-0 pb-4 / py-4 ist eine bewusste Designentscheidung zur 
               Vermeidung von vertikalen Scrollbalken "above the fold" auf kleineren Displays.
               Ausgenommen vom Standard-Hero-Spacing-Token (pt-hero-top pb-hero-bottom). */}
            <main className="max-w-7xl mx-auto px-6 md:px-page-inline pt-0 pb-12 md:pb-section-vertical grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center min-h-[calc(100vh-100px)]">
                <div className="lg:col-span-5 flex flex-col items-center lg:items-start z-10 animate-fade-up">
                    <h1 className="text-[3rem] sm:text-[4.5rem] font-black text-foreground mb-6 tracking-tighter leading-[1.05]">
                        Präzise <br />
                        Korrektur.<br />
                        <span className="text-gradient pr-2">Individuelles</span> <br />
                        <span className="text-gradient pr-2">Feedback.</span>
                    </h1>
                    <p className="text-xl leading-relaxed text-muted-foreground mb-10 max-w-[90%] font-medium">
                        Koreki nutzt modernste KI, um deine Korrekturzeit deutlich zu senken. Objektive Bewertungen und persönliche Rückmeldungen helfen deinen Schülern, schneller zu lernen – während du entlastet wirst.
                    </p>

                    <div className="mb-6">
                        {mode === 'community' ? (
                            <Link href={(!authLoading && userData) ? "/app" : "/login"} className="relative bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-5 rounded-full font-black text-sm uppercase tracking-widest inline-flex items-center gap-3 transition-all duration-300 shadow-[0_10px_30px_-5px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_20px_40px_-5px_rgba(var(--primary-rgb),0.5)] hover:-translate-y-1 group overflow-hidden">
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700"></span>
                                Korrektur starten <ArrowRight size={18} />
                            </Link>
                        ) : (
                            <Link href={(!authLoading && userData) ? "/app" : "/register"} className="relative bg-primary hover:bg-primary/90 text-primary-foreground px-9 py-4 rounded-full font-black text-sm uppercase tracking-widest inline-flex items-center gap-3 transition-all duration-300 shadow-[0_10px_30px_-5px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_20px_40px_-5px_rgba(var(--primary-rgb),0.5)] hover:-translate-y-1 group overflow-hidden">
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700"></span>
                                    {(!authLoading && userData) ? "Zum Dashboard" : "Jetzt testen"} <ArrowRight size={18} />
                            </Link>
                        )}
                    </div>

                    <div className="flex gap-6 mt-6 flex-wrap justify-center lg:justify-start">
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground/80">
                            <CheckCircle size={20} className="text-primary" />
                            <span>DSGVO-optimiert</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground/80">
                            <CheckCircle size={20} className="text-primary" />
                            <span>Deutsches Engineering</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-7 relative animate-fade-in delay-300 flex items-center justify-center w-full cursor-zoom-in" onClick={() => setIsLightboxOpen(true)}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.02)_0%,transparent_70%)] z-0 blur-[40px] animate-float-glow"></div>
                    {/* Elegant Screenshot Card with clean border and shadow */}
                    <div className="relative w-full transition-all duration-500 hover:scale-[1.01]">
                        <div className="bg-white/40 backdrop-blur-md rounded-hero border border-white/60 p-2 shadow-2xl overflow-hidden">
                            <img
                                src="/screenshots/4_koreki_app_overview.png"
                                alt="Koreki App Dashboard Overview"
                                className="w-full h-auto object-cover object-top rounded-xl border border-black/5"
                            />
                        </div>
                    </div>
                </div>
            </main>



            <PerformanceSection />

            {/* --- LATEST HIGHLIGHT: MOODLE IMPORT (Now at the end) --- */}
            <section className="px-6 md:px-page-inline pb-12 md:pb-section-vertical max-w-7xl mx-auto mb-8 animate-fade-up">
                <div className="glass-morphism bg-white/60 rounded-hero pt-0 pb-6 px-6 md:pb-card-padding md:px-card-padding relative overflow-hidden group shadow-xl border border-white font-outfit transition-all hover:shadow-2xl hover:bg-white/80">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-all duration-700" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-12 pt-6 md:pt-8">
                        <div className="max-w-2xl text-center lg:text-left">
                            <Badge variant="light" className="mb-0">
                                <Sparkles size={14} className="mr-2 animate-pulse" />
                                Erweiterte Integration
                            </Badge>
                            <h2 className="text-3xl md:text-5xl font-black mb-1 tracking-tight leading-none uppercase text-foreground mt-4">
                                Digital Native:<br />
                                Moodle Tests direkt korrigieren.
                            </h2>
                            <p className="text-muted-foreground text-lg font-medium leading-relaxed mb-10 mt-4">
                                Beenden Sie den Umweg über Papier und OCR. Importieren Sie die Bewertung von Freitextfragen direkt aus Moodle XLSX-Exporten. Höchste Präzision bei der Schülermeldung.
                            </p>
                            <Link href="/features/workflow" className="bg-primary text-white px-10 py-5 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 hover:bg-primary/90 flex items-center gap-3 w-fit mx-auto lg:ml-0 group">
                                Mehr erfahren <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        
                        <div className="hidden lg:block relative scale-110">
                            <WorkflowVisual />
                        </div>
                    </div>
                </div>
            </section>




            {isLightboxOpen && (
                <ImageLightbox 
                    src="/screenshots/4_koreki_app_overview.png" 
                    alt="Koreki App Dashboard Overview" 
                    onClose={() => setIsLightboxOpen(false)} 
                />
            )}
        </MarketingLayout>
    );
}
