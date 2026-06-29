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
            icon: <PenTool size={32} className="text-accent-1 mb-4" />,
            title: "Digitalisierung",
            desc: "Präzise Handschrift-OCR und automatisches Splitting von Sammel-PDFs."
        },
        {
            icon: <Brain size={32} className="text-accent-2 mb-4" />,
            title: "Managed AI",
            desc: "Automatisierte Korrektur-Logik basierend auf Ihren Musterlösungen."
        },
        {
            icon: <Shield size={32} className="text-accent-2/30 mb-4" />,
            title: "Expert Mode",
            desc: "Eigene Prompt-Profile für maximale Kontrolle und Fach-Präzision.",
            highlight: true
        },
        {
            icon: <Layers size={32} className="text-accent-3 mb-4" />,
            title: "Effizienz",
            desc: "Batch-Verarbeitung ganzer Klassen und nahtloser Excel-Export."
        }
    ];

    return (
        <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline max-w-[1200px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {highlights.map((item, idx) => (
                    <div 
                        key={idx}
                        className={`${
                            item.highlight 
                            ? "bg-accent-2 text-accent-foreground text-white" 
                            : "bg-white text-foreground border-border"
                        } rounded-hero p-4 md:p-card-padding-sm border shadow-xl shadow-sm/40 hover:shadow-2xl transition-all group overflow-hidden relative`}
                    >
                        {item.icon}
                        <h3 className="text-lg font-black mb-2 tracking-tight">{item.title}</h3>
                        <p className={`text-xs font-medium leading-relaxed ${item.highlight ? "text-accent-2/20/70" : "text-muted-foreground"}`}>
                            {item.desc}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
};
