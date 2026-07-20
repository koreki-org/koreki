import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MarketingLayout from '../layouts/MarketingLayout';
import { FeatureSubNav } from '../components/marketing/FeatureSubNav';
import { FeatureFAQ } from '../components/marketing/MarketingModules';
import { Brain, FileSpreadsheet, ShieldCheck, Sparkles, Database, ArrowRight, Upload, Scissors, Cpu, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { ImageLightbox } from '@/components/marketing/ImageLightbox';

const InteractiveWorkflowVisual: React.FC = () => {
    const steps = [
        {
            number: 1,
            title: 'Musterlösung',
            desc: 'Klausurenraster automatisch festlegen',
            icon: <FileSpreadsheet className="w-5 h-5" />,
            color: 'from-accent-1/10 to-accent-2/10 text-accent-1 border-accent-1/20'
        },
        {
            number: 2,
            title: 'Schülerarbeiten',
            desc: 'Stapel parallel hochladen',
            icon: <Upload className="w-5 h-5" />,
            color: 'from-accent-4/10 to-accent-2/10 text-accent-4 border-accent-4/20'
        },
        {
            number: 3,
            title: 'Stapel-Splitting',
            desc: 'Seiten trennen & anonymisieren',
            icon: <Scissors className="w-5 h-5" />,
            color: 'from-accent-4/10 to-accent-4/10 text-accent-4 border-accent-4/20'
        },
        {
            number: 4,
            title: 'OCR-Analyse',
            desc: 'Handschriften & Plausibilität prüfen',
            icon: <Cpu className="w-5 h-5" />,
            color: 'from-accent-2/10 to-accent-2/10 text-accent-2 border-accent-2/20'
        },
        {
            number: 5,
            title: 'Stapelverarbeitung',
            desc: 'Validierung & Vertrauenslevel ermitteln',
            icon: <Brain className="w-5 h-5" />,
            color: 'from-accent-3/10 to-accent-3/10 text-accent-3 border-accent-3/20'
        },
        {
            number: 6,
            title: 'Einschätzungsliste',
            desc: 'Kontrolle & XLSX/PDF-Export',
            icon: <FileCheck className="w-5 h-5" />,
            color: 'from-accent-1/10 to-accent-1/10 text-accent-1 border-accent-1/20'
        }
    ];

    const [activeStep, setActiveStep] = useState<number | null>(null);

    return (
        <div className="w-full bg-muted/50 rounded-2xl border border-border/50 p-6 font-outfit relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-gradient-glass pointer-events-none opacity-40" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                {steps.map((step) => {
                    const isHovered = activeStep === step.number;
                    return (
                        <div
                            key={step.number}
                            onMouseEnter={() => setActiveStep(step.number)}
                            onMouseLeave={() => setActiveStep(null)}
                            className={cn(
                                "flex flex-col gap-3 p-4 rounded-xl border bg-white transition-all duration-300",
                                isHovered 
                                    ? "shadow-md border-primary scale-[1.02] bg-gradient-to-b"
                                    : "border-border shadow-sm"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "flex items-center justify-center w-7 h-7 rounded-full text-xs font-black",
                                    isHovered ? "bg-primary text-primary-foreground" : "bg-muted/80 text-muted-foreground"
                                )}>
                                    {step.number}
                                </span>
                                <div className={cn(
                                    "p-1.5 rounded-lg border bg-gradient-to-br",
                                    step.color
                                )}>
                                    {step.icon}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-foreground leading-tight mb-1">{step.title}</h4>
                                <p className="text-muted-foreground text-xs font-medium leading-snug">{step.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-primary/40 animate-ping" />
                <span>Interaktiver Workflow von Musterlösung bis Export</span>
            </div>
        </div>
    );
};

interface FeaturePillar {
    id: string;
    title: string;
    tabLabel: string;
    tabDesc: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    screenshot: string;
    accentColor: string;
    badge: string;
}

export default function Features() {
    const pillars: FeaturePillar[] = [
        {
            id: 'workflow',
            title: 'Der Koreki-Workflow: Schritt für Schritt zum Ziel',
            tabLabel: 'Workflow',
            tabDesc: 'End-to-End Korrektur',
            description: 'Vom ersten Upload der Musterlösung über das automatische Splitting der Schülerklausuren bis hin zum Abschluss der Stapelverarbeitung. Der Workflow führt Sie logisch und zeiteffizient durch den gesamten Prozess der Einschätzungsermittlung.',
            icon: <FileSpreadsheet className="w-6 h-6" />,
            href: '/features/workflow',
            screenshot: '/screenshots/11_Koreki_Stapelverarbeitung_Ende.png',
            accentColor: 'accent-2',
            badge: 'Logistics'
        },
        {
            id: 'expertise',
            title: 'Fachliche Hoheit im Expert-Center',
            tabLabel: 'Expertise',
            tabDesc: 'Fachliche Vorgaben',
            description: 'Im Expert-Center behalten Sie die volle Kontrolle über den Korrekturprozess. Legen Sie Bewertungskriterien, Klausurziele und fachliche Spezifikationen fest. Die KI arbeitet streng als Assistenz unter Ihren Vorgaben.',
            icon: <ShieldCheck className="w-6 h-6" />,
            href: '/features/expertise',
            screenshot: '/screenshots/4a_koreki_expert_center.png',
            accentColor: 'accent-1',
            badge: 'Control'
        },
        {
            id: 'skills',
            title: 'Modularer Aufbau durch Kriterienkataloge',
            tabLabel: 'Skills',
            tabDesc: 'Kompentenzbereiche',
            description: 'Strukturieren Sie Ihre Einschätzungen mit modularen Skill-Profilen. Weisen Sie Aufgaben spezifische Fachkompetenzen und Fähigkeiten zu, um präzise und verständliche Auswertungen zu erhalten.',
            icon: <Sparkles className="w-6 h-6" />,
            href: '/features/skills',
            screenshot: '/screenshots/4b_koreki_skill_center.png',
            accentColor: 'accent-4',
            badge: 'Modularity'
        },
        {
            id: 'memory',
            title: 'Einschätzungsgedächtnis durch Grading-Memory',
            tabLabel: 'Memory',
            tabDesc: 'Absolute Konsistenz',
            description: 'Das Grading-Memory lernt aus Ihren manuellen Korrekturen. Einmal korrigierte Fehler werden automatisch erkannt und bei anderen Schülern identisch bewertet. Das sorgt für absolute Fairness und Konsistenz über den gesamten Stapel hinweg.',
            icon: <Database className="w-6 h-6" />,
            href: '/features/memory',
            screenshot: '/screenshots/4c_koreki_grading-memory_center.png',
            accentColor: 'accent-3',
            badge: 'Consistency'
        },
        {
            id: 'intelligence',
            title: 'Flexible KI-Parametersteuerung',
            tabLabel: 'Intelligenz',
            tabDesc: 'KI-Parameter-Center',
            description: 'Im AI-Parameter-Center steuern Sie die Rechenleistung. Wählen Sie Ihr bevorzugtes LLM (Mistral, OpenAI oder lokal per Ollama), passen Sie Temperatur und Top-P an und konfigurieren Sie die KI exakt nach Ihren Bedürfnissen.',
            icon: <Brain className="w-6 h-6" />,
            href: '/features/intelligence',
            screenshot: '/screenshots/4d_koreki_ai-parameter_center.png',
            accentColor: 'sky',
            badge: 'Core AI'
        }
    ];

    const [activeTab, setActiveTab] = useState(pillars[0].id);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    const activePillar = pillars.find(p => p.id === activeTab) || pillars[0];

    return (
        <MarketingLayout>
            <Head>
                <title>Features | Koreki</title>
                <meta name="description" content="Entdecken Sie die Werkzeuge für die moderne Korrektur. Von KI-Intelligenz bis hin zu nahtlosem Moodle-Import." />
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

                {/* --- 🦸‍♂️ Hero: The Promise --- */}
                <section className="pt-4 pb-12 md:pt-6 md:pb-hero-bottom px-6 md:px-page-inline text-center relative overflow-hidden">
                    <div className="max-w-4xl mx-auto relative z-10 animate-fade-up">
                        <Badge variant="light" className="mb-8">
                            Features & Pillars
                        </Badge>
                        <h1 className="text-6xl md:text-8xl font-black text-foreground mb-8 tracking-tighter leading-[0.9]">
                            Intelligenz trifft <br />
                            <span className="text-gradient">Souveränität.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed max-w-2xl mx-auto">
                            Koreki ist kein einfaches Werkzeug. Es ist das Nervenzentrum für die fortschrittlichste Korrektur-Assistenz.
                        </p>
                    </div>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.05)_0%,transparent_70%)] pointer-events-none -z-10" />
                </section>

                {/* --- 🏭 Modern Interactive Pillar Showcase --- */}
                <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 items-start animate-fade-up">
                    {/* Left: Tab Selectors */}
                    <div className="w-full lg:w-1/3 flex flex-col gap-3 lg:sticky lg:top-32 h-fit">
                        {pillars.map((pillar) => {
                            const isActive = activeTab === pillar.id;
                            const colors: Record<string, string> = {
                                'accent-2': 'hover:border-accent-2/20 hover:bg-accent-2/5 text-accent-2',
                                'accent-1': 'hover:border-accent-1/20 hover:bg-accent-1/5 text-accent-1',
                                'accent-4': 'hover:border-accent-4/20 hover:bg-accent-4/5 text-accent-4',
                                'accent-3': 'hover:border-accent-3/20 hover:bg-accent-3/5 text-accent-3',
                                sky: 'hover:border-accent-1/20 hover:bg-accent-1/5 text-accent-1'
                            };

                            const activeBgColors: Record<string, string> = {
                                'accent-2': 'bg-accent-2/10 border-accent-2/20 text-accent-2 shadow-sm',
                                'accent-1': 'bg-accent-1/10 border-accent-1/20 text-accent-1 shadow-sm',
                                'accent-4': 'bg-accent-4/10 border-accent-4/20 text-accent-4 shadow-sm',
                                'accent-3': 'bg-accent-3/10 border-accent-3/20 text-accent-3 shadow-sm',
                                sky: 'bg-accent-1/10 border-accent-1/20 text-accent-1 shadow-sm'
                            };

                            const activeAccentLine: Record<string, string> = {
                                'accent-2': 'bg-accent-2',
                                'accent-1': 'bg-accent-1',
                                'accent-4': 'bg-accent-4',
                                'accent-3': 'bg-accent-3',
                                sky: 'bg-accent-1'
                            };

                            return (
                                <button
                                    key={pillar.id}
                                    onClick={() => setActiveTab(pillar.id)}
                                    className={cn(
                                        "w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 font-outfit shadow-sm relative overflow-hidden",
                                        isActive 
                                            ? cn("shadow-md", activeBgColors[pillar.accentColor]) 
                                            : cn("bg-white/60 border-border text-muted-foreground", colors[pillar.accentColor])
                                    )}
                                >
                                    {isActive && (
                                        <div className={cn(
                                            "absolute left-1 top-4 bottom-4 w-1 rounded-full",
                                            activeAccentLine[pillar.accentColor]
                                        )} />
                                    )}
                                    <div className={cn(
                                        "p-2.5 rounded-xl transition-colors relative z-10",
                                        isActive ? "bg-white text-primary shadow-sm" : "bg-muted text-muted-foreground"
                                    )}>
                                        {pillar.icon}
                                    </div>
                                    <div className="flex flex-col relative z-10">
                                        <span className="font-bold text-base leading-none mb-1">{pillar.tabLabel}</span>
                                        <span className="text-xs text-muted-foreground font-medium">{pillar.tabDesc}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: Display Panel */}
                    <div className="w-full lg:w-2/3 flex flex-col justify-between p-6 md:p-card-padding bg-white/60 border border-white rounded-hero shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            {activePillar.icon}
                        </div>

                        <div className="relative z-10 flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <Badge variant="light">
                                    {activePillar.badge}
                                </Badge>
                            </div>
                            <h2 className="text-3xl font-black text-foreground tracking-tight leading-tight">
                                {activePillar.title}
                            </h2>
                            <p className="text-muted-foreground font-medium text-base leading-relaxed max-w-2xl">
                                {activePillar.description}
                            </p>
                        </div>

                        {/* Interactive Visual or Screenshot Preview */}
                        <div className="mt-8 relative w-full">
                            {activeTab === 'workflow' ? (
                                <InteractiveWorkflowVisual />
                            ) : (
                                <div 
                                    className="relative group cursor-zoom-in"
                                    onClick={() => setZoomedImage(activePillar.screenshot)}
                                >
                                    <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-hero opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                    <div className="relative rounded-xl overflow-hidden border border-black/5 bg-muted shadow-md transition-all duration-300 hover:shadow-lg">
                                        <img 
                                            src={activePillar.screenshot} 
                                            alt={activePillar.title}
                                            className="w-full h-auto object-cover object-top aspect-[16/9]"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Link 
                                href={activePillar.href}
                                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/35 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 font-outfit"
                            >
                                Deep Dive öffnen <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </section>

                <FeatureFAQ />
            </div>
        </MarketingLayout>
    );
}
