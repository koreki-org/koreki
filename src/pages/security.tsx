import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Shield, Lock, ShieldCheck, Database, CreditCard, Clock, EyeOff, Server, HardDrive, Cpu, AlertTriangle, Sparkles, Brain, Monitor, LayoutGrid, Zap } from 'lucide-react';
import MarketingLayout from '../layouts/MarketingLayout';
import { Badge } from '@/components/ui/Badge';
import { LEGAL_CONFIG } from '@/config/legal-contact';

export default function Security() {
    return (
        <MarketingLayout>
            <Head>
                <title>Sicherheit & Datenschutz | Koreki</title>
                <meta name="description" content="Privacy by Design. Erfahren Sie, wie Koreki Schülerdaten durch modernste Client-Side-Verschlüsselung und PURE-Mode schützt." />
            </Head>

            <div className="relative pt-0">
                {/* Hero Section */}
                <section className="pt-10 pb-12 md:pt-14 md:pb-hero-bottom px-6 md:px-page-inline text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />
                    <div className="max-w-3xl mx-auto relative text-center space-y-8 animate-fade-up">
                        <Badge variant="light" className="mb-4">
                            <ShieldCheck size={14} className="mr-2" />
                            Sicherheit im Fokus
                        </Badge>
                        <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]">
                            Sicherheit, die man nicht auf <br />
                            <span className="text-gradient">Papier drucken</span> muss.
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                            Bei Schülerdaten gibt es keine Kompromisse. Koreki wurde von Grund auf entwickelt, um Datensparsamkeit technisch zu erzwingen – nicht nur vertragliche Versprechen zu geben.
                        </p>
                    </div>
                </section>

                {/* Active Deployment Modes - Desktop & Community */}
                <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Echte Datensouveränität</h2>
                        <p className="text-slate-500 font-medium text-lg">Koreki ist in zwei aktiven Versionen verfügbar, die maximale Sicherheit durch lokale Datenverarbeitung garantieren.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Desktop Edition Card */}
                        <div className="glass-morphism p-6 md:p-card-padding rounded-3xl border border-white bg-white/60 shadow-xl relative overflow-hidden group hover:shadow-2xl hover:bg-white/80 hover:-translate-y-2 transition-all">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-blue-500/10 transition-all duration-1000" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="bg-blue-500/10 text-blue-600 p-5 rounded-2xl shadow-sm border border-blue-500/20">
                                        <Monitor size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 leading-tight">Koreki<span className="text-primary">.</span> Desktop</h3>
                                        <Badge variant="vibrant" className="mt-1">Aktiv & Verfügbar</Badge>
                                    </div>
                                </div>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10 text-lg">Die native App für Windows. Perfekt für die individuelle Korrektur direkt auf Ihrer Hardware.</p>

                                <ul className="space-y-6">
                                    {[
                                        { t: '100% Offline-Betrieb möglich', i: ShieldCheck },
                                        { t: 'KI-Wahl: Lokal (Ollama) oder Cloud (Mistral)', i: Brain },
                                        { t: 'KI-Performance: GPU empfohlen (CPU-Inferenz speicher- & zeitintensiv)', i: Zap },
                                        { t: 'Datenhoheit: Offline-Modus oder direkte KI-Anbindung', i: ShieldCheck },
                                        { t: 'Ideal für private Endgeräte', i: Sparkles, gold: true }
                                    ].map((item, i) => (
                                        <li key={i} className={`flex items-start gap-4 text-sm font-bold ${item.gold ? 'bg-blue-500/5 rounded-2xl p-4 border border-blue-500/10 -mx-4 text-blue-700' : 'text-slate-700'}`}>
                                            <item.i size={20} className={`${item.gold ? 'text-blue-600' : 'text-blue-500'} flex-shrink-0 mt-0.5`} />
                                            <span>{item.t}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-12">
                                    <Link href="/desktop" className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:text-blue-500 transition-colors">
                                        Details zur Desktop App <ArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Community Edition Card */}
                        <div className="glass-morphism p-6 md:p-card-padding rounded-3xl border border-white bg-white/60 shadow-xl transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 group">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="bg-indigo-500/10 text-indigo-600 p-5 rounded-2xl shadow-sm border border-indigo-500/10">
                                    <LayoutGrid size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight">Koreki<span className="text-primary">.</span> Community</h3>
                                    <Badge variant="light" className="mt-1">Open Source</Badge>
                                </div>
                            </div>
                            <p className="text-slate-500 font-medium leading-relaxed mb-10 text-lg">Die Docker-basierte Lösung für das lokale Hosting in Schulnetzwerken oder privaten Clouds.</p>

                            <ul className="space-y-6">
                                {[
                                    { t: 'Self-Hosting via Docker & Docker-Compose', i: ShieldCheck, v: 'text-indigo-600' },
                                    { t: 'Volle Kontrolle über die Infrastruktur', i: ShieldCheck, v: 'text-indigo-600' },
                                    { t: 'KI-Wahl: Lokal (Ollama) oder Cloud (Mistral)', i: Brain, v: 'text-indigo-600' },
                                    { t: 'Zentrales Management für Fachschaften', i: ShieldCheck, v: 'text-indigo-600' },
                                    { t: 'Open Source (Polyform Lizenz)', i: Sparkles, v: 'text-indigo-600', bg: 'bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10 -mx-4' }
                                ].map((item, i) => (
                                    <li key={i} className={`flex items-start gap-4 text-sm font-bold text-slate-700 ${item.bg || ''}`}>
                                        <item.i size={20} className={`${item.v} flex-shrink-0 mt-0.5`} />
                                        <span>{item.t}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Feature Bento Grid */}
                <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline overflow-hidden">
                    <div className="max-w-[1200px] mx-auto relative">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">Was im Browser passiert, <br />bleibt im Browser.</h2>
                            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-[800px] mx-auto">Unsere innovativen Techniken zum Schutz von Schülerdaten – direkt auf Ihrem Endgerät. Lediglich für die KI-Features wird externe Infrastruktur (z.B. Mistral) genutzt.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-morphism rounded-3xl p-4 md:p-card-padding-sm border border-white bg-white/60 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="bg-primary text-white p-4 rounded-2xl w-fit shadow-lg mb-6 group-hover:scale-110 transition-transform"><EyeOff size={28} /></div>
                                <h4 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Manuelle Schwärzung</h4>
                                <p className="text-slate-500 font-medium leading-relaxed">Namen auf eingescannten Bildern lassen sich direkt im Browser unkenntlich machen (&quot;Pixel einbrennen&quot;). Erst das anonymisierte Bild verlässt Ihren Rechner.</p>
                            </div>

                            <div className="glass-morphism rounded-3xl p-4 md:p-card-padding-sm border border-white bg-blue-500/5 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="bg-blue-600 text-white p-4 rounded-2xl w-fit shadow-lg mb-6 group-hover:scale-110 transition-transform"><Cpu size={28} /></div>
                                <h4 className="text-xl font-black text-blue-900 mb-3 tracking-tight">Lokale Key-Souveränität</h4>
                                <p className="text-slate-500 font-medium leading-relaxed">In der Desktop & Community Edition werden Ihre API-Schlüssel (z.B. Mistral) <strong className="text-slate-700">ausschließlich lokal</strong> auf Ihrem Endgerät gespeichert. Es findet keine Übertragung oder Speicherung auf Koreki-Servern statt.</p>
                            </div>

                            <div className="glass-morphism rounded-3xl p-4 md:p-card-padding-sm border border-white bg-white/60 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="bg-primary text-white p-4 rounded-2xl w-fit shadow-lg mb-6 group-hover:scale-110 transition-transform"><HardDrive size={28} /></div>
                                <h4 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Lokale Pseudonymisierung</h4>
                                <p className="text-slate-500 font-medium leading-relaxed">Dateinamen wie &quot;Klausur_Max_Mustermann.pdf&quot; werden bereits in Ihrem Browser zu &quot;Schüler #1&quot; umbenannt, bevor sie überhaupt hochgeladen werden.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SaaS & Cloud Section - Coming Soon */}
                <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline max-w-[1200px] mx-auto">
                    <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 p-6 md:p-card-padding relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <Clock size={200} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1">
                                <Badge variant="light" className="mb-6">
                                    <Sparkles size={14} className="mr-2 animate-pulse" />
                                    Coming Soon
                                </Badge>
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-[0.9]">
                                    Koreki<span className="text-primary">.</span> SaaS: <br />
                                    <span className="text-gradient">KI-Power</span> ohne Installation.
                                </h2>
                                <p className="text-slate-500 font-medium text-lg leading-relaxed mb-8">
                                    Wir bereiten aktuell den Launch der Cloud-Infrastruktur vor. Hierfür suchen wir noch <strong className="text-slate-900">strategische Partner & Pilotschulen</strong>, die den Weg in die Cloud mit uns gemeinsam gestalten möchten.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <div className="bg-white/60 px-6 py-4 rounded-2xl border border-white flex flex-col gap-1">
                                        <h4 className="font-black text-slate-900 text-sm">Standard-Mode</h4>
                                        <p className="text-xs text-slate-500 font-medium">Bequeme &quot;Out-of-the-box&quot; Lösung mit AVV.</p>
                                        <span className="mt-2 text-xs font-black uppercase text-amber-600 tracking-tighter">Coming Soon</span>
                                    </div>
                                    <div className="bg-white/60 px-6 py-4 rounded-2xl border border-white flex flex-col gap-1">
                                        <h4 className="font-black text-slate-900 text-sm">PURE-Mode</h4>
                                        <p className="text-xs text-slate-500 font-medium">Client-Side Direct-to-AI Kommunikation.</p>
                                        <span className="mt-2 text-xs font-black uppercase text-amber-600 tracking-tighter">Coming Soon</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 glass-morphism p-4 md:p-card-padding-sm rounded-3xl border border-white bg-white/40">
                                <h3 className="text-xl font-black text-slate-900 mb-4 font-outfit">Interesse am Partnerprogramm?</h3>
                                <p className="text-sm text-slate-500 font-medium mb-6">Wir suchen Institutionen, die Koreki als SaaS-Lösung frühzeitig testen und evaluieren möchten.</p>
                                <Link href={`mailto:${LEGAL_CONFIG.contact.email}`} className="bg-primary text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 w-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                    Kontakt aufnehmen <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>


            </div>
        </MarketingLayout>
    );
}
