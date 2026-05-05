import React from 'react';
import Head from 'next/head';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';
import { FeatureFAQ, FeatureCTA } from '@/components/marketing/MarketingModules';
import { FeatureSubNav } from '@/components/marketing/FeatureSubNav';
import { FeatureSpotlight } from '@/components/marketing/FeatureSpotlight';
import { Brain, Sparkles, LayoutList, Sliders, CheckCircle, ShieldCheck, Shield, FileSpreadsheet } from 'lucide-react';

import { ImageLightbox } from '@/components/marketing/ImageLightbox';

export default function IntelligenceFeature() {
    const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki Intelligence | Semantisches Verständnis</title>
                <meta name="description" content="Erleben Sie die nächste Stufe der KI-Korrektur. Semantisches Verständnis statt einfacher Keyword-Vergleiche." />
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
                <section className="px-8 pt-12 pb-4 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10 animate-fade-up">
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        <Badge variant="light" className="mb-4">
                            Pillar: Intelligence
                        </Badge>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            Verstehen statt <br />
                            <span className="text-gradient">Vergleichen.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto lg:ml-0">
                            Koreki analysiert Schülerantworten auf semantischer Ebene. Wir bewerten die Qualität und den Kontext der Argumentation – nicht nur die Wortwahl.
                        </p>
                    </div>
                    <div className="flex-1 w-full">
                        <div 
                            className="relative group cursor-zoom-in"
                            onClick={() => setZoomedImage("/screenshots/11b_Koreki_Stapelverarbeitung_Ende_KI_Vertrauen.png")}
                        >
                            <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-[3rem] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/60 shadow-glass backdrop-blur-3xl bg-white/20 p-3 lg:p-6 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1">
                                <img 
                                    src="/screenshots/11b_Koreki_Stapelverarbeitung_Ende_KI_Vertrauen.png" 
                                    alt="AI Confidence Scoring"
                                    className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-8 px-8 max-w-7xl mx-auto space-y-4">
                    <FeatureSpotlight 
                        badge="Smart Extraction"
                        title="Intelligente OCR & Plausibilität"
                        description="Unsere KI extrahiert nicht nur Text. Sie prüft während der Erkennung die Plausibilität und erkennt Fehler im Kontext, bevor die eigentliche Korrektur beginnt."
                        imageSrc="/screenshots/10_Koreki_OCR_mit_Plausibilitätsprüfung.png"
                        imageAlt="OCR Interface"
                    />

                    <FeatureSpotlight 
                        reverse
                        badge="Compliance"
                        title="Sicherheit durch Anonymisierung"
                        description="Schützen Sie die Privatsphäre Ihrer Schüler. Mit Koreki können Namen und sensible Informationen direkt in der Oberfläche geschwärzt werden, bevor Daten verarbeitet werden."
                        imageSrc="/screenshots/9_Koreki_Name_Schwaerzen.png"
                        imageAlt="Anonymization Tool"
                    />
                </section>

                {/* AI Features Grid */}
                <section className="py-12 px-8 bg-slate-50/50 border-y border-slate-200/50 relative">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
                        <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 group">
                            <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                                <Sparkles size={28} />
                            </div>
                            <h3 className="text-2xl font-black mb-4 tracking-tight text-slate-900">Semantik-Matching</h3>
                            <p className="text-base text-slate-500 leading-relaxed font-medium">
                                Das System erkennt, wenn Schüler Konzepte mit eigenen Worten korrekt wiedergeben, auch ohne exakte Übereinstimmung zur Musterlösung.
                            </p>
                        </div>
                        <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 group">
                            <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                                <LayoutList size={28} />
                            </div>
                            <h3 className="text-2xl font-black mb-4 tracking-tight text-slate-900">Differenzierte Punkte</h3>
                            <p className="text-base text-slate-500 leading-relaxed font-medium">
                                Automatische Aufteilung komplexer Aufgaben in Teilaspekte für eine faire und präzise Punktevergabe pro Argument.
                            </p>
                        </div>
                        <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 group">
                            <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                                <Sliders size={28} />
                            </div>
                            <h3 className="text-2xl font-black mb-4 tracking-tight text-slate-900">Pädagogische Profile</h3>
                            <p className="text-base text-slate-500 leading-relaxed font-medium">
                                Sie definieren die Leitplanken. Steuern Sie den Bewertungsfokus (z.B. Fachsprache vs. Inhalt) über individuelle Profile.
                            </p>
                        </div>
                    </div>
                </section>
 

            </div>
        </MarketingLayout>
    );
}
