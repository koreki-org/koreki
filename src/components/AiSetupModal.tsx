import React from 'react';
import { X, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import AiConfigurationContent from './AiConfigurationContent';
import { AppSettings } from '@/types';
import { isDesktopTarget } from '@/lib/env-context';

interface AiSetupModalProps {
    onSaveOllama: (url: string, model: string) => void;
    onSaveMistral: (key: string) => void;
    onSaveCustom: (url: string, key: string, model: string, thinking: boolean) => void;
    onClose: () => void;
    initialSettings?: AppSettings;
}

const AiSetupModal: React.FC<AiSetupModalProps> = ({ 
    onSaveOllama, 
    onSaveMistral, 
    onSaveCustom,
    onClose, 
    initialSettings = {} 
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
                <button 
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center space-y-3 mb-8">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                        <Sparkles size={28} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">KI-Setup</h2>
                    <p className="text-slate-500 text-sm font-medium px-4">
                        Wähle deine bevorzugte Infrastruktur für die Analyse und Korrektur.
                    </p>
                </div>

                <AiConfigurationContent 
                    initialSettings={initialSettings}
                    onSaveOllama={onSaveOllama}
                    onSaveMistral={onSaveMistral}
                    onSaveCustom={onSaveCustom}
                />

                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
                    <ShieldCheck size={14} />
                    <p className="text-xs font-bold italic">
                        {isDesktopTarget()
                            ? "Wird sicher und nativ in Ihrem Windows-Tresor gespeichert."
                            : "Wird nur lokal im RAM gehalten."}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AiSetupModal;
