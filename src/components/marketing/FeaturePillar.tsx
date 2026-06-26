import React from 'react';

export interface PillarFeature {
    icon: React.ReactNode;
    title: string;
    desc: string;
    iconBg?: string;
    iconColor?: string;
}

interface FeaturePillarProps {
    badge: string;
    pillarName: string;
    title: string;
    desc: string;
    features: PillarFeature[];
    visual: React.ReactNode;
    reversed?: boolean;
    bgColor?: string;
    accentColor?: string;
}

/**
 * FeaturePillar Component
 * 🏛️🏮
 * Unified component for the four main feature pillars of Koreki.
 */
export const FeaturePillar: React.FC<FeaturePillarProps> = ({
    badge,
    pillarName,
    title,
    desc,
    features,
    visual,
    reversed = false,
    bgColor = "bg-white",
    accentColor = "text-blue-600"
}) => {
    return (
        <section className={`pb-12 md:pb-section-vertical px-6 md:px-page-inline ${bgColor} overflow-hidden`}>
            <div className={`max-w-[1200px] mx-auto flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16`}>
                <div className="flex-1">
                    <div className={`flex items-center gap-4 ${accentColor} font-black uppercase tracking-widest text-xs mb-4`}>
                        <span>{badge}</span>
                        <div className={`h-[2px] w-8 ${reversed ? 'bg-indigo-100' : 'bg-blue-100'}`} />
                        <span>{pillarName}</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                        {title}
                    </h2>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10">
                        {desc}
                    </p>
                    <ul className="space-y-8">
                        {features.map((f, i) => (
                            <li key={i} className="flex gap-5">
                                <div className={`${f.iconBg || 'bg-blue-50'} ${f.iconColor || 'text-blue-600'} p-3 rounded-2xl h-fit shadow-sm border border-current/10`}>
                                    {f.icon}
                                </div>
                                <div>
                                    <strong className="block text-lg font-black text-slate-900 mb-1">{f.title}</strong>
                                    <span className="text-slate-500 font-medium leading-relaxed">{f.desc}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex-1 relative">
                    {visual}
                </div>
            </div>
        </section>
    );
};
