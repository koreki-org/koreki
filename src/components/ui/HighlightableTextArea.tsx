import React, { useRef, useEffect } from 'react';
import { Textarea } from './Textarea';
import { cn } from '@/lib/utils';

interface HighlightableTextAreaProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
    placeholder?: string;
}

export const HighlightableTextArea: React.FC<HighlightableTextAreaProps> = ({ value, onChange, className, placeholder }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);

    // Bleibt, obwohl der Kasten jetzt mitwaechst und normalerweise nicht scrollt:
    // Wird er von aussen doch einmal in der Hoehe begrenzt, laufen Text und
    // Markierungen sonst auseinander.
    const handleScroll = () => {
        if (textareaRef.current && highlightRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    useEffect(() => {
        handleScroll();
    }, [value]);

    const renderHighlightedText = (text: string) => {
        if (!text) return text;
        const pattern = /(\S+\s*\(?\?\))/g;
        const parts = text.split(pattern);
        return parts.map((part, i) => {
            if (part.match(/\(\?\)/)) {
                return (
                    <span key={i} className="bg-warning/20 border-b border-warning/50 rounded-sm px-1 font-bold animate-pulse" style={{ color: 'transparent' }}>
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        /*
         * Der unsichtbare Zwilling liegt IM FLUSS und gibt die Hoehe vor, das
         * Eingabefeld legt sich darueber.
         *
         * Umgekehrt war es bis zum 08.09.2026: Der Zwilling lag absolut, also
         * bestimmte nichts die Hoehe, und der Kasten blieb auf seinem `min-h`
         * stehen. Gemessen sprang ein langer Text beim Klick auf den Stift von
         * 205px auf 142px zusammen und musste dann gescrollt werden.
         *
         * Das ist gefahrlos, weil beide per Konstruktion dieselben Schriftmasse
         * haben — genau dafuer gibt es den Zwilling. Wer hier etwas an Schrift,
         * Zeilenhoehe oder Innenabstand aendert, aendert es an BEIDEN.
         */
        <div className={cn("relative", className)}>
            <div
                ref={highlightRef}
                className="p-4 text-sm whitespace-pre-wrap break-words pointer-events-none text-transparent leading-relaxed border-0"
                style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.625',
                    letterSpacing: 'normal',
                    wordSpacing: 'normal',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased'
                }}
                aria-hidden="true"
            >
                {renderHighlightedText(value + " ")}
            </div>
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                placeholder={placeholder}
                spellCheck={false}
                style={{
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.625',
                    letterSpacing: 'normal',
                    wordSpacing: 'normal',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased'
                }}
                className="absolute inset-0 w-full h-full p-4 rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm focus:outline-none transition-all resize-none overflow-hidden leading-relaxed z-10"
            />
        </div>
    );
};
