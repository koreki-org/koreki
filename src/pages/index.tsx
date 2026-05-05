import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Sparkles, FileText, CheckCircle, Zap, ShieldCheck, MessageSquare, TrendingUp, Clock, Monitor, ArrowRight } from 'lucide-react';
import MarketingLayout from '../layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';
import { isDesktopTarget, getKorekiMode } from '@/lib/env-context';
import { WorkflowVisual } from '@/components/marketing/WorkflowVisual';
import { PerformanceSection } from '@/components/marketing/PerformanceSection';

export default function LandingPage() {
    const router = useRouter();

    const mode = getKorekiMode();

    useEffect(() => {
        if (isDesktopTarget()) {
            router.replace('/desktop');
        }
    }, [router]);

    // If we are logged in, we still show the landing page, 
    // but the Header will show "Zum Dashboard" instead of "Einloggen".

    return (
        <MarketingLayout>

            <div className="pt-4 pb-4 px-12 text-center animate-fade-down" />

            <main className="max-w-7xl mx-auto px-12 pt-0 pb-4 grid grid-cols-1 md:grid-cols-2 gap-16 items-center min-h-[calc(100vh-100px)]">
                <div className="flex flex-col items-center lg:items-start z-10 animate-fade-up">
                    <h1 className="text-[3rem] sm:text-[4.5rem] font-black text-slate-900 mb-6 tracking-tighter leading-[1.05]">
                        Präzise <br />
                        Korrektur.<br />
                        <span className="text-gradient pr-2">Individuelles</span> <br />
                        <span className="text-gradient pr-2">Feedback.</span>
                    </h1>
                    <p className="text-xl leading-relaxed text-slate-500 mb-10 max-w-[90%] font-medium">
                        Koreki nutzt modernste KI, um deine Korrekturzeit deutlich zu senken. Objektive Bewertungen und persönliche Rückmeldungen helfen deinen Schülern, schneller zu lernen – während du entlastet wirst.
                    </p>

                    <div className="mb-6">
                        {mode === 'community' ? (
                            <Link href="/app" className="relative bg-gradient-to-br from-indigo-600 to-blue-700 text-white px-10 py-5 rounded-full font-black text-sm uppercase tracking-widest inline-flex items-center gap-3 transition-all duration-300 shadow-[0_10px_30px_-5px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_40px_-5px_rgba(79,70,229,0.5)] hover:-translate-y-1 group overflow-hidden">
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700"></span>
                                Korrektur starten <ArrowRight size={18} />
                            </Link>
                        ) : (
                            <Link href="/register" className="relative bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-9 py-4 rounded-full font-black text-sm uppercase tracking-widest inline-flex items-center gap-3 transition-all duration-300 shadow-[0_10px_30px_-5px_rgba(37,99,235,0.4)] hover:shadow-[0_20px_40px_-5px_rgba(37,99,235,0.5)] hover:-translate-y-1 group overflow-hidden">
                                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700"></span>
                                    Jetzt testen <ArrowRight size={18} />
                            </Link>
                        )}
                    </div>

                    <div className="flex gap-6 mt-6 flex-wrap justify-center lg:justify-start">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <CheckCircle size={20} className="text-indigo-500" />
                            <span>DSGVO-optimiert</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <CheckCircle size={20} className="text-indigo-500" />
                            <span>Deutsches Engineering</span>
                        </div>
                    </div>
                </div>

                <div className="relative animate-fade-in delay-300">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.02)_0%,transparent_70%)] z-0 blur-[40px] animate-float-glow"></div>
                    <div className="glass-morphism rounded-[2.5rem] border border-white p-8 shadow-2xl relative z-10 rotate-2 -translate-y-3 transition-all duration-500 hover:rotate-0 hover:translate-y-0 hover:scale-105">
                        <div className="flex items-center gap-4 mb-8 pb-4 border-b border-black/5">
                            <div className="flex gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-red-400/20"></span>
                                <span className="w-3 h-3 rounded-full bg-yellow-400/20"></span>
                                <span className="w-3 h-3 rounded-full bg-blue-400/20"></span>
                            </div>
                            <div className="font-black text-slate-600 text-[10px] uppercase tracking-widest">Stapelverarbeitung läuft...</div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-xl font-bold text-slate-800 shadow-sm transition-all group hover:bg-white border border-white">
                                <FileText size={18} className="text-indigo-500" /> Schüler_01.pdf <span className="ml-auto bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Einschätzung 1,3</span>
                            </div>
                            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-xl font-bold text-slate-800 shadow-sm transition-all hover:bg-white border border-white">
                                <FileText size={18} className="text-indigo-500" /> Schüler_02.pdf <span className="ml-auto bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Einschätzung 2,0</span>
                            </div>
                            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-xl font-bold text-slate-800 shadow-sm transition-all hover:bg-white border border-white">
                                <FileText size={18} className="text-indigo-500/40" /> Schüler_03.pdf <span className="ml-auto w-5 h-5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <section className="px-[5%] py-10 max-w-7xl mx-auto animate-fade-up">
                <div className="text-center mb-12">
                    <h2 className="text-[3rem] font-extrabold text-slate-900 mb-6 tracking-tight">Korrektur-Assistenz neu gedacht</h2>
                    <p className="text-[1.2rem] text-slate-500 max-w-xl mx-auto leading-normal">Mehr als nur Korrektur – ein Partner für deinen pädagogischen Erfolg.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-left">
                    <div className="bg-white p-10 rounded-[32px] border border-slate-900/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] hover:border-blue-100 flex flex-col items-start group">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600">
                            <ShieldCheck size={32} />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight">Objektive Bewertung</h3>
                        <p className="text-slate-600 leading-relaxed text-[1.05rem]">Höchste Fariness durch KI-gestützte, kriterienbasierte Analyse – völlig unvoreingenommen.</p>
                    </div>

                    <div className="bg-white p-10 rounded-[32px] border border-slate-900/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] hover:border-blue-100 flex flex-col items-start group">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600">
                            <MessageSquare size={32} />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight">Individuelles Feedback</h3>
                        <p className="text-slate-600 leading-relaxed text-[1.05rem]">Jede Rückmeldung wird passgenau auf die Schülerantwort zugeschnitten für maximalen Lernerfolg.</p>
                    </div>

                    <div className="bg-white p-10 rounded-[32px] border border-slate-900/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] hover:border-blue-100 flex flex-col items-start group">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600">
                            <TrendingUp size={32} />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight">Bessere Ergebnisse</h3>
                        <p className="text-slate-600 leading-relaxed text-[1.05rem]">Schnellere Rückgabezyklen motivieren Schüler und verbessern die Ergebnisse spürbar.</p>
                    </div>

                    <div className="bg-white p-10 rounded-[32px] border border-slate-900/5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)] hover:border-blue-100 flex flex-col items-start group">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600">
                            <Clock size={32} />
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-4 tracking-tight">Echte Zeitersparnis</h3>
                        <p className="text-slate-600 leading-relaxed text-[1.05rem]">Automatisiere die mühsame Routinearbeit und gewinne Zeit für das Wesentliche zurück.</p>
                    </div>
                </div>
            </section>

            <PerformanceSection />

            {/* --- LATEST HIGHLIGHT: MOODLE IMPORT (Now at the end) --- */}
            <section className="px-8 py-8 md:py-12 max-w-7xl mx-auto mb-8 animate-fade-up">
                <div className="glass-morphism bg-white/60 rounded-[3rem] pt-0 pb-8 md:pt-0 md:pb-10 px-10 md:px-14 relative overflow-hidden group shadow-xl border border-white font-outfit transition-all hover:shadow-2xl hover:bg-white/80">
                    <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-all duration-700" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-12 pt-6 md:pt-8">
                        <div className="max-w-2xl text-center lg:text-left">
                            <Badge variant="light" className="mb-0">
                                <Sparkles size={14} className="mr-2 animate-pulse" />
                                Erweiterte Integration
                            </Badge>
                            <h2 className="text-3xl md:text-5xl font-black mb-1 tracking-tight leading-none uppercase text-slate-900 mt-4">
                                Digital Native:<br />
                                Moodle Tests direkt korrigieren.
                            </h2>
                            <p className="text-slate-500 text-lg font-medium leading-relaxed mb-10 mt-4">
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

            {mode === 'saas' && (
                <section className="px-[5%] py-8 max-w-7xl mx-auto animate-fade-up">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Monitor size={80} className="text-primary" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
                            <div className="max-w-xl text-center md:text-left">
                                <Badge variant="subtle" className="mb-4">
                                    Desktop Edition
                                </Badge>
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tight">Koreki für Windows & Linux</h2>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    Maximale Datensouveränität durch lokale KI-Instanzen. Nutzen Sie Koreki direkt auf Ihrer Hardware (macOS coming soon) – ohne Kompromisse beim Datenschutz.
                                </p>
                            </div>
                            <Link href="/desktop" className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-primary/90 transition-all flex items-center gap-2 shrink-0 shadow-xl shadow-primary/20 group">
                                Jetzt entdecken <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}


        </MarketingLayout>
    );
}
