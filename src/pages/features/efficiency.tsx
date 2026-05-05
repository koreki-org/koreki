import React from 'react';
import Head from 'next/head';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';
import { FeatureFAQ, FeatureCTA } from '@/components/marketing/MarketingModules';
import { FeatureSubNav } from '@/components/marketing/FeatureSubNav';
import { FeatureSpotlight } from '@/components/marketing/FeatureSpotlight';
import { Layers, Zap, EyeOff, ShieldCheck, ArrowRight, Brain } from 'lucide-react';

import { ImageLightbox } from '@/components/marketing/ImageLightbox';

export default function EfficiencyFeature() {
    const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki Efficiency | Stapelverarbeitung</title>
                <meta name="description" content="Maximale Kapazität. Verarbeiten Sie hunderte Seiten in einem Takt mit automatischer PDF-Aufteilung." />
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
                            Pillar: Efficiency
                        </Badge>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            Korrektur im <br />
                            <span className="text-gradient">Smarter Workflow.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto lg:ml-0">
                            Koreki ist auf Masse ausgelegt. Verarbeiten Sie ganze Klassensätze mit hunderten Seiten in einem einzigen Durchlauf – vollautomatisiert und sicher.
                        </p>
                    </div>
                    <div className="flex-1 w-full">
                        <div 
                            className="relative group cursor-zoom-in"
                            onClick={() => setZoomedImage("/screenshots/11_Koreki_Stapelverarbeitung_Ende.png")}
                        >
                            <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-[3rem] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/60 shadow-glass backdrop-blur-3xl bg-white/20 p-3 lg:p-6 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1">
                                <img 
                                    src="/screenshots/11_Koreki_Stapelverarbeitung_Ende.png" 
                                    alt="Batch Processing Complete"
                                    className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-8 px-8 max-w-7xl mx-auto space-y-4">
                    <FeatureSpotlight 
                        badge="Smart Logistics"
                        title="Massenuploads intelligent aufteilen"
                        description="Haben Sie einen kompletten Scan mit allen Klausuren? Koreki erkennt die Grenzen jeder Arbeit, teilt den PDF-Stapel automatisch auf und weist die Seiten den richtigen Schülern zu."
                        imageSrc="/screenshots/8_Koreki_Klassenarbeitsstapel_Aufteilen.png"
                        imageAlt="PDF Split View"
                    />

                    <FeatureSpotlight 
                        reverse
                        badge="Reporting"
                        title="Die Einschätzungsliste im Überblick"
                        description="Behalten Sie die volle Kontrolle über den Leistungsstand. Die Einschätzungsliste liefert Ihnen eine tabellarische Übersicht aller Ergebnisse – bereit für den direkten Übertrag."
                        imageSrc="/screenshots/12_Koreki_Einschätzungsliste.png"
                        imageAlt="Evaluation Overview"
                    />
                </section>
 
                {/* Efficiency Pillars */}
                <section className="py-12 px-8 bg-slate-50/50 border-y border-slate-200/50 relative">
                    <div className="max-w-7xl mx-auto flex flex-col gap-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-sky-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                                    <Layers size={28} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">Stapelverarbeitung</h3>
                                <p className="text-base text-slate-500 font-medium leading-relaxed">
                                    Laden Sie beliebig viele Dateien hoch. Die KI partitioniert die Last und verarbeitet alle Klausuren parallel. Behalten Sie den Status jedes einzelnen Schülers in Echtzeit im Blick.
                                </p>
                            </div>
 
                            <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform">
                                    <EyeOff size={28} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">Auto-Anonymisierung</h3>
                                <p className="text-base text-slate-500 font-medium leading-relaxed">
                                    Schutz für Schüler und Lehrkraft: Bei digitalen Dokumenten (PDF, Moodle-Export) werden Dateinamen beim Import sofort neutralisiert. In den Korrekturansichten arbeiten Sie blind – die Zuordnung erfolgt erst beim finalen Export.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
 

            </div>
        </MarketingLayout>
    );
}
