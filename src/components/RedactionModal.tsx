import React, { useRef, useEffect, useState } from 'react';
import { zeichneSchwaerzungsVorschau } from '@/lib/redaction-preview';
import { X, Trash2, Check, RotateCcw, ChevronLeft, ChevronRight, PenTool, Loader2, Users, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { useRedactionEngine } from '../hooks/useRedactionEngine';
import { RedactionRectMap, RedactionScope, buildRedactionTemplate } from '../lib/privacy-utils';

/**
 * Industrial Redaction Modal (Stage 8)
 * 🏮🛡️🖋️
 * Thin UI controller for document anonymization.
 * All heavy logic (PDF, Canvas, Math) is delegated to useRedactionEngine.
 */

/**
 * Liest den Primärton aus den Design-Tokens, damit die Leinwand demselben
 * Farbsystem folgt wie das übrige UI (CSS-Variablen sind in Canvas nicht direkt
 * verwendbar).
 */
const readPrimaryColor = (): string => {
    if (typeof window === 'undefined') return 'hsl(239 84% 67%)';
    const token = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    return token ? `hsl(${token})` : 'hsl(239 84% 67%)';
};

interface RedactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        redactedDataUrls: string[],
        rects: RedactionRectMap,
        applyToAllScans: boolean
    ) => void;
    file: File | null;
    fileName: string;
    pageRange?: [number, number];
    initialRects?: RedactionRectMap;
    /** Anzahl weiterer Scans im Stapel, auf die übertragen werden kann. */
    otherScanCount?: number;
    /** Diese Arbeit ist bereits erkannt — neue Balken verwerfen den Text. */
    hasRecognizedText?: boolean;
    /** Weitere bereits erkannte Scans, die eine Sammel-Übertragung träfe. */
    otherRecognizedCount?: number;
}

