import React from 'react';
import { Loader2, PenLine, Brain, Download } from 'lucide-react';
import { CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
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
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                {/* OCR Strategy Toggle (Mistral -> Qwen Override for High Accuracy / Slower Correction) */}
                {settings?.provider === 'mistral' && setOcrStrategy && (
                    <div className={cn(
                        "flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl shadow-xs transition-all duration-300",
                        lockStrategy && "opacity-50 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-1.5">
                            <Brain size={14} className={cn(
                                "transition-colors duration-300",
                                ocrStrategy === 'handwriting' ? "text-primary animate-pulse" : "text-slate-400"
                            )} />
                            <span className="text-xs font-bold text-slate-600 select-none">Hohe Genauigkeit (langsamer)</span>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={ocrStrategy === 'handwriting'}
                            onClick={() => !lockStrategy && setOcrStrategy(ocrStrategy === 'standard' ? 'handwriting' : 'standard')}
                            disabled={lockStrategy}
                            className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                ocrStrategy === 'handwriting' ? "bg-primary" : "bg-slate-200"
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
                                        <p className="text-xs font-bold text-slate-900 mb-1">Normale Korrektur (Aus)</p>
                                        <p className="text-[0.7rem] text-slate-500 leading-relaxed">
                                            Nutzt standardmäßig Mistral für eine schnelle, ressourcenschonende Erkennung und Korrektur. Ideal für digitale Texte und saubere Dokumente.
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100">
                                        <p className="text-xs font-bold text-slate-900 mb-1">Hohe Genauigkeit (An)</p>
                                        <p className="text-[0.7rem] text-slate-500 leading-relaxed">
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
                )}

            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
                {activeBatchController ? (
                    <Button
                        variant="outline"
                        onClick={abortBatch}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all rounded-xl w-full sm:w-auto flex items-center justify-center gap-2 font-bold"
                    >
                        <Loader2 size={16} className="animate-spin text-red-600 mr-2" />
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
                        {onExportSL && !isReCorrectionMode && !hasPendingOcr && (
                            <Button
                                variant="outline"
                                className="border border-emerald-500/10 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all rounded-xl w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider h-10 sm:h-auto py-2 px-4"
                                onClick={onExportSL}
                                disabled={loading}
                                title="Schülerlösung als Zwischenstand exportieren (.koreki)"
                            >
                                <Download size={14} />
                                <span>Exportieren</span>
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
                    </>
                )}
            </div>
        </CardHeader>
    );
};
