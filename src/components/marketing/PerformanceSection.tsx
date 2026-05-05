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
        <section className="py-6 px-6 max-w-7xl mx-auto overflow-hidden">
            <div className="text-center mb-10 animate-fade-up">
                <h2 className="text-[3rem] md:text-[4rem] font-black text-slate-900 tracking-tighter leading-none mb-6">
                    Intelligenz trifft <br />
                    <span className="text-gradient">Effizienz.</span>
                </h2>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
                    Messbare Zeitersparnis für Ihren Schulalltag. Koreki liefert Ergebnisse in Sekunden, nicht in Stunden.
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6 bg-slate-50 inline-block px-4 py-2 rounded-full border border-slate-100">
                    * Basis: Kleine Klassenarbeit (5 Aufgaben) pro Schüler
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,rgba(var(--primary-rgb),0.03)_0%,transparent_70%)] pointer-events-none" />

                {scenarios.map((s, idx) => (
                    <div 
                        key={idx}
                        className={`group relative bg-white rounded-[32px] p-8 shadow-glass border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl animate-fade-up ${
                            s.warning ? 'border-slate-100 opacity-80' : 'border-slate-100 hover:border-primary/20'
                        }`}
                        style={{ animationDelay: `${idx * 150}ms` }}
                    >
                        <div className={`w-14 h-14 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                            <s.icon size={28} />
                        </div>

                        <div className="mb-8">
                            <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">{s.name}</h3>
                            <p className={`text-[10px] font-black text-${s.color}-600 uppercase tracking-widest`}>{s.fokus}</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ø Zeit / Korrektur</span>
                                <span className={`text-2xl font-black tracking-tighter ${s.warning ? 'text-slate-400' : 'text-slate-800'}`}>~{s.time}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold italic">
                                {s.details}
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl border transition-all duration-500 ${
                            s.warning ? 'bg-slate-50 border-slate-100' : 'bg-slate-50 border-slate-100 group-hover:bg-primary group-hover:text-white'
                        }`}>
                            <p className="text-[10px] font-black uppercase tracking-tight opacity-60 mb-1">Empfehlung</p>
                            <p className="text-xs font-bold leading-tight">{s.bestFor}</p>
                        </div>
                        
                        {s.warning && (
                            <div className="mt-4 flex items-center gap-2 text-amber-600 text-[9px] font-bold uppercase tracking-tight">
                                <AlertCircle size={12} /> GPU dringend empfohlen
                            </div>
                        )}
                    </div>
                ))}
            </div>


            {/* RAM Warning Note */}

            {/* RAM Warning Note */}
            <div className="mt-8 p-6 bg-rose-50/50 rounded-[32px] border border-rose-100 flex flex-col md:flex-row items-center gap-6 animate-fade-up">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={24} />
                </div>
                <div className="text-center md:text-left">
                    <h5 className="text-sm font-black text-rose-900 uppercase tracking-tight mb-1">Achtung: Die RAM-Falle</h5>
                    <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                        Wenn der verfügbare Arbeitsspeicher (RAM/VRAM) nicht ausreicht, um das KI-Modell vollständig zu laden, bricht die Performance massiv ein (Disk-Swapping). 
                        In unseren Tests stiegen die Antwortzeiten in diesem Fall auf über <span className="font-black">1737 Sekunden (~29 Minuten)</span> pro Korrektur an. 
                        Wir empfehlen mindestens 16GB RAM für den lokalen Betrieb.
                    </p>
                </div>
            </div>
        </section>
    );
};
