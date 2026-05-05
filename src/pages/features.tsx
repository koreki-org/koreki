import React from 'react';
import Head from 'next/head';
import MarketingLayout from '../layouts/MarketingLayout';
import { FeatureSubNav } from '../components/marketing/FeatureSubNav';
import { ShowroomCard } from '../components/marketing/ShowroomCard';
import { FeatureFAQ, FeatureCTA } from '../components/marketing/MarketingModules';
import { Brain, FileSpreadsheet, Layers, Sparkles } from 'lucide-react';
import { WorkflowVisual } from '../components/marketing/WorkflowVisual';
import { Badge } from '@/components/ui/Badge';

/**
 * Features Page (The Industrial Showroom)
 * 🏛️🏮✨
 * A high-fidelity gateway to the Koreki ecosystem.
 */
export default function Features() {
    return (
        <MarketingLayout>
            <Head>
                <title>Features | Koreki</title>
                <meta name="description" content="Entdecken Sie die Werkzeuge für die moderne Korrektur. Von KI-Intelligenz bis hin zu nahtlosem Moodle-Import." />
            </Head>

            <div className="relative">
                {/* 🧭 Showroom Context Navigation */}
                <FeatureSubNav />

                {/* --- 🦸‍♂️ Hero: The Promise --- */}
                <section className="pt-12 pb-20 px-8 text-center relative overflow-hidden">
                    <div className="max-w-4xl mx-auto relative z-10 animate-fade-up">
                        <Badge variant="light" className="mb-8">
                            Features & Intelligence
                        </Badge>
                        <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-8 tracking-tighter leading-[0.9]">
                            Intelligenz trifft <br />
                            <span className="text-gradient">Souveränität.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                            Koreki ist kein einfaches Werkzeug. Es ist das Nervenzentrum für die fortschrittlichste Korrektur-Assistenz des Jahrzehnts.
                        </p>
                    </div>

                    {/* Ambient Visual Element */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.05)_0%,transparent_70%)] pointer-events-none -z-10" />
                </section>

                {/* --- 🏭 The Showroom: Feature Pillars --- */}
                <section className="pb-20 px-8 max-w-7xl mx-auto space-y-6">
                    
                    {/* 1. Intelligence Pillar */}
                    <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
                        <ShowroomCard 
                            title="Die KI-Intelligenz: Semantisches Verständnis."
                            description="Vergessen Sie einfaches Keyword-Matching. Koreki versteht den argumentativen Kern der Schülerantworten und liefert pädagogisch begründetes Feedback auf Knopfdruck."
                            icon={<Brain size={32} />}
                            href="/features/intelligence"
                            badge="Core Logic"
                            accentColor="bg-indigo-600"
                            visualSrc="/screenshots/10_Koreki_OCR_mit_Plausibilitätsprüfung.png"
                            visual={
                                <div className="relative group/visual">
                                    <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full opacity-0 group-hover/visual:opacity-100 transition-opacity duration-700" />
                                    <img 
                                        src="/screenshots/10_Koreki_OCR_mit_Plausibilitätsprüfung.png" 
                                        alt="OCR Intelligence"
                                        className="w-full max-w-[650px] h-auto rounded-2xl shadow-2xl border border-white/20 relative z-10"
                                    />
                                </div>
                            }
                        />
                    </div>

                    {/* 2. Workflow Pillar */}
                    <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
                        <ShowroomCard 
                            className="md:flex-row-reverse"
                            title="Moodle-Tests: Digital Native Import."
                            description="Kein Papier, kein OCR-Umweg. Laden Sie Ihre XLSX-Exporte direkt hoch. Freitextfragen werden automatisch extrahiert und Schülern zugewiesen."
                            icon={<FileSpreadsheet size={32} />}
                            href="/features/workflow"
                            badge="Native Integration"
                            accentColor="bg-blue-600"
                            visualSrc="/screenshots/5_koreki_upload_modell_solution.png"
                            visual={
                                <div className="relative group/visual">
                                    <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover/visual:opacity-100 transition-opacity duration-700" />
                                    <img 
                                        src="/screenshots/5_koreki_upload_modell_solution.png" 
                                        alt="Workflow Integration"
                                        className="w-full max-w-[650px] h-auto rounded-2xl shadow-2xl border border-white/20 relative z-10"
                                    />
                                </div>
                            }
                        />
                    </div>

                    {/* 3. Efficiency Pillar */}
                    <div className="animate-fade-up" style={{ animationDelay: '600ms' }}>
                        <ShowroomCard 
                            title="Stapelverarbeitung: Hohe Kapazität."
                            description="Vom Einzelblatt bis zum gesamten Klassensatz. Koreki automatisiert die mühsame Routinearbeit, anonymisiert Daten und generiert Multi-Exporte in Sekundenschnelle."
                            icon={<Layers size={32} />}
                            href="/features/efficiency"
                            badge="High Throughput"
                            accentColor="bg-sky-600"
                            visualSrc="/screenshots/11_Koreki_Stapelverarbeitung_Ende.png"
                            visual={
                                <div className="relative group/visual">
                                    <div className="absolute -inset-4 bg-sky-500/20 blur-2xl rounded-full opacity-0 group-hover/visual:opacity-100 transition-opacity duration-700" />
                                    <img 
                                        src="/screenshots/11_Koreki_Stapelverarbeitung_Ende.png" 
                                        alt="Batch Efficiency"
                                        className="w-full max-w-[650px] h-auto rounded-2xl shadow-2xl border border-white/20 relative z-10"
                                    />
                                </div>
                            }
                        />
                    </div>

                </section>

                <FeatureFAQ />
                <FeatureCTA />
            </div>
        </MarketingLayout>
    );
}
