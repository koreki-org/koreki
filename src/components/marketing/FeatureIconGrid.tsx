import React from 'react';
import { Brain, Shield, PenTool, Layers } from 'lucide-react';

/**
 * FeatureIconGrid Component
 * 🗄️🏮
 * Grid of highlights featuring iconography and short descriptions.
 */
export const FeatureIconGrid: React.FC = () => {
    const highlights = [
        {
            icon: <PenTool size={32} className="text-blue-600 mb-4" />,
            title: "Digitalisierung",
            desc: "Präzise Handschrift-OCR und automatisches Splitting von Sammel-PDFs."
        },
        {
            icon: <Brain size={32} className="text-indigo-600 mb-4" />,
            title: "Managed AI",
            desc: "Automatisierte Korrektur-Logik basierend auf Ihren Musterlösungen."
        },
        {
            icon: <Shield size={32} className="text-indigo-100 mb-4" />,
            title: "Expert Mode",
            desc: "Eigene Prompt-Profile für maximale Kontrolle und Fach-Präzision.",
            highlight: true
        },
        {
            icon: <Layers size={32} className="text-emerald-600 mb-4" />,
            title: "Effizienz",
            desc: "Batch-Verarbeitung ganzer Klassen und nahtloser Excel-Export."
        }
    ];

    return (
        <section className="py-16 px-8 max-w-[1200px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {highlights.map((item, idx) => (
                    <div 
                        key={idx}
                        className={`${
                            item.highlight 
                            ? "bg-indigo-600 text-white" 
                            : "bg-white text-slate-900 border-slate-200"
                        } rounded-hero p-8 border shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all group overflow-hidden relative`}
                    >
                        {item.icon}
                        <h3 className="text-lg font-black mb-2 tracking-tight">{item.title}</h3>
                        <p className={`text-xs font-medium leading-relaxed ${item.highlight ? "text-indigo-50/70" : "text-slate-500"}`}>
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};
