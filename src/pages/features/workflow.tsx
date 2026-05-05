import React from 'react';
import Head from 'next/head';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';
import { WorkflowVisual } from '@/components/marketing/WorkflowVisual';
import { FeatureFAQ, FeatureCTA } from '@/components/marketing/MarketingModules';
import { FeatureSubNav } from '@/components/marketing/FeatureSubNav';
import { FeatureSpotlight } from '@/components/marketing/FeatureSpotlight';
import { FileSpreadsheet, Layers, Scissors, CheckCircle, Brain } from 'lucide-react';

import { ImageLightbox } from '@/components/marketing/ImageLightbox';

export default function WorkflowFeature() {
    const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki Workflow | Digitaler Eingang</title>
                <meta name="description" content="Native XLSX Integrationen für Moodle. Automatisieren Sie den Datentransfer ohne OCR-Umwege." />
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
                            Pillar: Logistics
                        </Badge>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            Digitaler Eingang. <br />
                            <span className="text-gradient">XLSX Native.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl mx-auto lg:ml-0">
                            Eliminieren Sie manuelle Dateneingaben. Koreki verarbeitet Moodle-Test-Exporte direkt als XLSX und ordnet Antworten sekundenschnell zu.
                        </p>
                    </div>
                    <div className="flex-1 w-full">
                        <div 
                            className="relative group cursor-zoom-in"
                            onClick={() => setZoomedImage("/screenshots/6_koreki_upload_student_solutions.png")}
                        >
                            <div className="absolute -inset-4 bg-blue-500/20 blur-3xl rounded-[3rem] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/60 shadow-glass backdrop-blur-3xl bg-white/20 p-3 lg:p-6 transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1">
                                <img 
                                    src="/screenshots/6_koreki_upload_student_solutions.png" 
                                    alt="Schüler-Upload Interface"
                                    className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-8 px-8 max-w-7xl mx-auto space-y-4">
                    <FeatureSpotlight 
                        badge="Preparation"
                        title="Das Fundament: Die Musterlösung"
                        description="Der Workflow beginnt mit Ihrer Expertise. Laden Sie die Musterlösung hoch, und Koreki analysiert sofort die Aufgabenstruktur, um den Rahmen für den Abgleich zu schaffen."
                        imageSrc="/screenshots/5_koreki_upload_modell_solution.png"
                        imageAlt="Model Solution Upload"
                    />

                    <FeatureSpotlight 
                        reverse
                        badge="Results"
                        title="Klares Feedback für jeden Schüler"
                        description="Das Ziel jedes Workflows ist das Ergebnis. Koreki generiert detaillierte Feedback-Bögen, die pädagogisch fundiert und sofort einsatzbereit sind."
                        imageSrc="/screenshots/13_Koreki_Schuelerfeedback.png"
                        imageAlt="Schüler-Feedback Ansicht"
                    />
                </section>
 
                {/* Moodle Highlight */}
                <section className="py-12 px-8 bg-slate-50/50 border-y border-slate-200/50 relative">
                    <div className="max-w-7xl mx-auto flex flex-col gap-16">
                        <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FileSpreadsheet size={160} />
                            </div>
                            <div className="max-w-2xl relative z-10">
                                <h2 className="text-4xl font-black mb-6 tracking-tight text-slate-900">Direct Moodle Import</h2>
                                <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed">
                                    Laden Sie Ihre Moodle-Test-Exporte direkt als XLSX hoch. Koreki parst die Tabellenstruktur, erkennt Schülernamen und Freitextfragen automatisch und bereitet alles für die KI-Bewertung vor.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { t: '100% XLSX Kompatibilität', i: CheckCircle },
                                        { t: 'Automatisches Schüler-ID Mapping', i: CheckCircle },
                                        { t: 'Direkter KI-Transfer ohne OCR', i: CheckCircle },
                                        { t: 'Erhalt der Original-Dateinamen', i: CheckCircle }
                                    ].map((f, i) => (
                                        <div key={i} className="flex items-center gap-4 text-sm font-black text-slate-700">
                                            <div className="bg-blue-500/10 text-blue-600 p-2 rounded-lg">
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
