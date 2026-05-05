import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight } from 'lucide-react';

interface ImageLightboxProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

/**
 * ImageLightbox Component
 * 🏛️🏮✨
 * Industrial Grade Image Zoom Overlay.
 * Uses React Portal for top-level rendering and ambient glass design.
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt, onClose }) => {
    // Handle ESC key to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    // Render into Portal
    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300 cursor-zoom-out"
            onClick={onClose}
        >
            <div 
                className="relative max-w-7xl w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
            >
                <div className="relative group/image">
                    <img 
                        src={src} 
                        alt={alt || "Vergrößerte Ansicht"} 
                        className="max-w-full max-h-[90vh] object-contain rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/10 animate-in zoom-in-95 duration-500"
                    />
                    
                    {/* Industrial Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute -top-4 -right-4 md:-top-8 md:-right-8 bg-white text-slate-900 p-3 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-50 group/close"
                        aria-label="Schließen"
                    >
                        <X size={24} className="group-hover/close:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Info Tip */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 pointer-events-none">
                    <ArrowRight size={12} className="rotate-[-45deg]" />
                    Zum Schließen klicken oder ESC drücken
                </div>
            </div>
        </div>,
        document.body
    );
};
