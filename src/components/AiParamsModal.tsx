import React, { useState } from 'react';
import { X, SlidersHorizontal, Info, RotateCcw, Brain, Eye, Settings2 } from 'lucide-react';
import { Button } from './ui/Button';
import { AppSettings } from '../types';
import { cn } from '@/lib/utils';

interface AiParamsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (updatedSettings: AppSettings) => void;
}

export const AiParamsModal: React.FC<AiParamsModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSave,
}) => {
    const [activeTab, setActiveTab] = useState<'correction' | 'vision'>('correction');

    // --- State values for Correction Phase ---
    const [enableThinking, setEnableThinking] = useState(settings.enableThinking ?? false);
    const [temperature, setTemperature] = useState(settings.temperature ?? (settings.enableThinking ? 0.6 : 0.7));
    const [topP, setTopP] = useState(settings.topP ?? (settings.enableThinking ? 0.95 : 0.8));
    const [maxTokens, setMaxTokens] = useState(settings.maxTokens ?? 32768);
    const [presencePenalty, setPresencePenalty] = useState(settings.presencePenalty ?? 0.0);

    // --- State values for Vision (OCR) Phase ---
    const [visionTemperature, setVisionTemperature] = useState(settings.visionTemperature ?? 0.2);
    const [visionTopP, setVisionTopP] = useState(settings.visionTopP ?? 0.8);
    const [visionMaxTokens, setVisionMaxTokens] = useState(settings.visionMaxTokens ?? 4000);
    const [visionPresencePenalty, setVisionPresencePenalty] = useState(settings.visionPresencePenalty ?? 0.0);

    if (!isOpen) return null;

    // --- Restore Defaults ---
    const handleRestoreDefaults = () => {
        if (activeTab === 'correction') {
            setEnableThinking(false);
            setTemperature(0.7);
            setTopP(0.8);
            setMaxTokens(32768);
            setPresencePenalty(0.0);
        } else {
            setVisionTemperature(0.2);
            setVisionTopP(0.8);
            setVisionMaxTokens(4000);
            setVisionPresencePenalty(0.0);
        }
    };

    // --- Save and close ---
    const handleSave = () => {
        const updated: AppSettings = {
            ...settings,
            enableThinking,
            temperature,
            topP,
            maxTokens,
            presencePenalty,
            visionTemperature,
            visionTopP,
            visionMaxTokens,
            visionPresencePenalty,
        };
        onSave(updated);
        onClose();
    };

    // --- Helper for temperature description ---
    const getTempDescription = (val: number, tab: 'correction' | 'vision') => {
        if (tab === 'vision') {
            if (val === 0) return 'Präzises OCR (Empfohlen)';
            if (val <= 0.3) return 'Sehr deterministisch';
            if (val <= 0.7) return 'Standard Transkription';
            return 'Kreative Texterkennung (Vorsicht!)';
        } else {
            if (val === 0) return 'Strikte Konsistenz (Deterministisch)';
            if (val <= 0.6) return 'Empfohlen für Deep Reasoning (Präzise)';
            if (val <= 0.8) return 'Ausgewogene Notengebung (Standard)';
            if (val <= 1.2) return 'Abwechslungsreiches Feedback';
            return 'Hochgradig kreativ (Nicht für Noten empfohlen)';
        }
    };

    return (
        <div
            className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[620px] bg-white rounded-[24px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Block */}
                <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <SlidersHorizontal size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-tight">KI-Modell Feintuning</h2>
                            <p className="text-[11px] text-slate-500 font-medium">Modelliere das Antwortverhalten der KI im Detail</p>
                        </div>
                    </div>
                    
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </Button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex bg-slate-100 p-1 mx-6 mt-5 rounded-xl border border-slate-200/50">
                    <button
                        onClick={() => setActiveTab('correction')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                            activeTab === 'correction'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Brain size={14} className={activeTab === 'correction' ? "text-indigo-500" : "text-slate-400"} />
                        Korrektur & Analyse
                    </button>
                    <button
                        onClick={() => setActiveTab('vision')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all duration-200",
                            activeTab === 'vision'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Eye size={14} className={activeTab === 'vision' ? "text-emerald-500" : "text-slate-400"} />
                        Handschriften-OCR (Vision)
                    </button>
                </div>

                {/* Parameters Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[50vh]">
                    {activeTab === 'correction' ? (
                        <>
                            {/* Toggle for Deep Reasoning */}
                            <div className="p-4 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-lg transition-colors", enableThinking ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400")}>
                                            <Brain size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight text-slate-700">Deep Reasoning</p>
                                            <p className="text-[10px] text-slate-500 font-medium">Aktiviert tiefere Überlegungen vor Notenerteilung</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={enableThinking}
                                        onClick={() => {
                                            const nextVal = !enableThinking;
                                            setEnableThinking(nextVal);
                                            // Auto-tune temperature/topP to recommended values if enabling thinking
                                            if (nextVal) {
                                                setTemperature(0.6);
                                                setTopP(0.95);
                                            } else {
                                                setTemperature(0.7);
                                                setTopP(0.8);
                                            }
                                        }}
                                        className={cn(
                                            "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            enableThinking ? "bg-indigo-500" : "bg-slate-200"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out",
                                                enableThinking ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Slider: Temperature */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Temperatur (Kreativität)</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{temperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="2.0"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold leading-relaxed">
                                    <span>{getTempDescription(temperature, 'correction')}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: {enableThinking ? "0.6" : "0.7"}</span>
                                </div>
                            </div>

                            {/* Slider: Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top P (Nucleus Sampling)</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{topP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                    value={topP}
                                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Beschränkt den Token-Auswahlpool</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: {enableThinking ? "0.95" : "0.80"}</span>
                                </div>
                            </div>

                            {/* Slider: Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Tokens</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{maxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range"
                                    min="2000"
                                    max="32768"
                                    step="1000"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Maximale Länge des KI-Antworttexts</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 32.768</span>
                                </div>
                            </div>

                            {/* Slider: Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Presence Penalty</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{presencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-2.0"
                                    max="2.0"
                                    step="0.1"
                                    value={presencePenalty}
                                    onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Bestraft Wortwiederholungen im Fließtext</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Slider: Vision Temperature */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Temperatur</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionTemperature.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="2.0"
                                    step="0.1"
                                    value={visionTemperature}
                                    onChange={(e) => setVisionTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold leading-relaxed">
                                    <span>{getTempDescription(visionTemperature, 'vision')}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.2</span>
                                </div>
                            </div>

                            {/* Slider: Vision Top P */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Top P</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionTopP.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="1.0"
                                    step="0.05"
                                    value={visionTopP}
                                    onChange={(e) => setVisionTopP(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Vokabularbegrenzung bei der Texterkennung</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.80</span>
                                </div>
                            </div>

                            {/* Slider: Vision Max Tokens */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Max Tokens</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionMaxTokens.toLocaleString()}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1000"
                                    max="16384"
                                    step="500"
                                    value={visionMaxTokens}
                                    onChange={(e) => setVisionMaxTokens(parseInt(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Maximale Länge des extrahierten Texts</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 4.000</span>
                                </div>
                            </div>

                            {/* Slider: Vision Presence Penalty */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-baseline">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vision Presence Penalty</label>
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">{visionPresencePenalty.toFixed(1)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="-2.0"
                                    max="2.0"
                                    step="0.1"
                                    value={visionPresencePenalty}
                                    onChange={(e) => setVisionPresencePenalty(parseFloat(e.target.value))}
                                    className="w-full accent-primary bg-slate-100 h-1.5 rounded-lg cursor-pointer"
                                />
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold">
                                    <span>Steuert Wortwiederholungs-Bestrafung bei OCR</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Standard: 0.0</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Info Disclaimer Footer Banner */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2.5">
                    <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-500 font-medium leading-snug">
                        Diese feinkörnigen Einstellungen überschreiben die modellabhängigen Standardwerte der KI-Inferenz. Sie werden sicher lokal gespeichert und gelten für alle darauffolgenden Analysen in dieser Sitzung.
                    </p>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-slate-100 flex gap-3 items-center bg-slate-50/50">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRestoreDefaults}
                        className="h-9 gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold uppercase transition-all"
                    >
                        <RotateCcw size={12} />
                        Defaults laden
                    </Button>
                    <div className="flex-1" />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-9 px-4 rounded-xl text-xs font-bold"
                    >
                        Abbrechen
                    </Button>
                    <Button
                        type="button"
                        variant="default"
                        onClick={handleSave}
                        className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 border-none rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                        Parameter speichern
                    </Button>
                </div>
            </div>
        </div>
    );
};
