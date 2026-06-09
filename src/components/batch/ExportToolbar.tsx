import React, { useState, useRef, useEffect } from 'react';
import { Download, Info, BarChart3, QrCode, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface ExportToolbarProps {
    onExportTeacher: () => void;
    onExportStudents: () => void;
    onExportIndividual: () => void;
    onExportPDFs: () => void;
    onExportKoreki: () => void;
    onExportDigitalSlips: () => void;
    onToggleAnalytics: () => void;
    isAnalyticsOpen?: boolean;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
    onExportTeacher,
    onExportStudents,
    onExportIndividual,
    onExportPDFs,
    onExportKoreki,
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
        <div className="flex gap-2 flex-wrap mb-6 pb-6 border-b border-slate-100 animate-in fade-in">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onExportTeacher} 
                className="h-9 gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-xl shadow-sm whitespace-nowrap"
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
                        "h-9 gap-2 text-xs font-bold text-slate-700 bg-white border transition-all rounded-xl shadow-sm whitespace-nowrap",
                        isFeedbackOpen 
                            ? "border-indigo-500 ring-2 ring-indigo-500/10" 
                            : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    )}
                >
                    <Download size={16} /> Einzel-Feedbacks 
                    <ChevronDown size={14} className={cn("transition-transform duration-200", isFeedbackOpen && "rotate-180")} />
                </Button>
                {isFeedbackOpen && (
                    <div className="absolute left-0 mt-1.5 w-56 rounded-xl border border-white/50 bg-white/95 p-1.5 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-200 origin-top">
                        <button
                            type="button"
                            onClick={() => {
                                onExportStudents();
                                setIsFeedbackOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left"
                        >
                            <Download size={14} /> Einzel-Feedback
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onExportIndividual();
                                setIsFeedbackOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left"
                        >
                            <Download size={14} /> Einzel-Excels (ZIP)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onExportPDFs();
                                setIsFeedbackOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left"
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
                className="h-9 gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-xl shadow-sm whitespace-nowrap"
            >
                <QrCode size={16} /> Digitale Slips
            </Button>

            <div className="flex items-center gap-3 w-full lg:w-auto mt-1 lg:mt-0 lg:ml-auto flex-wrap sm:flex-nowrap">
                {/* Korrektur exportieren with Tooltip */}
                <div className="relative group flex items-center">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onExportKoreki} 
                        className="h-9 gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all rounded-xl shadow-sm whitespace-nowrap shrink-0"
                    >
                        <Download size={16} /> Korrektur exportieren
                        <Info size={14} className="opacity-60 group-hover:text-indigo-200 transition-colors shrink-0" />
                    </Button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 hidden group-hover:flex flex-col items-center z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                        <div className="bg-white/95 backdrop-blur-md border border-indigo-200 px-3.5 py-2 rounded-2xl shadow-xl whitespace-nowrap text-xs font-bold text-indigo-600 font-outfit">
                            Ohne PDFs (beim Import nachladbar)
                        </div>
                        <div className="w-2.5 h-2.5 bg-white/95 border-r border-b border-indigo-200 rotate-45 -mt-1.5 z-40"></div>
                    </div>
                </div>

                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onToggleAnalytics} 
                    className={`h-9 gap-2 text-xs font-bold transition-all rounded-xl shadow-sm whitespace-nowrap shrink-0 ${
                        isAnalyticsOpen 
                            ? 'bg-primary text-white border-primary hover:bg-primary/90' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    <BarChart3 size={16} /> Detaillierte Analyse
                </Button>
            </div>
        </div>
    );
};
