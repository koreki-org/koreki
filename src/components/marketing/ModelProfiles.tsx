import React from 'react';
import { Zap, Cpu, Monitor, CheckCircle2 } from 'lucide-react';

export const ModelProfiles: React.FC = () => {
    return (
        <div className="w-full max-w-4xl pt-10 flex flex-col items-center mx-auto">
            <div className="text-center mb-8 animate-fade-up">
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Model Intelligence Profiles</h3>
                <p className="text-xs text-muted-foreground font-medium">Optimiert für Koreki V10 Dynamic Routing Architecture</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-stretch w-full mb-12 text-left animate-fade-up delay-100">
                {/* Recommended Profile: Qwen */}
                <div className="flex-1 bg-white p-6 rounded-2xl shadow-xl border border-accent-1/20 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-500">
                    <div className="absolute top-0 right-0 p-3">
                        <div className="bg-primary/10 text-primary text-xs font-black px-2 py-1 rounded-full uppercase tracking-widest border border-primary/20">
                            Recommended
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-1/10 text-accent-1 flex items-center justify-center shrink-0 border border-accent-1/20 group-hover:bg-primary group-hover:text-white transition-all">
                            <Zap size={20} />
                        </div>
                        <div className="pr-20">
                            <p className="text-xs text-accent-1 font-black uppercase tracking-wider">Qwen 3.6 (35B)</p>
                            <h5 className="font-black text-foreground text-sm leading-tight">Pro Correction Engine</h5>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium italic mb-4">&quot;Überlegene Multimodalität &amp; höchste Intelligenz für anspruchsvolle Korrekturszenarien und Vision-Tasks.&quot;</p>
                    <div className="mt-auto pt-4 border-t border-border flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-accent-3" />
                        <span className="text-xs font-black text-foreground uppercase">Bewährter Standard</span>
                    </div>
                </div>

                {/* Efficient Profile: Mistral */}
                <div className="flex-1 bg-accent-1/5 p-6 rounded-2xl shadow-lg border border-accent-1/10 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 ring-1 ring-accent-1/5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-2/10 text-accent-2 flex items-center justify-center shrink-0 border border-accent-2/20 group-hover:bg-accent-2 text-accent-foreground group-hover:text-white transition-all">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-accent-2 font-black uppercase tracking-wider">Mistral Small 3.2</p>
                            <h5 className="font-black text-foreground text-sm leading-tight">Efficient Engine</h5>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium italic mb-4">&quot;Optimierter Allrounder für getippte Texte (PDF) und schnelle Feedback-Zyklen. Beste Performance pro Watt.&quot;</p>
                    <div className="mt-auto pt-4 border-t border-accent-1/20/50 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-accent-2" />
                        <span className="text-xs font-black text-accent-2 uppercase">Performance Choice</span>
                    </div>
                </div>

                {/* Specialist Profile: Gemma */}
                <div className="flex-1 bg-muted/50 p-6 rounded-2xl shadow-md border border-border/60 flex flex-col group hover:-translate-y-1 transition-all duration-500 opacity-80 hover:opacity-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white text-muted-foreground flex items-center justify-center shrink-0 border border-border group-hover:border-border transition-all">
                            <Monitor size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">Gemma 4:31B</p>
                            <h5 className="font-black text-foreground text-sm leading-tight">Specialist Engine</h5>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium italic mb-4">&quot;Spezialist für Handschrifterkennung und komplexe mathematische Layouts bei höchster Verlässlichkeit.&quot;</p>
                    <div className="mt-auto pt-4 border-t border-border flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-muted-foreground" />
                        <span className="text-xs font-black text-muted-foreground uppercase">Deep Accuracy</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
