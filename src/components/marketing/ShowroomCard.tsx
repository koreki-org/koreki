import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';
import { Badge } from '../ui/Badge';

interface ShowroomCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    visual: React.ReactNode;
    visualSrc?: string; // Add this to know which image to zoom
    accentColor?: string;
    badge?: string;
    className?: string;
}

export const ShowroomCard: React.FC<ShowroomCardProps> = ({
    title,
    description,
    icon,
    href,
    visual,
    visualSrc,
    accentColor = "bg-primary",
    badge,
    className = ""
}) => {
    const [showLightbox, setShowLightbox] = React.useState(false);

    return (
        <>
            <Link 
                href={href}
                className={`group relative flex flex-col md:flex-row items-center gap-12 p-8 md:p-12 rounded-hero bg-white/40 border border-white/40 backdrop-blur-2xl shadow-glass transition-all duration-700 hover:shadow-2xl hover:bg-white/60 hover:-translate-y-1 overflow-hidden ${className}`}
            >
                {/* Ambient Background Glow */}
                <div className={`absolute top-0 right-0 w-[400px] h-[400px] ${accentColor} opacity-0 blur-[120px] group-hover:opacity-10 transition-opacity duration-1000 -mr-40 -mt-40 pointer-events-none`} />
                
                <div className="flex-[0.8] relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`w-14 h-14 rounded-2xl ${accentColor} text-white flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                            {icon}
                        </div>
                        {badge && (
                            <Badge variant="glass" className="text-slate-500 bg-white/40">
                                {badge}
                            </Badge>
                        )}
                    </div>

                    <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                        {title}
                    </h3>
                    
                    <p className="text-lg text-slate-500 font-medium leading-relaxed mb-10 max-w-lg">
                        {description}
                    </p>

                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary group-hover:gap-4 transition-all duration-500">
                        Säule entdecken <ArrowRight size={18} />
                    </div>
                </div>

                <div className="flex-[1.2] relative z-10 w-full flex justify-center lg:justify-end">
                    <div 
                        className="relative transform group-hover:scale-105 transition-transform duration-700 cursor-zoom-in"
                        onClick={(e) => {
                            if (visualSrc) {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowLightbox(true);
                            }
                        }}
                    >
                        {/* Shadow Blob for the Visual */}
                        <div className="absolute inset-0 bg-slate-900/5 blur-[60px] rounded-full scale-75 -translate-y-4" />
                        <div className="relative">
                            {visual}
                        </div>
                    </div>
                </div>
            </Link>

            {showLightbox && visualSrc && (
                <ImageLightbox 
                    src={visualSrc} 
                    alt={title} 
                    onClose={() => setShowLightbox(false)} 
                />
            )}
        </>
    );
};
