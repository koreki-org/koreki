import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Camera, X } from 'lucide-react';
import { Button } from './ui/Button';

interface ModelTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'typed' | 'scanned') => void;
    fileName: string;
    isPureMode?: boolean;
}

const ModelTypeModal: React.FC<ModelTypeModalProps> = ({ isOpen, onClose, onSelect, fileName, isPureMode = false }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
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
        <div
            className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-glass animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[600px] max-h-[90dvh] overflow-y-auto bg-white rounded-2xl p-5 sm:p-8 shadow-glass border border-border animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute h-auto top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <X size={20} />
                </Button>

                <div className="text-center mb-6 sm:mb-8">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-25" />
                        <FileText size={28} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mb-2">Musterlösung analysieren</h2>
                    <p className="text-sm text-muted-foreground">
                        Wie liegt die Datei <strong className="text-foreground">{fileName}</strong> vor?
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <Button
                        variant="ghost"
                        className="group flex h-auto flex-col items-center text-center p-5 sm:p-6 bg-white border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/[0.02] transition-all duration-300"
                        data-testid="modelltyp-digital"
                        onClick={() => onSelect('typed')}
                    >
                        <div className="w-14 h-14 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <FileText size={24} />
                        </div>
                        <h3 className="font-bold text-base text-foreground mb-2">Digitaler Text / PDF</h3>
                        <p className="text-sm text-muted-foreground mb-4 whitespace-normal">
                            Text-Dateien (.txt) oder einfache PDFs mit direkt kopierbarem Text.
                        </p>
                        {isPureMode ? (
                            <div className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                                Kostenlos (0 Credits)
                            </div>
                        ) : (
                            <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                1 Credit / Seite
                            </div>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        className="group flex h-auto flex-col items-center text-center p-5 sm:p-6 bg-white border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/[0.02] transition-all duration-300"
                        onClick={() => onSelect('scanned')}
                    >
                        <div className="w-14 h-14 bg-warning/10 text-warning rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Camera size={24} />
                        </div>
                        <h3 className="font-bold text-base text-foreground mb-2">Scan / Bilder / Handschrift</h3>
                        <p className="text-xs text-muted-foreground font-medium italic mb-3 whitespace-normal">
                            &quot;Überlegene Multimodalität &amp; höchste Intelligenz für anspruchsvolle Korrekturszenarien und Vision-Tasks.&quot;
                        </p>
                        <p className="text-sm text-muted-foreground mb-4 whitespace-normal">
                            Komplexere PDFs, Bilder (.jpg, .png) oder handschriftliche Arbeiten.
                        </p>
                        {isPureMode ? (
                            <div className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                                Kostenlos (0 Credits)
                            </div>
                        ) : (
                            <div className="px-3 py-1 bg-warning/10 text-warning text-xs font-bold rounded-full">
                                2 Credits / Seite
                            </div>
                        )}
                    </Button>
                </div>

                {fileName.toLowerCase().endsWith('.txt') && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <FileText size={18} className="text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-primary leading-relaxed font-medium">
                            💡 <strong className="font-bold">Hinweis:</strong> Dies ist eine <strong className="font-bold">.txt-Datei</strong>. Sie liegt bereits als digitaler Text vor. Für das beste Ergebnis wählen Sie bitte <strong className="font-bold">&quot;Digital / Getippt&quot;</strong>.
                        </p>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ModelTypeModal;
