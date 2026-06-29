import React from 'react';
import { Zap, ShieldCheck, Cpu, Timer, Monitor, AlertCircle } from 'lucide-react';

export const PerformanceSection: React.FC = () => {
    const scenarios = [
        {
            name: "Desktop (Ohne GPU)",
            fokus: "Lokal / CPU-Only",
            time: "290s – 500s",
            details: "Gemma 4B / Mistral Small 3.2",
            bestFor: "Einzelne Texte / Geduld erforderlich",
            color: "slate",
            icon: Monitor,
            warning: true
        },
        {
            name: "GPU-Server (On Premise)",
            fokus: "Community Multi / Desktop Pro",
            time: "25s",
            details: "Mistral Small 3.2 (20GB VRAM)",
            bestFor: "Institutioneller Dauereinsatz",
            color: "emerald",
            icon: Cpu
        },
        {
            name: "SaaS / Cloud API",
            fokus: "Maximale Performance",
            time: "10s – 17s",
            details: "Mistral Cloud / Qwen 3.6 Pro",
            bestFor: "Größte Stapelverarbeitungen",
            color: "blue",
            icon: Zap
        }
    ];

    return (
        <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline max-w-7xl mx-auto overflow-hidden">
            <div className="text-center mb-10 animate-fade-up">
                <h2 className="text-[3rem] md:text-[4rem] font-black text-foreground tracking-tighter leading-none mb-6">
                    Intelligenz trifft <br />
                    <span className="text-gradient">Effizienz.</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
                    Messbare Zeitersparnis für Ihren Schulalltag. Koreki liefert Ergebnisse in Sekunden, nicht in Stunden.
                </p>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-6 bg-muted inline-block px-4 py-2 rounded-full border border-border">
                    * Basis: Kleine Klassenarbeit (5 Aufgaben) pro Schüler
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.03)_0%,transparent_70%)] pointer-events-none" />

                {scenarios.map((s, idx) => (
                    <div 
                        key={idx}
                        className={`group relative bg-white rounded-hero p-4 md:p-card-padding-sm shadow-glass border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl animate-fade-up ${
                            s.warning ? 'border-border opacity-80' : 'border-border hover:border-primary/20'
                        }`}
                        style={{ animationDelay: `${idx * 150}ms` }}
                    >
                        <div className={`w-14 h-14 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                            <s.icon size={28} />
                        </div>

                        <div className="mb-8">
                            <h3 className="text-xl font-black text-foreground mb-1 tracking-tight">{s.name}</h3>
                            <p className={`text-xs font-black text-${s.color}-600 uppercase tracking-widest`}>{s.fokus}</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-end border-b border-border pb-3">
                                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Ø Zeit / Korrektur</span>
                                <span className={`text-2xl font-black tracking-tighter ${s.warning ? 'text-muted-foreground' : 'text-foreground'}`}>~{s.time}</span>
                            </div>
                            <div className="text-xs text-muted-foreground font-bold italic">
                                {s.details}
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl border transition-all duration-500 ${
                            s.warning ? 'bg-muted border-border' : 'bg-muted border-border group-hover:bg-primary group-hover:text-white'
                        }`}>
                            <p className="text-xs font-black uppercase tracking-tight opacity-60 mb-1">Empfehlung</p>
                            <p className="text-xs font-bold leading-tight">{s.bestFor}</p>
                        </div>
                        
                        {s.warning && (
                            <div className="mt-4 flex items-center gap-2 text-warning text-xs font-bold uppercase tracking-tight">
                                <AlertCircle size={12} /> GPU dringend empfohlen
                            </div>
                        )}
                    </div>
                ))}
            </div>


            {/* RAM Warning Note */}

            {/* RAM Warning Note */}
            <div className="mt-8 p-6 bg-warning/5 rounded-hero border border-warning/20 flex flex-col md:flex-row items-center gap-6 animate-fade-up">
                <div className="w-12 h-12 rounded-2xl bg-warning/20 text-warning flex items-center justify-center shrink-0">
                    <AlertCircle size={24} />
                </div>
                <div className="text-center md:text-left">
                    <h5 className="text-sm font-black text-foreground uppercase tracking-tight mb-2">Systemanforderung: Hardware-Ressourcen</h5>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed space-y-2">
                        <span className="block">
                            Für den performanten lokalen Betrieb von KI-Modellen sind zwei Faktoren entscheidend:
                        </span>
                        <span className="block">
                            <strong className="text-foreground">1. Arbeitsspeicher (RAM):</strong> Ein vollständiges Laden des Modells in den Speicher ist essenziell. Bei unzureichender Kapazität kommt es zu ineffizientem Disk-Swapping, was die Verarbeitungszeiten auf bis zu 29 Minuten pro Analyse ansteigen lässt. Wir setzen daher <strong className="text-foreground">mindestens 16 GB RAM</strong> voraus.
                        </span>
                        <span className="block">
                            <strong className="text-foreground">2. Rechenleistung (GPU):</strong> Für praxistaugliche Durchlaufzeiten im produktiven Einsatz ist eine <strong className="text-foreground">dedizierte Grafikkarte</strong> stark anzuraten. Zwar sind reine CPU-Berechnungen bei ausreichendem RAM technisch möglich, sie erfordern jedoch signifikant mehr Zeit pro Durchlauf.
                        </span>
                    </p>
                </div>
            </div>
        </section>
    );
};
