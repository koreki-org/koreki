import React from 'react';
import { FileSpreadsheet, ArrowRight, CheckCircle, Brain } from 'lucide-react';

export const WorkflowVisual: React.FC = () => {
    return (
        <div className="relative w-full max-w-[600px] aspect-video bg-white rounded-hero border border-slate-200 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent" />
            
            <div className="relative z-10 p-8 h-full flex flex-col justify-center">
                <div className="flex items-center gap-6 animate-in slide-in-from-left duration-1000">
                    {/* Stage 1: Moodle Row */}
                    <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transform group-hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <FileSpreadsheet size={18} />
                             </div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Moodle Quiz Export</span>
                        </div>
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-slate-50 rounded-full" />
                            <div className="h-2 w-4/5 bg-slate-50 rounded-full" />
                            <div className="h-2 w-5/6 bg-blue-100 rounded-full animate-pulse" />
                        </div>
                    </div>

                    <ArrowRight className="text-slate-300 animate-pulse" size={24} />

                    {/* Stage 2: Koreki Intelligent Analysis */}
                    <div className="flex-1 bg-slate-950 p-4 rounded-2xl shadow-xl transform translate-y-4 group-hover:translate-y-2 transition-transform duration-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-600 text-white rounded-lg">
                                <Brain size={18} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">AI Semantic Mapping</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle size={12} className="text-emerald-500" />
                                <div className="h-1.5 w-12 bg-white/20 rounded-full" />
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={12} className="text-emerald-500" />
                                <div className="h-1.5 w-16 bg-white/20 rounded-full" />
                            </div>
                            <div className="flex items-center gap-2 opacity-50">
                                <div className="w-3 h-3 rounded-full border border-white/20" />
                                <div className="h-1.5 w-10 bg-white/10 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="absolute bottom-8 right-8 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-200 animate-bounce">
                    100% Digital Import
                </div>
            </div>

            {/* Grid Decoration */}
            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>
    );
}
