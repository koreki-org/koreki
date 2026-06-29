import React from 'react';
import { Badge } from '../ui/Badge';

interface FeatureSpotlightProps {
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
    reverse?: boolean;
    badge?: string;
}

import { ImageLightbox } from './ImageLightbox';

export const FeatureSpotlight: React.FC<FeatureSpotlightProps> = ({
    title,
    description,
    imageSrc,
    imageAlt,
    reverse = false,
    badge
}) => {
    const [showLightbox, setShowLightbox] = React.useState(false);

    return (
        <>
            <div className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16 pb-12 md:pb-section-vertical px-6 md:px-page-inline`}>
                <div className="flex-1 space-y-6">
                    {badge && (
                        <Badge variant="light">
                            {badge}
                        </Badge>
                    )}
                    <h3 className="text-4xl font-black text-foreground tracking-tight leading-tight">
                        {title}
                    </h3>
                    <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                        {description}
                    </p>
                </div>
                <div className="flex-1 w-full">
                    <div 
                        className="relative group cursor-zoom-in"
                        onClick={() => setShowLightbox(true)}
                    >
                        {/* Decorative Background Blob */}
                        <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 to-transparent blur-2xl rounded-hero opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                        
                        {/* Image Container */}
                        <div className="relative rounded-hero overflow-hidden border border-white/60 shadow-glass backdrop-blur-3xl bg-white/20 p-2 lg:p-4 transition-all duration-700 group-hover:shadow-2xl group-hover:-translate-y-2">
                            <img 
                                src={imageSrc} 
                                alt={imageAlt}
                                className="w-full h-auto rounded-2xl shadow-inner border border-border"
                            />
                            
                            {/* Reflection Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {showLightbox && (
                <ImageLightbox 
                    src={imageSrc} 
                    alt={imageAlt} 
                    onClose={() => setShowLightbox(false)} 
                />
            )}
        </>
    );
};
