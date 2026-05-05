import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Camera, Check, X } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface PDFTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'scanned' | 'typed', applyToAll: boolean) => void;
    fileName: string;
    title?: string;
    isPureMode?: boolean;
}

const PDFTypeModal: React.FC<PDFTypeModalProps> = ({ isOpen, onClose, onSelect, fileName, title, isPureMode = false }) => {
    const [applyToAll, setApplyToAll] = useState(true);
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
                className="relative w-full max-w-[500px] bg-white rounded-[24px] p-6 sm:p-8 shadow-glass border border-border animate-in zoom-in-95 duration-200"
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

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title || "Dokumententyp wählen"}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Wie liegt die Datei <strong className="text-foreground">{fileName}</strong> vor?
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <Button
                        variant="ghost"
                        className="group flex h-auto flex-col items-center text-center p-5 sm:p-6 bg-white border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/[0.02] transition-all duration-200"
                        onClick={() => onSelect('typed', applyToAll)}
                    >
                        <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                        </div>
                        <span className="font-semibold text-foreground">Digitaler Text / PDF</span>
                        <span className="mt-1 text-[0.75rem] text-muted-foreground whitespace-normal">
                            Text-Dateien (.txt) oder einfache PDFs mit direkt kopierbarem Text.
                        </span>
                        {isPureMode ? (
                            <div className="mt-4 px-3 py-1 bg-secondary text-secondary-foreground text-[0.7rem] font-bold rounded-full">
                                Kostenlos (0 Credits)
                            </div>
                        ) : (
                            <div className="mt-4 px-3 py-1 bg-sky-50 text-sky-700 text-[0.7rem] font-bold rounded-full">
                                1 Credit / Seite
                            </div>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        className="group flex h-auto flex-col items-center text-center p-5 sm:p-6 bg-white border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/[0.02] transition-all duration-200"
                        onClick={() => onSelect('scanned', applyToAll)}
                    >
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Camera size={24} />
                        </div>
                        <span className="font-semibold text-foreground">Scan / Bilder / Handschrift</span>
                        <span className="mt-1 text-[0.75rem] text-muted-foreground whitespace-normal">
                            Komplexere PDFs, Bilder (.jpg, .png) oder handschriftliche Arbeiten.
                        </span>
                        {isPureMode ? (
                            <div className="mt-4 px-3 py-1 bg-secondary text-secondary-foreground text-[0.7rem] font-bold rounded-full">
                                Kostenlos (0 Credits)
                            </div>
                        ) : (
                            <div className="mt-4 px-3 py-1 bg-orange-50 text-orange-700 text-[0.7rem] font-bold rounded-full">
                                2 Credits / Seite
                            </div>
                        )}
                    </Button>
                </div>

                <div className="mb-8">
                    <label
                        className="flex items-center gap-3 cursor-pointer select-none group"
                        onClick={() => setApplyToAll(!applyToAll)}
                    >
                        <div className={cn(
                            "w-5 h-5 border-2 rounded flex items-center justify-center transition-all",
                            applyToAll ? "bg-primary border-primary" : "bg-white border-border group-hover:border-primary/50"
                        )}>
                            {applyToAll && <Check size={14} className="text-primary-foreground" />}
                        </div>
                        <span className="text-sm text-muted-foreground">Diese Wahl für alle Dokumente in diesem Upload anwenden</span>
                    </label>
                    {fileName.toLowerCase().endsWith('.txt') && (
                        <div className="mt-4 p-3 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                            <FileText size={16} className="text-sky-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-sky-800 leading-relaxed font-medium">
                                💡 <strong className="font-bold">Hinweis:</strong> Dies ist eine <strong className="font-bold">.txt-Datei</strong>. Sie liegt bereits als digitaler Text vor und benötigt keinen Scan-Pfad.
                            </p>
                        </div>
                    )}
                    <p className="mt-2 ml-8 text-[0.75rem] text-muted-foreground/70">
                        💡 Hinweis: Sie können den Typ später für jeden Schüler einzeln anpassen.
                    </p>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose}>
                        Abbrechen
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PDFTypeModal;
