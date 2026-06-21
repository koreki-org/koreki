import React, { useState } from 'react';
import Head from 'next/head';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';

import { FeatureSubNav } from '@/components/marketing/FeatureSubNav';
import { ImageLightbox } from '@/components/marketing/ImageLightbox';
import { ShieldCheck, CheckCircle } from 'lucide-react';

export default function ExpertiseFeature() {
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki Expertise | Expert-Center & Kriterien</title>
                <meta name="description" content="Bewahren Sie Ihre pädagogische Hoheit. Kriterien und Parameter exakt definieren." />
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
                <section className="px-8 pt-12 pb-16 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10 animate-fade-up">
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        <Badge variant="light" className="mb-4">
                            Pillar: Expertise
                        </Badge>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            Fachliche Hoheit. <br />
                            <span className="text-gradient">Unter Ihrer Kontrolle.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto lg:ml-0">
                            Koreki ist kein unkontrollierbarer Algorithmus. Im Expert-Center legen Sie fest, nach welchen Kriterien und fachlichen Vorgaben korrigiert wird. Sie bleiben der alleinige Entscheider.
                        </p>
                    </div>
                    
                    <div className="flex-1 w-full animate-fade-in delay-300">
                        <div 
                            className="relative group cursor-zoom-in"
                            onClick={() => setZoomedImage("/screenshots/4a_koreki_expert_center.png")}
                        >
                            <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-hero opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="relative rounded-hero overflow-hidden border border-white/60 bg-white/20 p-3 lg:p-6 shadow-glass transition-all duration-300 hover:scale-[1.01]">
                                <img 
                                    src="/screenshots/4a_koreki_expert_center.png" 
                                    alt="Koreki Expert-Center Interface"
                                    className="w-full h-auto rounded-xl shadow-md border border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Highlight Section */}
                <section className="py-12 px-8 bg-slate-50/50 border-y border-slate-200/50 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="glass-morphism p-12 rounded-hero border border-white bg-white/60 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <ShieldCheck size={160} />
                            </div>
                            <div className="max-w-2xl relative z-10">
                                <h2 className="text-4xl font-black mb-6 tracking-tight text-slate-900">Das Expert-Center</h2>
                                <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed">
                                    Die KI folgt Ihren Anweisungen und Vorgaben atomar. Sie bestimmen den Rahmen der sprachlichen Kulanz und die Gewichtung von Argumenten.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { t: 'Klare Vorgabe von Musterlösungen', i: CheckCircle },
                                        { t: 'Steuerung der sprachlichen Toleranz', i: CheckCircle },
                                        { t: 'Manuelles Überschreiben jederzeit möglich', i: CheckCircle },
                                        { t: 'Einhaltung Ihrer pädagogischen Linie', i: CheckCircle }
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
