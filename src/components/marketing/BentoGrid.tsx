import React from 'react';
import Link from 'next/link';
import { Brain, Shield, Zap, Monitor, ArrowRight, Layers, FileSpreadsheet, Ghost } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface BentoItemProps {
    className?: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    badge?: string;
    accentColor?: string;
    visual?: React.ReactNode;
}

const BentoItem: React.FC<BentoItemProps> = ({ className, title, description, icon, href, badge, accentColor = 'bg-primary', visual }) => (
    <Link 
        href={href}
        className={`${className} group relative overflow-hidden rounded-hero border border-white bg-white/60 backdrop-blur-xl p-8 shadow-xl shadow-slate-900/5 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-100 flex flex-col justify-between`}
    >
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl ${accentColor} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    {icon}
                </div>
                {badge && (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200">
                        {badge}
                    </Badge>
                )}
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{title}</h3>
            <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-xs">{description}</p>
        </div>

        <div className="mt-8 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-primary group-hover:gap-2 transition-all">
                Deep Dive <ArrowRight size={14} />
            </div>
        </div>

        {/* Visual Snippet Background (Optional) */}
        {visual && (
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
                {visual}
            </div>
        )}

        <div className={`absolute top-0 right-0 w-32 h-32 ${accentColor} opacity-0 blur-[80px] group-hover:opacity-20 transition-opacity duration-700`} />
    </Link>
);

export const BentoGrid: React.FC = () => {
    return (
        <section className="py-12 px-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Intelligence */}
                <BentoItem 
                    title="KI-Intelligenz"
                    description="Pädagogisch wertvolle Analyse, die Inhalte semantisch versteht und begründbares Feedback generiert."
                    icon={<Brain size={24} />}
                    href="/features/intelligence"
                    badge="Logic Core"
                    accentColor="bg-indigo-600"
                />
 
                {/* 2. Workflow */}
                <BentoItem 
                    title="Moodle Test Import"
                    description="XLSX-Exporte aus Moodle Tests nativ einlesen. Antworten werden automatisch zugeordnet."
                    icon={<FileSpreadsheet size={24} />}
                    href="/features/workflow"
                    badge="Moodle Native"
                    accentColor="bg-blue-500"
                />
 
                {/* 3. Efficiency */}
                <BentoItem 
                    title="Effizienz & Stapel"
                    description="Automatisierte Verarbeitung ganzer Klassensätze. Von der Anonymisierung bis zum Multi-Export."
                    icon={<Layers size={24} />}
                    href="/features/efficiency"
                    badge="Hohe Zuverlässigkeit"
                    accentColor="bg-emerald-600"
                />
            </div>
        </section>
    );
};
