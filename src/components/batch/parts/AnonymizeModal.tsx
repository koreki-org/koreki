import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X, Sparkles, Copy, Loader2, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AnonymizeModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalText: string;
    anonymizedText: string;
    setAnonymizedText: (text: string) => void;
    anonymizing: boolean;
    anonymizeError: string | null;
    isPending: boolean;
    points: number;
    maxPoints?: number;
    onRetryAnonymize: () => void;
    onConfirmSave: () => void;
    isSaaSService: boolean;
}

export const AnonymizeModal: React.FC<AnonymizeModalProps> = ({
    isOpen,
    onClose,
    originalText,
    anonymizedText,
    setAnonymizedText,
    anonymizing,
    anonymizeError,
    isPending,
    points,
    maxPoints,
    onRetryAnonymize,
    onConfirmSave,
    isSaaSService
}) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-in fade-in duration-300">
            <div className="bg-background border border-border shadow-glass rounded-2xl max-w-xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/20">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ShieldCheck size={18} className="text-primary" />
                            <h3 className="text-sm font-bold text-foreground font-outfit font-black">Anonymisierte Vorschau</h3>
                            <Badge variant="secondary" className="font-outfit font-bold tracking-tight">
                                {points} {maxPoints !== undefined ? `von ${maxPoints}` : ''} Punkte
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-none">Stilistische Anonymisierung zur Wahrung der Schüler-Privatsphäre</p>
                    </div>
                    <Button 
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg h-8 w-8"
                        disabled={isPending}
                    >
                        <X size={16} />
                    </Button>
                </div>

                {/* Content Panel (Single Column) */}
                <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider font-outfit flex items-center gap-1">
                            <Sparkles size={11} /> Anonymisierte Schülerantwort
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAnonymizedText(originalText)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all border border-border"
                            title="Kopiert die unveränderte Originalantwort in das Bearbeitungsfeld (hilfreich bei Code/IT-Befehlen)"
                            disabled={anonymizing}
                        >
                            <Copy size={10} /> Original übernehmen
                        </Button>
                    </div>

                    {anonymizing ? (
                        <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center border border-dashed border-primary/20 bg-primary/5 rounded-xl p-6 space-y-3">
                            <Loader2 className="animate-spin text-primary" size={24} />
                            <div className="text-center space-y-1">
                                <p className="text-xs font-bold text-primary">Anonymisiere Schülerantwort...</p>
                                <p className="text-xs text-muted-foreground max-w-[200px]">PII-Daten werden bereinigt und Schreibstil wird neutralisiert.</p>
                            </div>
                        </div>
                    ) : anonymizeError ? (
                        <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center border border-destructive/20 bg-destructive/5 rounded-xl p-6 space-y-3">
                            <AlertCircle className="text-destructive" size={24} />
                            <div className="text-center space-y-1">
                                <p className="text-xs font-bold text-destructive">Fehler aufgetreten</p>
                                <p className="text-xs text-muted-foreground max-w-[220px]">{anonymizeError}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRetryAnonymize}
                                className="h-7 text-xs border-destructive/20 text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-1"
                            >
                                <RefreshCw size={10} /> Erneut versuchen
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col gap-3 min-h-[180px]">
                            <textarea
                                value={anonymizedText}
                                onChange={(e) => setAnonymizedText(e.target.value)}
                                className="w-full h-32 p-4 rounded-xl border border-primary/20 bg-background text-xs text-foreground/90 font-inter leading-relaxed focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-hidden resize-none"
                                placeholder="Geringfügige Anpassungen vor dem Speichern..."
                            />
                            <div className="bg-muted/30 p-3 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed font-inter">
                                <div className="font-bold text-foreground mb-1">Originaltext:</div>
                                <div className="italic font-inter">"{originalText}"</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-5 py-4 bg-muted/20 flex items-center justify-between">
                    <div className="hidden sm:block">
                        {isSaaSService && (
                            <p className="text-xs text-muted-foreground font-inter">
                                * Wird bei erfolgreicher Generierung von deinem Guthaben abgezogen.
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 text-xs font-bold text-muted-foreground hover:bg-muted rounded-lg"
                            disabled={isPending}
                        >
                            Abbrechen
                        </Button>
                        <Button
                            size="sm"
                            onClick={onConfirmSave}
                            className="h-8 text-xs font-black bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg px-4 flex items-center gap-1.5 shadow-sm"
                            disabled={anonymizing || !!anonymizeError || !anonymizedText || isPending}
                        >
                            {isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <Check size={12} />
                            )}
                            Bestätigen & Anlernen
                        </Button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
