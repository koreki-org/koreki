import React, { useState } from 'react';
import Head from 'next/head';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';

import { FeatureSubNav } from '@/components/marketing/FeatureSubNav';
import { ImageLightbox } from '@/components/marketing/ImageLightbox';
import { Sparkles, CheckCircle } from 'lucide-react';

export default function SkillsFeature() {
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki Skills | Kriterienkataloge & Profile</title>
                <meta name="description" content="Modulare Kriterienkataloge für jede Aufgabe. Strukturieren Sie die Bewertung präzise." />
            </Head>

            {zoomedImage && (
                <ImageLightbox 
                    src={zoomedImage} 
                    onClose={() => setZoomedImage(null)} 
                />
            )}

            <div className="relative">
                {/* 🧭 Showroom Context Navigation */}
                <FeatureSubNav />

                {/* Hero Section */}
                <section className="px-6 md:px-page-inline pt-4 pb-12 md:pt-6 md:pb-hero-bottom max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10 animate-fade-up">
                    <div className="w-full lg:w-[42%] xl:w-[38%] lg:flex-shrink-0 space-y-8 text-center lg:text-left">
                        <Badge variant="light" className="mb-4">
                            Pillar: Skills
                        </Badge>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            Modulare Skills. <br />
                            <span className="text-gradient">Präzise Kriterien.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto lg:ml-0">
                            Strukturieren Sie Ihre Korrektur mit dem Skill-Center. Legen Sie pro Aufgabe spezifische Kompetenzbereiche (Skills) fest. So erhalten Sie extrem differenzierte Auswertungen für jeden Schüler.
                        </p>
                    </div>
                    
                    <div className="w-full lg:w-[58%] xl:w-[62%] lg:flex-grow animate-fade-in delay-300">
                        <div 
                            className="relative group cursor-zoom-in"
                            onClick={() => setZoomedImage("/screenshots/4b_koreki_skill_center.png")}
                        >
                            <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-hero opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="relative rounded-hero overflow-hidden border border-white/60 bg-white/20 p-2 md:p-3 lg:p-4 shadow-glass transition-all duration-300 hover:scale-[1.01]">
                                <img 
                                    src="/screenshots/4b_koreki_skill_center.png" 
                                    alt="Koreki Skill-Center Interface"
                                    className="w-full h-auto rounded-xl shadow-md border border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Highlight Section */}
                <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline bg-slate-50/50 border-y border-slate-200/50 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="glass-morphism p-6 md:p-card-padding rounded-hero border border-white bg-white/60 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <Sparkles size={160} />
                            </div>
                            <div className="max-w-2xl relative z-10">
                                <h2 className="text-4xl font-black mb-6 tracking-tight text-slate-900">Das Skill-Center</h2>
                                <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed">
                                    Definieren Sie wiederverwendbare Kriterienprofile und verknüpfen Sie diese mit Aufgaben. Für strukturierte Einschätzungen.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { t: 'Wiederverwendbare Kompetenz-Bibliothek', i: CheckCircle },
                                        { t: 'Freie Zuordnung zu einzelnen Aufgaben', i: CheckCircle },
                                        { t: 'Feingranulare Rückmeldungen je Kriterium', i: CheckCircle },
                                        { t: 'Automatisierte Aggregation der Ergebnisse', i: CheckCircle }
                                    ].map((f, i) => (
                                        <div key={i} className="flex items-center gap-4 text-sm font-black text-slate-700">
                                            <div className="bg-primary/10 text-primary p-2 rounded-lg">
                                                <f.i size={20} />
                                            </div>
                                            <span>{f.t}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </MarketingLayout>
    );
}
