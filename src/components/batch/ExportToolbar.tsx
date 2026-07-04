import React, { useState, useRef, useEffect } from 'react';
import { Download, Info, BarChart3, QrCode, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface ExportToolbarProps {
    onExportTeacher: () => void;
    onExportStudents: () => void;
    onExportIndividual: () => void;
    onExportPDFs: (mode: 'none' | 'total' | 'detailed') => void;
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
    const [pdfSettingsOpen, setPdfSettingsOpen] = useState(false);
    const [pointsMode, setPointsMode] = useState<'none' | 'total' | 'detailed'>('detailed');
    const feedbackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (feedbackRef.current && !feedbackRef.current.contains(event.target as Node)) {
                setIsFeedbackOpen(false);
                setPdfSettingsOpen(false);
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
                    <div className={cn(
                        "absolute left-0 mt-1.5 rounded-xl border border-border/50 bg-background/95 p-1.5 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-200 origin-top transition-all",
                        pdfSettingsOpen ? "w-64 p-3" : "w-56"
                    )}>
                        {pdfSettingsOpen ? (
                            <div className="flex flex-col gap-3">
                                {/* Header / Back Button */}
                                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                                    <button
                                        type="button"
                                        onClick={() => setPdfSettingsOpen(false)}
                                        className="text-muted-foreground hover:text-foreground transition-all p-0.5 rounded-lg hover:bg-muted"
                                    >
                                        <span className="text-xs font-bold font-mono">←</span>
                                    </button>
                                    <span className="text-xs font-extrabold text-foreground">PDF-Optionen</span>
                                </div>

                                {/* Options Selectors */}
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer rounded-lg hover:bg-muted/40 transition-all">
                                        <input
                                            type="radio"
                                            name="pointsMode"
                                            value="none"
                                            checked={pointsMode === 'none'}
                                            onChange={() => setPointsMode('none')}
                                            className="h-3.5 w-3.5 text-primary border-border focus:ring-primary focus:ring-offset-0 focus:ring-1"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground">Keine Punkte</span>
                                            <span className="text-xs text-muted-foreground">Nur Text-Feedback</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer rounded-lg hover:bg-muted/40 transition-all">
                                        <input
                                            type="radio"
                                            name="pointsMode"
                                            value="total"
                                            checked={pointsMode === 'total'}
                                            onChange={() => setPointsMode('total')}
                                            className="h-3.5 w-3.5 text-primary border-border focus:ring-primary focus:ring-offset-0 focus:ring-1"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground">Gesamtaufgabe</span>
                                            <span className="text-xs text-muted-foreground">Punkte nur pro Hauptaufgabe</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer rounded-lg hover:bg-muted/40 transition-all">
                                        <input
                                            type="radio"
                                            name="pointsMode"
                                            value="detailed"
                                            checked={pointsMode === 'detailed'}
                                            onChange={() => setPointsMode('detailed')}
                                            className="h-3.5 w-3.5 text-primary border-border focus:ring-primary focus:ring-offset-0 focus:ring-1"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-foreground">Detailliert</span>
                                            <span className="text-xs text-muted-foreground">Teilaufgaben & Summenzeile</span>
                                        </div>
                                    </label>
                                </div>

                                {/* Export Button */}
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        onExportPDFs(pointsMode);
                                        setIsFeedbackOpen(false);
                                        setPdfSettingsOpen(false);
                                    }}
                                    className="h-8 text-xxs font-extrabold w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/10 transition-all"
                                >
                                    PDF-Export starten
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onExportStudents();
                                        setIsFeedbackOpen(false);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left"
                                >
                                    <Download size={14} /> Einzel-Feedback (Excel)
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
                                        setPdfSettingsOpen(true);
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-all text-left"
                                >
                                    <span className="flex items-center gap-2">
                                        <Download size={14} /> Einzel-PDFs (ZIP)
                                    </span>
                                    <span className="text-xs font-mono text-muted-foreground/60 font-bold">➔</span>
                                </button>
                            </div>
                        )}
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