const RedactionModal: React.FC<RedactionModalProps> = ({ isOpen, onClose, onSave, file, fileName, pageRange, initialRects, otherScanCount = 0, hasRecognizedText = false, otherRecognizedCount = 0 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<'pen' | 'hand'>('pen');
    const [applyToAllScans, setApplyToAllScans] = useState(false);

    // --- STAGE 8: INDUSTRIAL REDACTION ENGINE ---
    const { state, handlers } = useRedactionEngine(isOpen, file, pageRange, initialRects);
    const { images, currentPage, setCurrentPage, allPageRects, loading, isDrawing, startPos, currentPos } = state;

    const activeImage = images[currentPage];
    const rects = allPageRects[currentPage] || [];

    /**
     * 🏮 Die Absicht „auf alle Scans" wird aus den GESPEICHERTEN Balken abgeleitet,
     * nicht allein aus dem Haken-Zustand. Ein als `shared` markierter Balken ist
     * nur entstanden, wenn der Haken beim Ziehen gesetzt war — das ist die
     * verlässlichere Quelle, weil sie am übergebenen Argument hängt und nicht an
     * einem separat mitgeführten Schalter. Der Haken bleibt als zusätzlicher
     * Auslöser erhalten, damit er auch ohne neu gezogenen Balken wirkt.
     */
    /**
     * Anwenden — und einen Fehlschlag NICHT verschlucken. Die Knoepfe riefen
     * die Schwaerzung ohne `await` und ohne `catch`; seit sie abbricht, statt
     * eine Seite wegzulassen, braucht es beides (19.08.2026).
     */
    const anwenden = async () => {
        try {
            await handlers.processAndAnonymize(handleSave);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Die Schwärzung konnte nicht angewendet werden.');
        }
    };

    const handleSave = (redactedDataUrls: string[], savedRects: RedactionRectMap) => {
        const hasSharedRects = Object.values(savedRects)
            .some(pageRects => pageRects?.some(r => r.scope === 'shared'));

        onSave(redactedDataUrls, savedRects, applyToAllScans || hasSharedRects);
    };

    // Der Haken wirkt beim ZIEHEN, nicht erst beim Speichern: Nur was mit
    // gesetztem Haken gezogen wurde, gilt als gemeinsame Vorlage.
    const drawScope: RedactionScope = applyToAllScans ? 'shared' : 'local';

    // Was tatsächlich übertragen würde — vor dem Klick sichtbar, damit niemand
    // versehentlich eine individuelle Stelle auf den ganzen Stapel legt.
    const templateSize = buildRedactionTemplate(allPageRects).length;

    // 🏮 Nachträgliches Schwärzen entwertet eine bereits gelaufene Erkennung:
    // Der erkannte Text stammt vom ungeschwärzten Bild. Das kostet Credits und
    // manuelle Textkorrekturen — es gehört VOR den Klick, nicht danach.
    const betroffeneErkennungen = (hasRecognizedText ? 1 : 0)
        + (applyToAllScans ? otherRecognizedCount : 0);

    // Set canvas dimensions only when image changes
    useEffect(() => {
        if (!canvasRef.current || !activeImage) return;
        const canvas = canvasRef.current;
        canvas.width = activeImage.naturalWidth || activeImage.width;
        canvas.height = activeImage.naturalHeight || activeImage.height;
    }, [activeImage]);

    // UI-Level Drawing Effect (keeps the canvas state reactive)
    //
    // Das Zeichnen selbst steht in `lib/redaction-preview` — hier bleibt nur,
    // WANN gezeichnet wird.
    useEffect(() => {
        if (!canvasRef.current || !activeImage) return;
        zeichneSchwaerzungsVorschau(
            canvasRef.current,
            activeImage,
            rects,
            readPrimaryColor(),
            isDrawing ? { start: startPos, aktuell: currentPos } : undefined
        );
    }, [activeImage, rects, isDrawing, startPos, currentPos]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 bg-background/70 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative w-full max-w-[900px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col bg-white sm:rounded-hero rounded-none p-4 sm:p-8 shadow-2xl border border-border animate-in zoom-in-95 duration-500 mb-0" onClick={e => e.stopPropagation()}>

                <div className="flex justify-between items-center mb-4 sm:mb-6 w-full">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning/10 text-warning rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-inner">
                            🖋️
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-tight">Namen schwärzen</h2>
                            <div className="text-xs sm:text-sm font-medium text-muted-foreground truncate max-w-[150px] sm:max-w-none">{fileName}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* MOBILE QUICK SAVE */}
                        <Button 
                            variant="default" 
                            size="icon" 
                            className="sm:hidden h-10 w-10 rounded-xl transition-all shadow-sm"
                            onClick={() => void anwenden()}
                            disabled={loading || Object.keys(images).length === 0}
                            title="Schwärzung anwenden"
                        >
                            {loading ? <Loader2 size={22} className="animate-spin" /> : <Check size={22} />}
                        </Button>

                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors" onClick={onClose}>
                            <X size={24} />
                        </Button>
                    </div>
                </div>

                {/* Info & Tool Selection */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="min-w-0 text-sm text-primary leading-relaxed font-medium">
                            <p className="mb-1">Ziehe Rechtecke über die Stellen, die Du unkenntlich machen möchtest.</p>
                            <p className="text-xxs opacity-70 italic font-normal">Hinweis: Bilderkennung (OCR) ist für dieses Dokument anschließend erforderlich.</p>
                        </div>

                        <div className="flex bg-background p-1 rounded-xl border border-border shadow-sm shrink-0">
                            <Button
                                variant="ghost"
                                onClick={() => setTool('hand')}
                                className={`flex h-auto items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tool === 'hand' ? 'bg-primary text-white shadow-md hover:text-white hover:bg-primary' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                <RotateCcw size={14} className="rotate-45" /> Bewegen
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setTool('pen')}
                                className={`flex h-auto items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tool === 'pen' ? 'bg-primary text-white shadow-md hover:text-white hover:bg-primary' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                <PenTool size={14} /> Schwärzen
                            </Button>
                        </div>
                    </div>

                    {betroffeneErkennungen > 0 && (
                        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/5 p-3 text-warning">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <div className="min-w-0 text-xs font-medium leading-relaxed">
                                <span className="font-bold">Bereits erkannter Text geht verloren.</span>{' '}
                                {betroffeneErkennungen === 1
                                    ? 'Diese Arbeit ist bereits erkannt — neue Balken verwerfen den Text samt manueller Korrekturen.'
                                    : `${betroffeneErkennungen} Arbeiten sind bereits erkannt — neue Balken verwerfen deren Texte samt manueller Korrekturen.`}
                                {' '}Die Bilderkennung läuft danach erneut und kostet erneut Credits.
                            </div>
                        </div>
                    )}

                    {otherScanCount > 0 && (
                        <label className="mt-4 pt-4 border-t border-primary/10 flex items-start gap-3 cursor-pointer select-none group">
                            <Checkbox
                                checked={applyToAllScans}
                                onChange={(e) => setApplyToAllScans(e.target.checked)}
                                className="mt-0.5"
                            />
                            <div className="min-w-0 flex flex-col">
                                <span className="text-sm font-bold text-primary flex items-center gap-2">
                                    <Users size={14} className="shrink-0" />
                                    Auf alle {otherScanCount + 1} Scans übernehmen
                                </span>
                                <span className="text-xxs text-primary/70 font-medium leading-normal">
                                    {applyToAllScans
                                        ? 'Ab jetzt gezogene Balken gelten für alle Scans und werden farbig markiert. Vorher gezogene bleiben nur bei dieser Arbeit.'
                                        : 'Balken, die Du bei gesetztem Haken ziehst, landen auf jeder Seite aller Scans. Bereits einzeln geschwärzte Stellen bleiben erhalten.'}
                                </span>
                            </div>
                        </label>
                    )}
                </div>

                {/* Canvas Container */}
                <div className="relative flex-1 min-h-[250px] overflow-auto bg-muted/10 rounded-xl p-2 sm:p-6 border border-border flex flex-col items-center shadow-inner scrollbar-thin">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 rounded-xl">
                            <Loader2 size={40} className="text-primary animate-spin" />
                            <span className="font-semibold text-muted-foreground">Lade Dokument...</span>
                        </div>
                    )}
                    <canvas
                        ref={canvasRef}
                        onMouseDown={e => tool === 'pen' && handlers.handleStart(e, canvasRef.current, activeImage)}
                        onMouseMove={e => tool === 'pen' && handlers.handleMove(e, canvasRef.current, activeImage)}
                        onMouseUp={() => handlers.handleEnd(drawScope)}
                        onTouchStart={e => tool === 'pen' && handlers.handleStart(e, canvasRef.current, activeImage)}
                        onTouchMove={e => tool === 'pen' && handlers.handleMove(e, canvasRef.current, activeImage)}
                        onTouchEnd={() => handlers.handleEnd(drawScope)}
                        className={`${tool === 'pen' ? 'cursor-crosshair touch-none' : 'cursor-grab active:cursor-grabbing touch-auto'} block max-w-full h-auto shadow-md bg-white rounded-md mx-auto transition-all`}
                    />
                </div>

                {/* Legende — nur relevant, sobald es überhaupt zwei Herkünfte geben kann */}
                {otherScanCount > 0 && rects.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xxs font-bold text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-primary shrink-0" /> Alle Scans
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-foreground shrink-0" /> Nur diese Arbeit
                        </span>
                        <span className="italic font-medium opacity-70 hidden sm:inline">
                            Im gespeicherten Dokument sind alle Balken schwarz.
                        </span>
                    </div>
                )}

                {/* Footer Actions
                    🏮 Erst ab `lg` einreihig: Undo/Reset, Seitenwahl und die Aktionen sind
                    allesamt `flex-none` und können daher nicht unter ihre Inhaltsbreite
                    schrumpfen (zusammen ~675px). Der Modal-Innenraum misst aber nur
                    `min(vw-32, 900) - 64` — unter ~771px Viewport lief der rechte Block
                    deshalb aus dem Modal heraus und wurde abgeschnitten. */}
                <div className="flex flex-wrap lg:flex-nowrap justify-between items-center mt-4 sm:mt-6 gap-3 sm:gap-4 border-t border-border pt-4 sm:pt-6">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={handlers.handleUndo} disabled={rects.length === 0} className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 gap-2 text-xs sm:text-sm">
                            <RotateCcw size={16} /> Undo
                        </Button>
                        <Button variant="outline" onClick={handlers.handleReset} disabled={rects.length === 0} className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 gap-2 text-xs sm:text-sm text-destructive hover:bg-destructive/10 border-destructive/20">
                            <Trash2 size={16} /> Reset
                        </Button>
                    </div>

                    {Object.keys(images).length > 1 && (
                        <div className="flex items-center justify-center gap-2 sm:gap-3 bg-muted/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-border shadow-sm order-first lg:order-none w-full lg:w-auto">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-auto p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                            >
                                <ChevronLeft size={20} />
                            </Button>
                            <span className="text-sm font-semibold text-foreground min-w-[80px] text-center">
                                Seite {currentPage + 1} / {Object.keys(images).length}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-auto p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                onClick={() => setCurrentPage(p => Math.min(Object.keys(images).length - 1, p + 1))}
                                disabled={currentPage === Object.keys(images).length - 1}
                            >
                                <ChevronRight size={20} />
                            </Button>
                        </div>
                    )}

                    <div className="flex gap-3 w-full sm:w-auto justify-end">
                        <Button variant="outline" onClick={onClose} className="h-10 px-5 font-semibold hidden sm:flex">
                            Abbrechen
                        </Button>
                        <Button onClick={() => void anwenden()} disabled={loading || Object.keys(images).length === 0} className="h-10 px-6 font-bold flex-1 sm:flex-none shadow-lg shadow-primary/20 gap-2">
                            <Check size={18} />
                            {applyToAllScans
                                ? `${templateSize} Balken auf ${otherScanCount + 1} Scans`
                                : 'Schwärzen anwenden'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RedactionModal;
