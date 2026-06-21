import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Cloud, Cpu, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, ExternalLink, Zap, Key, MousePointerClick, Monitor } from 'lucide-react';
import { isLocalInstance, getKorekiMode } from '@/lib/env-context';
import { openExternal } from '@/lib/os-utils';
import MarketingLayout from '@/layouts/MarketingLayout';
import { ModelProfiles } from '@/components/marketing/ModelProfiles';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Logo from '@/components/Logo';
import { ImageLightbox } from '@/components/marketing/ImageLightbox';

export default function DesktopSetup() {
    const router = useRouter();
    const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);

    useEffect(() => {
        // SaaS Discovery allowed
    }, []);

    const setupPhases = [
        {
            title: "1. Hardware bereitstellen",
            desc: "Für lokale KI (Ollama) ist eine GPU (NVIDIA/Apple) erforderlich.",
            img: "/help/hardware-gpu.jpg"
        },
        {
            title: "2. Ollama installieren & Modell herunterladen",
            desc: "Laden Sie Ollama herunter und installieren Sie ein für koreki bevorzugtes KI-Modell.",
            img: "/help/ollama-download.png"
        },
        {
            title: "3. Koreki mit Ollama verbinden",
            desc: "Stellen Sie die Verbindung her und wählen Sie das installierte Modell aus.",
            img: "/help/ollama-setup.png"
        }
    ];
    
    const mistralPhases = [
        {
            title: "1. API Key bei Mistral erstellen",
            desc: "Erstellen Sie Ihren API-Key im Mistral Studio unter 'API Keys'.",
            img: "/help/mistral-guide-1.png"
        },
        {
            title: "2. API Key in Koreki eintragen",
            desc: "Geben Sie den Key in das Setup-Feld ein. Er wird nur lokal gespeichert.",
            img: "/help/mistral-guide-2.png"
        },
        {
            title: "3. Sichere Speicherung im Windows Tresor",
            desc: "Koreki Desktop speichert Ihren Key verschlüsselt im Windows Credential Manager. Höchste Sicherheit für Ihre Zugangsdaten.",
            img: "/help/windows-desktop-api-key-storage.png"
        }
    ];

    return (
        <MarketingLayout hideHeader={isLocalInstance()} hideFooter={isLocalInstance()}>
            <Head>
                <title>Setup Guide | Koreki Desktop</title>
                <meta name="description" content="Anleitung zur Einrichtung von Koreki Desktop – Mistral API vs. Ollama." />
            </Head>

            {/* Lightbox Zoom Overlay */}
            {zoomedImage && (
                <ImageLightbox 
                    src={zoomedImage} 
                    onClose={() => setZoomedImage(null)} 
                />
            )}

            <div className="min-h-screen py-8 px-6 max-w-7xl mx-auto flex flex-col items-center">
                <div className="mb-6 flex justify-between items-center w-full">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push('/desktop')}
                        className="text-slate-500 hover:text-primary font-bold flex items-center gap-1.5 group h-9"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Zurück
                    </Button>
                    <div className="w-20"></div> {/* Spacer to keep layout balanced if needed */}
                    <div className="w-20"></div> {/* Spacer */}
                </div>

                <div className="text-center mb-10 animate-fade-down">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
                        Wählen Sie Ihre <span className="text-gradient">KI-Strategie.</span>
                    </h1>
                    <p className="text-sm text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                        Entscheiden Sie sich für cloud-basierte Performance (Mistral) oder lokale Datensouveränität (Ollama).
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10">
                    {/* Ollama Card */}
                    <Card className="border-blue-100 shadow-lg hover:shadow-xl transition-all duration-500 group animate-fade-up bg-blue-50/20 rounded-2xl overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-4 flex items-center justify-center group-hover:scale-110 transition-transform border border-blue-100">
                                <Cpu size={24} />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tight text-slate-900">Ollama Lokal</CardTitle>
                            <p className="text-xs text-blue-600 font-black uppercase tracking-widest mt-1">Eigene Infrastruktur</p>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-slate-600 text-sm font-medium leading-tight">
                                    <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <span>Eigene Hardware (Lokaler Betrieb)</span>
                                </li>
                                <li className="flex items-start gap-3 text-slate-600 text-sm font-medium leading-tight">
                                    <CheckCircle2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                    <span>Vollständige Datensouveränität</span>
                                </li>
                                <li className="flex items-start gap-3 text-amber-600 text-xs font-bold leading-tight bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>Bitte beachten Sie die Datenschutzrichtlinien Ihrer Schule</span>
                                </li>
                            </ul>
                            <div className="pt-4 border-t border-slate-100">
                                <button 
                                    onClick={() => openExternal('https://ollama.com/download')}
                                    className="inline-flex items-center gap-1.5 text-blue-600 font-bold text-xs hover:underline"
                                >
                                    Ollama Download <ExternalLink size={12} />
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mistral Card */}
                    <Card className="border-white/60 shadow-lg hover:shadow-xl transition-all duration-500 group animate-fade-up delay-100 rounded-2xl overflow-hidden">
                        <CardHeader className="p-6 pb-2">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 mb-4 flex items-center justify-center group-hover:scale-110 transition-transform border border-orange-100">
                                <Cloud size={24} />
                            </div>
                            <CardTitle className="text-2xl font-black tracking-tight text-slate-900">KI-Cloud (API)</CardTitle>
                            <p className="text-xs text-orange-600 font-black uppercase tracking-widest mt-1">Mistral AI / OpenAI-kompatibel</p>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-slate-600 text-sm font-medium leading-tight">
                                    <Zap size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                    <span>Sofort einsatzbereit (Nur API-Key nötig)</span>
                                </li>
                                <li className="flex items-start gap-3 text-slate-600 text-sm font-medium leading-tight">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Anonymisierte Übertragung (Cloud EU)</span>
                                </li>
                                <li className="flex items-start gap-3 text-amber-600 text-xs font-bold leading-tight bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <span>Bitte beachten Sie die Datenschutzrichtlinien Ihrer Schule</span>
                                </li>
                            </ul>
                            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-2">
                                <button 
                                    onClick={() => openExternal('https://console.mistral.ai')}
                                    className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs hover:underline"
                                >
                                    Mistral Studio <ExternalLink size={12} />
                                </button>
                                <button 
                                    onClick={() => openExternal('https://www.mittwald.de/mstudio/ai-hosting')}
                                    className="inline-flex items-center gap-1.5 text-orange-600 font-bold text-xs hover:underline"
                                >
                                    Mittwald KI (DE Hosting) <ExternalLink size={12} />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
                    <div className="animate-fade-up">
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Ollama Einrichtungs-Guide</h2>
                            <div className="w-12 h-1 bg-blue-500 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 text-left">
                            {setupPhases.map((phase, idx) => (
                                <Card 
                                    key={idx} 
                                    className="border-white/60 shadow-sm rounded-2xl bg-white overflow-hidden flex group hover:shadow-md transition-all duration-300 cursor-zoom-in"
                                    onClick={() => setZoomedImage(phase.img)}
                                >
                                    <div className="w-32 bg-slate-50 relative overflow-hidden p-2 flex items-center justify-center shrink-0 border-r border-slate-100">
                                        <img 
                                            src={phase.img} 
                                            alt={phase.title} 
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <CardContent className="p-4 flex-grow">
                                        <h4 className="font-bold text-slate-900 text-xs mb-1">{phase.title}</h4>
                                        <p className="text-xs text-slate-500 font-medium leading-normal">{phase.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="animate-fade-up delay-100">
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Cloud-API Einrichtungs-Guide</h2>
                            <div className="w-12 h-1 bg-orange-400 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {mistralPhases.map((phase, idx) => (
                                <Card 
                                    key={idx} 
                                    className="border-white/60 shadow-sm rounded-2xl bg-white overflow-hidden flex group hover:shadow-md transition-all duration-300 cursor-zoom-in"
                                    onClick={() => setZoomedImage(phase.img)}
                                >
                                    <div className="w-32 bg-slate-50 relative overflow-hidden p-2 flex items-center justify-center shrink-0 border-r border-slate-100">
                                        <img 
                                            src={phase.img} 
                                            alt={phase.title} 
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-sm">
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <CardContent className="p-4 flex-grow">
                                        <h4 className="font-bold text-slate-900 text-xs mb-1">{phase.title}</h4>
                                        <p className="text-xs text-slate-500 font-medium leading-normal">{phase.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>

                <ModelProfiles />



                {getKorekiMode() === 'desktop' && (
                    <Button 
                        onClick={() => router.push('/app')}
                        className="w-full max-w-md h-14 bg-primary hover:bg-primary/90 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-[0.98] group"
                    >
                        Fertig, zur Applikation
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                )}
                </div>
        </MarketingLayout>
    );
}
