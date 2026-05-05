import React from 'react';
import { Loader2 } from 'lucide-react';
import { CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { KorekiTooltip } from '../ui/KorekiTooltip';
import { BatchHelpContent } from './BatchHelpContent';
import { AppSettings } from '../../types';

interface BatchHeaderProps {
    credits: number;
    ocrCreditsRequired: number;
    totalPendingCredits: number;
    pendingCount: number;
    loading: boolean;
    onShowConfirm: (type: 'ocr' | 'process' | 'reset') => void;
    avvAccepted: boolean;
    ocrStrategy?: 'standard' | 'handwriting';
    setOcrStrategy?: (val: 'standard' | 'handwriting') => void;
    settings?: AppSettings;
    isStrategyLocked?: boolean;
    hasScans?: boolean;
    hasFinishedFiles?: boolean;
    totalPossibleCredits?: number;
}

export const BatchHeader: React.FC<BatchHeaderProps> = ({
    credits,
    ocrCreditsRequired,
    totalPendingCredits,
    pendingCount,
    loading,
    onShowConfirm,
    avvAccepted,
    ocrStrategy = 'standard',
    setOcrStrategy,
    settings,
    isStrategyLocked,
    hasScans = true,
    hasFinishedFiles = false,
    totalPossibleCredits = 0
}) => {
    const lockStrategy = loading || isStrategyLocked;
    const isReCorrectionMode = pendingCount === 0 && hasFinishedFiles;

    return (
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
            <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    Stapelverarbeitung
                    <BatchHelpContent />
                </CardTitle>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                {/* OCR Strategy Toggle (Mistral-Only) */}
                {settings?.provider === 'mistral' && setOcrStrategy && hasScans && (
                    <div className="flex items-center gap-2 w-full md:w-auto relative">
                        <div className={cn(
                            "flex bg-slate-100/80 p-1 rounded-xl border border-slate-200 shadow-inner transition-opacity duration-300 w-full md:w-auto",
                            lockStrategy && "opacity-50 pointer-events-none"
                        )}>
                            <button
                                onClick={() => !lockStrategy && setOcrStrategy('standard')}
                                disabled={lockStrategy}
                                className={cn(
                                    "flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 whitespace-nowrap",
                                    ocrStrategy === 'standard' 
                                        ? "bg-white text-slate-900 shadow-sm" 
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Standard-Erkennung
                            </button>
                            <button
                                onClick={() => !lockStrategy && setOcrStrategy('handwriting')}
                                disabled={lockStrategy}
                                className={cn(
                                    "flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 whitespace-nowrap",
                                    ocrStrategy === 'handwriting' 
                                        ? "bg-white text-slate-900 shadow-sm" 
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Interpretation Handschrift
                            </button>
                        </div>
                        
                        <KorekiTooltip 
                            title="Erkennungs-Strategien"
                            content={(
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 mb-1">Standard-Erkennung</p>
                                        <p className="text-[0.7rem] text-slate-500 leading-relaxed">
                                            Fokussiert auf strukturelle Präzision. Ideal für digitale Dokumente, getippten Text und saubere Scans. Vermeidet Interpretationen.
                                        </p>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-900 mb-1">Interpretation Handschrift</p>
                                        <p className="text-[0.7rem] text-slate-500 leading-relaxed">
                                            Nutzt kognitive KI-Analyse für schwer lesbare Handschriften und Korrekturen.
                                        </p>
                                        <div className="mt-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                                            <p className="text-[0.65rem] text-amber-700 italic leading-snug">
                                                Achtung: Kann in seltenen Fällen semantische Deutungen vornehmen.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            position="bottom"
                            iconSize={16}
                            className="shrink-0"
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
                {ocrCreditsRequired > 0 && (
                    <Button
                        variant="secondary"
                        onClick={() => onShowConfirm('ocr')}
                        disabled={loading || credits < ocrCreditsRequired || !avvAccepted}
                        title={!avvAccepted ? "AVV-Zustimmung erforderlich" : ""}
                        className="bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 w-full sm:w-auto"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                        Bilderkennung ({ocrCreditsRequired} Credits)
                    </Button>
                )}
                <Button
                    onClick={() => isReCorrectionMode ? onShowConfirm('reset') : onShowConfirm('process')}
                    disabled={loading || (pendingCount === 0 && !hasFinishedFiles) || (pendingCount > 0 && credits < totalPendingCredits) || ocrCreditsRequired > 0 || !avvAccepted}
                    title={!avvAccepted ? "AVV-Zustimmung erforderlich" : ""}
                    className={cn(
                        "shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all rounded-xl w-full sm:w-auto",
                        pendingCount === 0 && !hasFinishedFiles ? "bg-emerald-500 hover:bg-emerald-600 border-none text-white" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0"
                    )}
                >
                    {loading && ocrCreditsRequired === 0 ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    {isReCorrectionMode 
                        ? `Erneut korrigieren (${totalPossibleCredits} Credits)` 
                        : (pendingCount === 0 ? "Alle korrigiert" : <span className="font-bold tracking-wide">Korrigieren ({totalPendingCredits} Credits)</span>)
                    }
                </Button>
            </div>
        </CardHeader>
    );
};
