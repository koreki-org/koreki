import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart3, FileDown, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { CorrectionAnalytics } from './CorrectionAnalytics';
import { BatchFile, AppSettings } from '../../types';
import { useCorrectionStatistics } from '../../hooks/useCorrectionStatistics';
import { exportAnalyticsPDF } from '../../lib/pdf';
import { exportPerformanceExcel } from '../../lib/excel';
import { getKorekiMode, isLocalInstance } from '../../lib/env-context';
import { useBatchStore } from '../../hooks/store/useBatchStore';

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchFiles: BatchFile[];
    settings?: AppSettings;
    isPureMode?: boolean;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
    isOpen,
    onClose,
    batchFiles,
    settings,
    isPureMode = false
}) => {
    const [mounted, setMounted] = useState(false);
    const stats = useCorrectionStatistics(batchFiles);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleExportPDF = async () => {
        if (!stats) return;
        setIsExporting(true);
        try {
            await exportAnalyticsPDF(stats);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPerformance = async () => {
        const mode = getKorekiMode();
        const ocrStrategy = useBatchStore.getState().ocrStrategy;
        const isHandwritingOverride = !isLocalInstance() && settings?.provider === 'mistral' && ocrStrategy === 'handwriting';
        const effectiveProvider = isHandwritingOverride ? 'openai-compatible' : (settings?.provider || 'unknown');
        
        const model = effectiveProvider === 'ollama' ? 
            (settings?.customOllamaModel || settings?.ollamaModel || 'Local Model') : 
            (effectiveProvider === 'openai-compatible' ? 
                (settings?.openaiModel || 'Qwen 3.6 (Pro)') : 
                ((settings?.enableThinking && effectiveProvider === 'mistral') ? 'Mistral Medium 3.5 (Reasoning)' : (settings?.model || 'Mistral Standard')));

        await exportPerformanceExcel(batchFiles, {
            mode,
            provider: effectiveProvider,
            model,
            isPure: isPureMode,
            temperature: settings?.temperature,
            topP: settings?.topP,
            maxTokens: settings?.maxTokens,
            presencePenalty: settings?.presencePenalty,
            enableThinking: settings?.enableThinking
        });
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-in fade-in duration-300" onClick={onClose}>
            <div 
                className="relative w-full max-w-[1000px] max-h-[90vh] bg-white rounded-2xl p-6 md:p-10 shadow-glass border border-border animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center rotate-3 shadow-sm">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground font-outfit">Detaillierte Analyse</h2>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Statistische Auswertung der Korrektur</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {stats && (
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border rounded-xl text-muted-foreground animate-in fade-in slide-in-from-right-4 duration-700">
                                <span className="text-xxs font-bold uppercase tracking-tight opacity-70">Gesamt-Inferenz:</span>
                                <span className="text-xs font-black text-foreground/80">{(stats as any).totalInferenceDuration > 0 ? `${((stats as any).totalInferenceDuration / 1000).toFixed(1)}s` : '...'}</span>
                            </div>
                        )}

                        {stats && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportPerformance}
                                className="hidden sm:flex h-10 gap-2 px-3 bg-success/10 border-success/20 text-success hover:bg-success hover:text-white transition-all rounded-xl shadow-sm animate-in fade-in slide-in-from-right-4 duration-500"
                            >
                                <Clock size={14} className="shrink-0" />
                                <div className="flex flex-col items-start -space-y-0.5">
                                    <span className="text-xxs font-black uppercase tracking-tight leading-none text-left">Inferenz-Analyse</span>
                                    <span className="text-xxs font-bold opacity-80">Excel Download</span>
                                </div>
                            </Button>
                        )}

                        <Button 
                            variant="outline" 
                            onClick={handleExportPDF} 
                            disabled={isExporting || !stats}
                            className="h-10 gap-2 rounded-xl border-border font-bold text-xs"
                        >
                            {isExporting ? (
                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary border-t-transparent" />
                            ) : (
                                <FileDown size={16} />
                            )}
                            PDF Export
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                        >
                            <X size={20} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <CorrectionAnalytics batchFiles={batchFiles} />
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-border text-center shrink-0">
                    <p className="text-xxs text-muted-foreground font-bold uppercase tracking-[0.2em]">
                        Koreki Analytics Engine | Enterprise Grade
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};
