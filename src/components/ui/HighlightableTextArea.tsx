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
                    <span key={i} className="bg-orange-100 border-b border-orange-300 rounded-sm px-1 font-bold animate-pulse" style={{ color: 'transparent' }}>
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <div
                ref={highlightRef}
                className="absolute inset-0 p-4 text-xs font-mono whitespace-pre-wrap break-words pointer-events-none text-transparent overflow-hidden leading-relaxed border border-transparent"
                style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
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
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    lineHeight: '1.625',
                    letterSpacing: 'normal',
                    wordSpacing: 'normal',
                    textRendering: 'optimizeLegibility',
                    WebkitFontSmoothing: 'antialiased'
                }}
                className="w-full h-full p-4 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs font-mono focus:outline-none transition-all resize-none shadow-inner leading-relaxed relative z-10"
            />
        </div>
    );
};
