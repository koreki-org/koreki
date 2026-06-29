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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-background rounded-hero shadow-glass border border-border max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 text-foreground">
                <Button 
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute right-6 top-6 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10 border-none shadow-none"
                >
                    <X size={20} />
                </Button>

                <div className="text-center space-y-3 mb-6 shrink-0 pt-8 px-8">
                    <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
                        <Sparkles size={28} />
                    </div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">KI-Setup</h2>
                    <p className="text-muted-foreground text-sm font-medium px-4">
                        Wähle deine bevorzugte Infrastruktur für die Analyse und Korrektur.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent custom-scrollbar">
                    <AiConfigurationContent 
                        initialSettings={initialSettings}
                        onSaveOllama={onSaveOllama}
                        onSaveMistral={onSaveMistral}
                        onSaveCustom={onSaveCustom}
                    />
                </div>

                <div className="mt-auto py-4 px-8 border-t border-border/50 flex items-center justify-center gap-2 text-muted-foreground shrink-0 bg-background">
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
