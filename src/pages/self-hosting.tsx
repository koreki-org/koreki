import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Server, ShieldCheck, Cpu, Globe, ArrowRight, Zap, Terminal, LayoutGrid, Monitor, Shield, Github, Database, Lock, Sparkles, HelpCircle, Layers } from 'lucide-react';
import MarketingLayout from '@/layouts/MarketingLayout';
import { isLocalInstance } from '@/lib/env-context';
import { FeatureFAQ, FeatureCTA } from '@/components/marketing/MarketingModules';
import { Badge } from '@/components/ui/Badge';
import { ModelProfiles } from '@/components/marketing/ModelProfiles';

export default function SelfHosting() {
    return (
        <MarketingLayout hideHeader={isLocalInstance()} hideFooter={isLocalInstance()}>
            <Head>
                <title>Self-Hosting | Koreki Community Edition</title>
                <meta name="description" content="Betreiben Sie Koreki in Ihrer eigenen Infrastruktur. Volle Kontrolle, maximale Sicherheit und DSGVO-konform durch Community Single oder Multi-User." />
            </Head>

            <div className="relative pt-0">
                {/* Hero Section */}
                <section className="pt-12 pb-4 px-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] -z-10" />
                    <div className="max-w-4xl mx-auto relative text-center space-y-8 animate-fade-up">
                        <Badge variant="light" className="mb-4">
                            <Layers size={14} className="mr-2" />
                            Community Edition
                        </Badge>
                        <h1 className="text-6xl md:text-8xl font-extrabold text-slate-900 tracking-tighter leading-[0.85]">
                            Souveräne <br />
                            <span className="text-gradient">KI-Infrastruktur.</span>
                        </h1>
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                            Holen Sie Koreki direkt in Ihr Institut. Die Community Edition ermöglicht den Betrieb auf eigenen Servern – für maximale Datensouveränität und volle Kontrolle.
                        </p>
                    </div>
                </section>

                {/* Deployment Modes Section */}
                <section className="py-12 px-8 max-w-[1200px] mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Souveränität nach Maß</h2>
                        <p className="text-slate-500 font-medium text-lg">Wählen Sie das Deployment-Modell, das perfekt zu Ihren Anforderungen passt.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Single-User Card */}
                        <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl transition-all hover:bg-white hover:shadow-2xl hover:-translate-y-1 group">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="bg-emerald-500/10 text-emerald-600 p-5 rounded-2xl shadow-sm border border-emerald-500/10">
                                    <Monitor size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">Community<span className="text-primary">.</span> Single</h3>
                                    <Badge variant="light" className="mt-1">Einzelnutzer</Badge>
                                </div>
                            </div>
                            <p className="text-slate-500 font-medium leading-relaxed mb-10 text-lg">Die schnellste Lösung für individuelle Lehrkräfte oder kleine Teams auf privater Hardware.</p>

                            <ul className="space-y-6">
                                {[
                                    { t: 'Kein Authentifizierungs-Overhead', i: Zap },
                                    { t: 'Lokale Persistenz im Dateisystem', i: Database },
                                    { t: 'Ideal für NAS oder Homeserver', i: Server },
                                    { t: 'Volle Kostenkontrolle (Mistral oder Ollama)', i: Cpu },
                                    { t: 'Installation in < 2 Minuten', i: Sparkles, bg: 'bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10 -mx-4 text-emerald-700' }
                                ].map((item, i) => (
                                    <li key={i} className={`flex items-start gap-4 text-sm font-bold ${item.bg ? item.bg : 'text-slate-700'}`}>
                                        <item.i size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <span>{item.t}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Multi-User Card */}
                        <div className="glass-morphism p-12 rounded-3xl border border-white bg-white/60 shadow-xl relative overflow-hidden group hover:shadow-2xl hover:bg-white/80 hover:-translate-y-2 transition-all">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-all duration-1000" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-5 mb-8">
                                    <div className="bg-indigo-500/10 text-indigo-600 p-5 rounded-2xl shadow-sm border border-indigo-500/20">
                                        <LayoutGrid size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-extrabold text-slate-900 leading-tight">Community<span className="text-primary">.</span> Multi</h3>
                                        <Badge variant="vibrant" className="mt-1">Bereit für Teams</Badge>
                                    </div>
                                </div>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10 text-lg">Die Enterprise-Lösung für Schulen und Institute mit zentraler Nutzerverwaltung.</p>

                                <ul className="space-y-6">
                                    {[
                                        { t: 'Identity Isolation via Keycloak / OIDC', i: Lock },
                                        { t: 'Zentrale Administration & Rollenmanagement', i: ShieldCheck },
                                        { t: 'Multi-User Persistenz-Backend', i: Database },
                                        { t: 'Zentralisierte KI-Key Verwaltung', i: Zap },
                                        { t: 'Skalierbar für ganze Fachschaften', i: Sparkles, gold: true }
                                    ].map((item, i) => (
                                        <li key={i} className={`flex items-start gap-4 text-sm font-bold ${item.gold ? 'bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10 -mx-4 text-indigo-700' : 'text-slate-700'}`}>
                                            <item.i size={20} className={`${item.gold ? 'text-indigo-600' : 'text-indigo-500'} flex-shrink-0 mt-0.5`} />
                                            <span>{item.t}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-12">
                                    <a 
                                        href="https://github.com/koreki-org/koreki/releases"
                                        target="_blank"
                                        className="inline-flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors"
                                    >
                                        Deployment Guide ansehen <ArrowRight size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Tech Bento Grid */}
                <section className="py-24 px-8 overflow-hidden bg-slate-50/50 border-y border-slate-200/60">
                    <div className="max-w-[1200px] mx-auto relative">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">Technologie ohne <br />Kompromisse.</h2>
                            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-[800px] mx-auto">Die Community Edition nutzt modernste Container-Technologie für ein robustes und wartungsarmes Deployment.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-morphism rounded-3xl p-10 border border-white bg-white/60 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="bg-primary text-white p-4 rounded-2xl w-fit shadow-lg mb-6 group-hover:scale-110 transition-transform"><Terminal size={28} /></div>
                                <h4 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Docker Native</h4>
                                <p className="text-slate-500 font-medium leading-relaxed">Vorkonfigurierte Images für Koreki, Keycloak und PostgreSQL. Deployment via Docker-Compose in Sekunden.</p>
                            </div>

                            <div className="glass-morphism rounded-3xl p-10 border border-white bg-indigo-500/5 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="bg-indigo-600 text-white p-4 rounded-2xl w-fit shadow-lg mb-6 group-hover:scale-110 transition-transform"><Cpu size={28} /></div>
                                <h4 className="text-xl font-black text-indigo-900 mb-3 tracking-tight">Local LLM Ready</h4>
                                <p className="text-slate-500 font-medium leading-relaxed">Nahtlose Integration von Ollama. Nutzen Sie Ihre eigene GPU-Power für eine 100% private KI-Inferenz ohne Internet-Zwang.</p>
                            </div>

                            <div className="glass-morphism rounded-3xl p-10 border border-white bg-white/60 hover:bg-white hover:shadow-xl transition-all group">
                                <div className="bg-primary text-white p-4 rounded-2xl w-fit shadow-lg mb-6 group-hover:scale-110 transition-transform"><Github size={28} /></div>
                                <h4 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Open Source</h4>
                                <p className="text-slate-500 font-medium leading-relaxed">Volle Transparenz unter der Polyform Shield Lizenz. Auditieren, modifizieren und erweitern Sie den Quellcode nach Ihren Wünschen.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <ModelProfiles />
                
                {/* CTA */}
                <FeatureCTA />

            </div>
        </MarketingLayout>
    );
}
