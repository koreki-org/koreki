import React from 'react';
import { Download, Info, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

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
    return (
        <div className="flex gap-2 flex-wrap mb-6 pb-6 border-b border-slate-100 animate-in fade-in">
            <Button variant="outline" size="sm" onClick={onExportTeacher} className="h-9 gap-2 text-xs font-bold text-slate-700 whitespace-nowrap">
                <Download size={16} /> Einschätzungsliste
            </Button>
            <Button variant="outline" size="sm" onClick={onExportStudents} className="h-9 gap-2 text-xs font-bold text-slate-700 whitespace-nowrap">
                <Download size={16} /> Einzel-Feedback
            </Button>
            <Button variant="outline" size="sm" onClick={onExportIndividual} className="h-9 gap-2 text-xs font-bold text-slate-700 whitespace-nowrap">
                <Download size={16} /> Einzel-Excels (ZIP)
            </Button>
            <Button variant="outline" size="sm" onClick={onExportPDFs} className="h-9 gap-2 text-xs font-bold text-slate-700 whitespace-nowrap">
                <Download size={16} /> Einzel-PDFs
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={onExportDigitalSlips} 
                className="h-9 gap-2 text-xs font-bold text-slate-700 whitespace-nowrap"
            >
                <Sparkles size={16} /> Digitale Slips
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto mt-1 lg:mt-0 lg:ml-auto flex-wrap sm:flex-nowrap">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onExportKoreki} 
                    className="h-9 gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all rounded-xl shadow-sm whitespace-nowrap shrink-0"
                >
                    <Download size={16} /> Korrektur exportieren
                </Button>
                <div className="flex items-center gap-2 text-indigo-600/70 bg-indigo-50/40 px-3 py-1.5 rounded-xl border border-indigo-100/50 whitespace-nowrap shrink-0">
                    <Info size={14} className="shrink-0" />
                    <span className="text-[10px] font-bold leading-tight uppercase tracking-tight">Ohne PDFs (beim Import nachladbar)</span>
                </div>

                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onToggleAnalytics} 
                    className={`h-9 gap-2 text-xs font-bold transition-all rounded-xl shadow-sm whitespace-nowrap shrink-0 ${
                        isAnalyticsOpen ? 'bg-primary text-white border-primary hover:bg-primary/90' : 'bg-white text-slate-700'
                    }`}
                >
                    <BarChart3 size={16} /> Detaillierte Analyse
                </Button>
            </div>
        </div>
    );
};
