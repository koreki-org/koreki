import React from 'react';
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
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-glass animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[600px] bg-white rounded-[28px] p-6 sm:p-10 shadow-glass border border-border animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute h-auto top-6 right-6 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <X size={20} />
                </Button>

                <div className="text-center mb-10">
                    <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-25" />
                        <FileText size={32} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">Musterlösung analysieren</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Wie liegt die Datei <strong className="text-foreground">{fileName}</strong> vor?
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Button
                        variant="ghost"
                        className="group flex h-auto flex-col items-center text-center p-6 sm:p-8 bg-white border-2 border-border rounded-3xl hover:border-primary hover:bg-primary/[0.02] transition-all duration-300"
                        onClick={() => onSelect('typed')}
                    >
                        <div className="w-16 h-16 bg-sky-50 text-sky-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <FileText size={24} />
                        </div>
                        <h3 className="font-bold text-lg text-foreground mb-2">Digitaler Text / PDF</h3>
                        <p className="text-sm text-muted-foreground mb-6 whitespace-normal">
                            Text-Dateien (.txt) oder einfache PDFs mit direkt kopierbarem Text.
                        </p>
                        {isPureMode ? (
                            <div className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                                Kostenlos (0 Credits)
                            </div>
                        ) : (
                            <div className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-full">
                                1 Credit / Seite
                            </div>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        className="group flex h-auto flex-col items-center text-center p-6 sm:p-8 bg-white border-2 border-border rounded-3xl hover:border-primary hover:bg-primary/[0.02] transition-all duration-300"
                        onClick={() => onSelect('scanned')}
                    >
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Camera size={24} />
                        </div>
                        <h3 className="font-bold text-lg text-foreground mb-2">Scan / Bilder / Handschrift</h3>
                        <p className="text-[11px] text-slate-500 font-medium italic mb-4">&quot;Überlegene Multimodalität &amp; höchste Intelligenz für anspruchsvolle Korrekturszenarien und Vision-Tasks.&quot;</p>
                        <p className="text-sm text-muted-foreground mb-6 whitespace-normal">
                            Komplexere PDFs, Bilder (.jpg, .png) oder handschriftliche Arbeiten.
                        </p>
                        {isPureMode ? (
                            <div className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                                Kostenlos (0 Credits)
                            </div>
                        ) : (
                            <div className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full">
                                2 Credits / Seite
                            </div>
                        )}
                    </Button>
                </div>

                {fileName.toLowerCase().endsWith('.txt') && (
                    <div className="mt-8 p-4 bg-sky-50 border border-sky-100 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                        <FileText size={20} className="text-sky-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-sky-800 leading-relaxed font-medium">
                            💡 <strong className="font-bold">Hinweis:</strong> Dies ist eine <strong className="font-bold">.txt-Datei</strong>. Sie liegt bereits als digitaler Text vor. Für das beste Ergebnis wählen Sie bitte <strong className="font-bold">&quot;Digital / Getippt&quot;</strong>.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelTypeModal;
