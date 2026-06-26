import React, { useState } from 'react';
import Head from 'next/head';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';

import { FeatureSubNav } from '@/components/marketing/FeatureSubNav';
import { ImageLightbox } from '@/components/marketing/ImageLightbox';
import { FileSpreadsheet, CheckCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
    number: number;
    title: string;
    description: string;
    screenshot: string;
    badge: string;
}

export default function WorkflowFeature() {
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const steps: TimelineStep[] = [
        {
            number: 1,
            title: 'Musterlösung hochladen',
            description: 'Der Prozess startet mit Ihren eigenen Vorgaben. Laden Sie Ihre Musterlösung hoch. Koreki analysiert das Dokument automatisch, extrahiert die Aufgabenstruktur und legt das Raster für den Abgleich fest.',
            screenshot: '/screenshots/5_koreki_upload_modell_solution.png',
            badge: 'Vorbereitung'
        },
        {
            number: 2,
            title: 'Schülerarbeiten hochladen',
            description: 'Laden Sie den Stapel der Schülerarbeiten als PDF (eingescannte Handzeichnungen oder digitale Arbeiten) hoch. Koreki verarbeitet die Dokumente parallel und bereitet sie für das Splitting vor.',
            screenshot: '/screenshots/6_koreki_upload_student_solutions.png',
            badge: 'Import'
        },
        {
            number: 3,
            title: 'Stapel aufteilen & Namen schwärzen',
            description: 'Klassensätze werden automatisch in Einzeldokumente zerlegt. Koreki schwärzt dabei automatisch Schülernamen auf den Arbeiten, um eine komplett anonyme, unvoreingenommene Korrektur zu gewährleisten.',
            screenshot: '/screenshots/8_Koreki_Klassenarbeitsstapel_Aufteilen.png',
            badge: 'Anonymisierung'
        },
        {
            number: 4,
            title: 'OCR-Handschriftenleser & Plausibilität',
            description: 'Unsere intelligente Textextraktion liest handschriftliche Antworten ein. Koreki gleicht die digitalisierten Daten mit der Musterlösung ab und führt Plausibilitätsprüfungen durch, um Abweichungen sofort zu melden.',
            screenshot: '/screenshots/10_Koreki_OCR_mit_Plausibilitätsprüfung.png',
            badge: 'Analyse'
        },
        {
            number: 5,
            title: 'Ende der Stapelverarbeitung',
            description: 'Die automatische Bewertung läuft. Koreki validiert den gesamten Satz und zeigt Ihnen das erfolgreiche Ende der Stapelverarbeitung an. Sie sehen sofort das Vertrauenslevel der KI für jede Arbeit.',
            screenshot: '/screenshots/11_Koreki_Stapelverarbeitung_Ende.png',
            badge: 'Validierung'
        },
        {
            number: 6,
            title: 'Einschätzungsliste & Export',
            description: 'Alle Auswertungen werden übersichtlich in einer Einschätzungsliste zusammengefasst. Prüfen Sie das Feedback, passen Sie KI-Ergebnisse bei Bedarf an und exportieren Sie alles gesammelt als Excel (XLSX) oder PDF.',
            screenshot: '/screenshots/12_Koreki_Einschätzungsliste.png',
            badge: 'Ergebnis'
        }
    ];

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki Workflow | Schritt-für-Schritt Korrektur</title>
                <meta name="description" content="Der komplette Korrekturprozess von der Musterlösung bis zum finalen Export." />
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
                <section className="px-6 md:px-page-inline pt-4 pb-12 md:pt-6 md:pb-hero-bottom max-w-4xl mx-auto text-center animate-fade-up">
                    <Badge variant="light" className="mb-4">
                        Workflow & Logistics
                    </Badge>
                    <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                        Der gesamte Workflow. <br />
                        <span className="text-gradient">Schritt für Schritt.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto mt-6">
                        Erfahren Sie, wie einfach Koreki den Korrekturalltag strukturiert. Ein sauberer, automatisierter Weg von der Vorlage bis zum fertigen Feedback.
                    </p>
                </section>

                {/* Vertical Timeline Steps */}
                <section className="px-6 md:px-page-inline max-w-5xl mx-auto space-y-16 pb-12 md:pb-section-vertical">
                    {steps.map((step, index) => {
                        const isEven = index % 2 === 0;
                        return (
                            <div 
                                key={step.number}
                                className={cn(
                                    "flex flex-col lg:flex-row gap-10 lg:gap-16 items-center animate-fade-up",
                                    isEven ? "" : "lg:flex-row-reverse"
                                )}
                            >
                                {/* Text Content */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-black text-sm">
                                            {step.number}
                                        </span>
                                        <Badge variant="subtle">{step.badge}</Badge>
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
                                        {step.title}
                                    </h2>
                                    <p className="text-slate-500 text-sm md:text-base font-semibold leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>

                                {/* Interactive Zoom Visual */}
                                <div className="flex-1 w-full">
                                    <div 
                                        className="relative group cursor-zoom-in"
                                        onClick={() => setZoomedImage(step.screenshot)}
                                    >
                                        <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-hero opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                        <div className="relative rounded-hero overflow-hidden border border-white/60 bg-white/20 p-3 shadow-glass transition-all duration-300 hover:scale-[1.01]">
                                            <img 
                                                src={step.screenshot} 
                                                alt={step.title}
                                                className="w-full h-auto rounded-xl shadow-md border border-slate-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* Native Moodle Spotlight */}
                <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline bg-slate-50/50 border-y border-slate-200/50 relative">
                    <div className="max-w-7xl mx-auto flex flex-col gap-16">
                        <div className="glass-morphism p-6 md:p-card-padding rounded-hero border border-white bg-white/60 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <FileSpreadsheet size={160} />
                            </div>
                            <div className="max-w-2xl relative z-10">
                                <h2 className="text-4xl font-black mb-6 tracking-tight text-slate-900">Direct Moodle XLSX Import</h2>
                                <p className="text-lg text-slate-500 font-medium mb-10 leading-relaxed">
                                    Wenn Sie Moodle nutzen, können Sie den Papier-Umweg komplett umgehen. Laden Sie XLSX-Exporte direkt in Koreki hoch.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { t: '100% XLSX Kompatibilität', i: CheckCircle },
                                        { t: 'Automatisches Schüler-ID Mapping', i: CheckCircle },
                                        { t: 'Direkter KI-Transfer ohne OCR', i: CheckCircle },
                                        { t: 'Erhalt der Original-Dateinamen', i: CheckCircle }
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
