import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ShieldAlert, Monitor, ArrowRight, Zap, Info, Compass, Layers } from 'lucide-react';
import { isLocalInstance } from '@/lib/env-context';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Logo from '@/components/Logo';

export default function DesktopOnboarding() {
    const router = useRouter();

    useEffect(() => {
        // SaaS Discovery allowed
    }, []);

    const handleStartApp = () => {
        router.push('/app');
    };

    const handleDownloadDesktop = () => {
        window.location.href = 'https://github.com/koreki-org/koreki/releases';
    };

    return (
        <MarketingLayout hideHeader={isLocalInstance()} hideFooter={isLocalInstance()}>
            <Head>
                <title>Koreki Desktop | Lokale Korrekturinstanz</title>
                <meta name="description" content="Willkommen bei Koreki Desktop – Ihrer sicheren, lokalen Lösung für KI-gestützte Korrekturen." />
            </Head>

            <div className="min-h-screen flex flex-col items-center justify-start px-8 md:px-12 pt-24 pb-12 relative overflow-hidden bg-slate-50/50">

                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start z-10">
                    <div className="flex flex-col gap-6 animate-fade-up lg:pt-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 w-fit">
                            <Monitor size={14} />
                            <span className="text-[9px] font-black uppercase tracking-wider">Desktop Edition</span>
                        </div>
                        
                        <div className="space-y-3">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                                Ihre lokale <br />
                                <span className="text-gradient">KI-Instanz.</span>
                            </h1>
                            <p className="text-base text-slate-500 leading-relaxed font-medium max-w-md">
                                Koreki Desktop bringt die Power moderner Korrektur-KI direkt in Ihre Infrastruktur. 
                                Maximale Souveränität durch lokale Kontrolle oder sichere Cloud-Anbindung.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 mt-2">
                            <div className="flex items-start gap-4 p-3 rounded-xl transition-all hover:bg-white group">
                                <div className="mt-1 w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <Compass size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Flexible Anbindung</h3>
                                    <p className="text-[13px] text-slate-500 leading-normal">Wählen Sie zwischen Cloud-Komfort (Mistral) oder lokaler Autonomie (Ollama).</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3 rounded-xl transition-all hover:bg-white group">
                                <div className="mt-1 w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Native Performance</h3>
                                    <p className="text-[13px] text-slate-500 leading-normal">Optimiert für lokale Hardware-Beschleunigung und nahtlose Integration.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-3 rounded-xl transition-all hover:bg-white group">
                                <div className="mt-1 w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <Layers size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Windows & Linux</h3>
                                    <p className="text-[13px] text-slate-500 leading-normal">Native Unterstützung für Windows 10/11 und Ubuntu Desktop (macOS coming soon).</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="animate-fade-up delay-150">
                        <Card className="border-white/60 shadow-xl relative overflow-hidden group rounded-[24px]">
                           <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                           <CardContent className="p-6 md:p-8 relative z-10">
                               <div className="flex items-start gap-3 mb-6 text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200/50">
                                   <ShieldAlert size={24} className="shrink-0 mt-0.5" />
                                   <div>
                                       <h4 className="font-black uppercase text-[9px] tracking-widest mb-1">Datenschutz & Verantwortung</h4>
                                       <p className="font-bold text-xs leading-snug">Bitte beachten Sie die Datenschutzrichtlinien Ihrer Schule.</p>
                                   </div>
                               </div>

                               <div className="space-y-4 text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                                   <p>
                                       Stellen Sie sicher, dass Ihr System vor unbefugtem Zugriff geschützt ist. Details zur Anbindung finden Sie im Guide.
                                   </p>
                                   <div className="text-[10px] bg-slate-100/50 p-4 rounded-xl border border-slate-200 mt-4 leading-normal">
                                        <strong className="text-slate-700 block mb-1 uppercase tracking-tighter font-black text-[10px]">Haftungsausschluss</strong> 
                                        Die Nutzung der Software erfolgt auf eigene Gefahr. Der Entwickler übernimmt keine Haftung für Schäden, Datenverlust oder Inkompatibilitäten, die durch die Installation oder Nutzung der Desktop Edition entstehen.
                                    </div>
                               </div>

                               <div className="space-y-3">
                                   {isLocalInstance() ? (
                                       <Button 
                                           onClick={handleStartApp}
                                           size="lg" 
                                           className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] group shadow-lg shadow-primary/20"
                                       >
                                           Zur Applikation
                                           <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                       </Button>
                                   ) : (
                                       <Button 
                                           onClick={handleDownloadDesktop}
                                           size="lg" 
                                           className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] group shadow-lg shadow-primary/20"
                                       >
                                           Desktop App herunterladen
                                           <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                       </Button>
                                   )}

                                   <div 
                                       className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 group/setup cursor-pointer transition-all hover:bg-blue-100/50 hover:border-blue-200 shadow-sm" 
                                       onClick={() => router.push('/desktop-setup')}
                                   >
                                       <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white text-primary flex items-center justify-center shrink-0 shadow-sm border border-blue-100 group-hover/setup:scale-110 transition-transform">
                                                <Info size={20} />
                                            </div>
                                            <div className="text-left flex-grow">
                                                <h4 className="font-bold text-slate-900 text-xs text-gradient">Einrichtung noch nicht fertig?</h4>
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Setup Guide: Mistral oder Ollama</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-blue-100 group-hover/setup:bg-primary group-hover/setup:text-white transition-all">
                                                <ArrowRight size={14} className="group-hover/setup:translate-x-0.5 transition-transform" />
                                            </div>
                                       </div>
                                   </div>
                               </div>

                               <div className="mt-6 flex items-center justify-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                   Koreki V1.0 Desktop Build
                               </div>
                           </CardContent>
                        </Card>
                    </div>
                </div>

                {isLocalInstance() && (
                    <div className="mt-8 text-center animate-fade-in delay-500">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] px-6">
                            &copy; {new Date().getFullYear()} Koreki – Premium AI Correction Architecture
                        </p>
                    </div>
                )}
            </div>
        </MarketingLayout>
    );
}
