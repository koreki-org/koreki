import React from 'react';
import { Loader2, PenLine, Brain, Download, Info } from 'lucide-react';
import { CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { isLocalInstance } from '@/lib/env-context';
import { KorekiTooltip } from '../ui/KorekiTooltip';
import { BatchHelpContent } from './BatchHelpContent';
import { AppSettings } from '../../types';
import { useBatchStore } from '@/hooks/store/useBatchStore';

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
    onUpdateSettings?: (val: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
    isStrategyLocked?: boolean;
    hasScans?: boolean;
    hasFinishedFiles?: boolean;
    totalPossibleCredits?: number;
    isPureMode?: boolean;
    onExportSL?: () => void;
    onExportKoreki?: () => void;
    hasPendingOcr?: boolean;
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
    onUpdateSettings,
    isStrategyLocked,
    hasScans = true,
    hasFinishedFiles = false,
    totalPossibleCredits = 0,
    isPureMode = false,
    onExportSL,
    onExportKoreki,
    hasPendingOcr = false
}) => {
    const lockStrategy = loading || isStrategyLocked;
    const isReCorrectionMode = pendingCount === 0 && hasFinishedFiles;
    const activeBatchController = useBatchStore((state) => state.activeBatchController);
    const abortBatch = useBatchStore((state) => state.abortBatch);

    return (
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
            <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    Stapelverarbeitung
                    <BatchHelpContent />
                </CardTitle>
            </div>
            
            {/* OCR Strategy Toggle (Mistral -> Qwen Override for High Accuracy / Slower Correction) */}
            {!isLocalInstance() && settings?.provider === 'mistral' && setOcrStrategy && (
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    <div className={cn(
                        "flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 bg-muted/30 border border-border rounded-xl shadow-xs transition-all duration-300",
                        "w-full sm:w-auto",
                        lockStrategy && "opacity-50 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-none">
                            <Brain size={14} className={cn(
                                "shrink-0 transition-colors duration-300",
                                ocrStrategy === 'handwriting' ? "text-primary animate-pulse" : "text-muted-foreground"
                            )} />
                            <span className="text-xs font-bold text-muted-foreground select-none truncate">
                                <span className="hidden sm:inline">Hohe Genauigkeit (langsamer)</span>
                                <span className="sm:hidden">Hohe Genauigkeit</span>
                            </span>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={ocrStrategy === 'handwriting'}
                            onClick={() => !lockStrategy && setOcrStrategy(ocrStrategy === 'standard' ? 'handwriting' : 'standard')}
                            disabled={lockStrategy}
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                ocrStrategy === 'handwriting' ? "bg-primary" : "bg-muted"
                            )}
                        >
                            <span
                                className={cn(
                                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                                    ocrStrategy === 'handwriting' ? "translate-x-4" : "translate-x-0"
                                )}
                            />
                        </button>
                        
                        <KorekiTooltip 
                            title="Korrektur-Genauigkeit"
                            content={(
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-bold text-foreground mb-1">Normale Korrektur (Aus)</p>
                                        <p className="text-xxs text-muted-foreground leading-relaxed">
                                            Nutzt standardmäßig Mistral für eine schnelle, ressourcenschonende Erkennung und Korrektur. Ideal für digitale Texte und saubere Dokumente.
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-border">
                                        <p className="text-xs font-bold text-foreground mb-1">Hohe Genauigkeit (An)</p>
                                        <p className="text-xxs text-muted-foreground leading-relaxed">
                                            {isPureMode 
                                                ? 'Aktiviert eine tiefere Analyse und kognitive Vision-Erweiterung für komplexe Handschriften.' 
                                                : 'Nutzt das leistungsstärkere Modell Qwen3.6 für maximale logische Präzision bei der Korrektur. Die Ausführung dauert dafür etwas länger.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}
                            position="bottom"
                            iconSize={14}
                            className="shrink-0"
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end sm:items-center">
                {activeBatchController ? (
                    <Button
                        variant="outline"
                        onClick={abortBatch}
                        className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all rounded-xl w-full sm:w-auto flex items-center justify-center gap-2 font-bold"
                    >
                        <Loader2 size={16} className="animate-spin text-destructive mr-2" />
                        {ocrCreditsRequired > 0 ? "Erkennung abbrechen" : "Korrektur abbrechen"}
                    </Button>
                ) : (
                    <>
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
                        {onExportSL && !hasFinishedFiles && !hasPendingOcr && (
                            <div className="relative group flex items-center w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    className="border border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all rounded-xl w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider h-10 px-4"
                                    onClick={onExportSL}
                                    disabled={loading}
                                >
                                    <Download size={14} />
                                    <span>Exportieren</span>
                                </Button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 hidden group-hover:flex flex-col items-center z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                    <div className="w-2.5 h-2.5 bg-white/95 border-l border-t border-border rotate-45 -mb-1.5 z-40"></div>
                                    <div className="bg-white/95 backdrop-blur-md border border-border px-3.5 py-2 rounded-2xl shadow-xl whitespace-nowrap text-xs font-bold text-primary font-outfit">
                                        Schülerlösung als Zwischenstand exportieren (.koreki)
                                    </div>
                                </div>
                            </div>
                        )}
                        {onExportKoreki && hasFinishedFiles && (
                            <div className="relative group flex items-center w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={onExportKoreki}
                                    disabled={loading}
                                    className="h-10 px-4 gap-2 text-xs font-bold bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all rounded-xl shadow-sm whitespace-nowrap shrink-0 w-full sm:w-auto flex items-center justify-center"
                                >
                                    <Download size={14} />
                                    <span>Korrektur exportieren</span>
                                    <Info size={14} className="opacity-60 group-hover:text-primary-foreground/80 transition-colors shrink-0" />
                                </Button>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 hidden group-hover:flex flex-col items-center z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                                    <div className="w-2.5 h-2.5 bg-white/95 border-l border-t border-border rotate-45 -mb-1.5 z-40"></div>
                                    <div className="bg-white/95 backdrop-blur-md border border-border px-3.5 py-2 rounded-2xl shadow-xl whitespace-nowrap text-xs font-bold text-primary font-outfit">
                                        Ohne PDFs (beim Import nachladbar)
                                    </div>
                                </div>
                            </div>
                        )}
                        <Button
                            onClick={() => isReCorrectionMode ? onShowConfirm('reset') : onShowConfirm('process')}
                            disabled={loading || (pendingCount === 0 && !hasFinishedFiles) || (pendingCount > 0 && credits < totalPendingCredits) || ocrCreditsRequired > 0 || !avvAccepted}
                            title={!avvAccepted ? "AVV-Zustimmung erforderlich" : ""}
                            className={cn(
                                "shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all rounded-xl w-full sm:w-auto",
                                pendingCount === 0 && !hasFinishedFiles ? "bg-primary hover:bg-primary/90 border-none text-white animate-pulse" : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0"
                            )}
                        >
                            {loading && ocrCreditsRequired === 0 ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                            {isReCorrectionMode 
                                ? `Erneut korrigieren (${totalPossibleCredits} Credits)` 
                                : (pendingCount === 0 ? "Alle korrigiert" : <span className="font-bold tracking-wide">Korrigieren ({totalPendingCredits} Credits)</span>)
                            }
                        </Button>
                    </>
                )}
            </div>
        </CardHeader>
    );
};
