import React, { useState, useRef, useEffect } from 'react';
import { Download, Info, BarChart3, QrCode, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface ExportToolbarProps {
    onExportTeacher: () => void;
    onExportStudents: () => void;
    onExportIndividual: () => void;
    onExportPDFs: () => void;
    onExportDigitalSlips: () => void;
    onToggleAnalytics: () => void;
    isAnalyticsOpen?: boolean;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
    onExportTeacher,
    onExportStudents,
    onExportIndividual,
    onExportPDFs,
    onExportDigitalSlips,
    onToggleAnalytics,
    isAnalyticsOpen
}) => {
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const feedbackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (feedbackRef.current && !feedbackRef.current.contains(event.target as Node)) {
                setIsFeedbackOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex gap-2 flex-wrap mb-6 pb-6 border-b border-border/40 animate-in fade-in">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onExportTeacher} 
                className="h-9 gap-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-background border border-border hover:bg-muted/50 transition-all rounded-xl shadow-sm whitespace-nowrap"
            >
                <Download size={16} /> Einschätzungsliste
            </Button>

            {/* Grouped Feedbacks Dropdown */}
            <div ref={feedbackRef} className="relative">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsFeedbackOpen(!isFeedbackOpen)} 
                    className={cn(
                        "h-9 gap-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-background border transition-all rounded-xl shadow-sm whitespace-nowrap",
                        isFeedbackOpen 
                            ? "border-primary ring-2 ring-primary/10" 
                            : "border-border hover:bg-muted/50"
                    )}
                >
                    <Download size={16} /> Einzel-Feedbacks 
                    <ChevronDown size={14} className={cn("transition-transform duration-200", isFeedbackOpen && "rotate-180")} />
                </Button>
                {isFeedbackOpen && (
                    <div className="absolute left-0 mt-1.5 w-56 rounded-xl border border-border/50 bg-background/95 p-1.5 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
                        <button
                            type="button"
                            onClick={() => {
                                onExportStudents();
                                setIsFeedbackOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left"
                        >
                            <Download size={14} /> Einzel-Feedback
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onExportIndividual();
                                setIsFeedbackOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left"
                        >
                            <Download size={14} /> Einzel-Excels (ZIP)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onExportPDFs();
                                setIsFeedbackOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left"
                        >
                            <Download size={14} /> Einzel-PDFs
                        </button>
                    </div>
                )}
            </div>

            <Button 
                variant="outline" 
                size="sm" 
                onClick={onExportDigitalSlips} 
                className="h-9 gap-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-background border border-border hover:bg-muted/50 transition-all rounded-xl shadow-sm whitespace-nowrap"
            >
                <QrCode size={16} /> Digitale Slips
            </Button>

            <div className="flex items-center gap-3 w-full lg:w-auto mt-1 lg:mt-0 lg:ml-auto flex-wrap sm:flex-nowrap">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onToggleAnalytics} 
                    className={`h-9 gap-2 text-xs font-bold transition-all rounded-xl shadow-sm whitespace-nowrap shrink-0 ${
                        isAnalyticsOpen 
                            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                            : 'bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50'
                    }`}
                >
                    <BarChart3 size={16} /> Detaillierte Analyse
                </Button>
            </div>
        </div>
    );
};
