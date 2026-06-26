import React, { useState } from 'react';
import Head from 'next/head';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';

import { FeatureSubNav } from '@/components/marketing/FeatureSubNav';
import { ImageLightbox } from '@/components/marketing/ImageLightbox';
import { Brain, CheckCircle } from 'lucide-react';

export default function IntelligenceFeature() {
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki Intelligenz | KI-Parameter-Center & LLMs</title>
                <meta name="description" content="Steuern Sie die künstliche Intelligenz nach Ihren Wünschen. LLM-Auswahl, Temperatur und Parameter anpassen." />
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
                            Pillar: Intelligenz
                        </Badge>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            KI-Parameter-Center. <br />
                            <span className="text-gradient">Volle Kontrolle.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto lg:ml-0">
                            Steuern Sie die Rechenleistung und das Verhalten der künstlichen Intelligenz nach Ihren eigenen Vorgaben. Passen Sie Parameter wie Temperatur, Top-P und die LLM-Modellauswahl flexibel an Ihre Anforderungen an.
                        </p>
                    </div>
                    
                    <div className="w-full lg:w-[58%] xl:w-[62%] lg:flex-grow animate-fade-in delay-300">
                        <div 
                            className="relative group cursor-zoom-in"
                            onClick={() => setZoomedImage("/screenshots/4d_koreki_ai-parameter_center.png")}
                        >
                            <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-hero opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="relative rounded-hero overflow-hidden border border-white/60 bg-white/20 p-2 md:p-3 lg:p-4 shadow-glass transition-all duration-300 hover:scale-[1.01]">
                                <img 
                                    src="/screenshots/4d_koreki_ai-parameter_center.png" 
                                    alt="Koreki AI-Parameter-Center Interface"
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
                                <Brain size={160} />
                            </div>
                            <div className="max-w-2xl relative z-10">
                                <h2 className="text-4xl font-black mb-6 tracking-tight text-slate-900">Das AI-Parameter-Center</h2>
                                <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed">
                                    Konfigurieren Sie die KI exakt für Ihre spezifische Aufgabe. Nutzen Sie moderne Cloud-Modelle oder betreiben Sie Koreki komplett lokal.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { t: 'Freie Modellauswahl (OpenAI, Mistral, Ollama)', i: CheckCircle },
                                        { t: 'Temperatur- & Top-P-Regler für Kreativität/Präzision', i: CheckCircle },
                                        { t: 'Custom System-Prompts für maßgeschneiderte Korrekturen', i: CheckCircle },
                                        { t: 'Vollständiger Datenschutz durch lokale Ausführung', i: CheckCircle }
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
