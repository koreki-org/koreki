import React, { useRef, useEffect, useState } from 'react';
import { X, Trash2, Check, RotateCcw, ChevronLeft, ChevronRight, PenTool, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { useRedactionEngine } from '../hooks/useRedactionEngine';

/**
 * Industrial Redaction Modal (Stage 8)
 * 🏮🛡️🖋️
 * Thin UI controller for document anonymization.
 * All heavy logic (PDF, Canvas, Math) is delegated to useRedactionEngine.
 */

interface RedactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (redactedDataUrls: string[], rects: Record<number, { x: number, y: number, w: number, h: number }[]>) => void;
    file: File | null;
    fileName: string;
    pageRange?: [number, number];
    initialRects?: Record<number, { x: number, y: number, w: number, h: number }[]>;
}

const RedactionModal: React.FC<RedactionModalProps> = ({ isOpen, onClose, onSave, file, fileName, pageRange, initialRects }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<'pen' | 'hand'>('pen');

    // --- STAGE 8: INDUSTRIAL REDACTION ENGINE ---
    const { state, handlers } = useRedactionEngine(isOpen, file, pageRange, initialRects);
    const { images, currentPage, setCurrentPage, allPageRects, loading, isDrawing, startPos, currentPos } = state;

    const activeImage = images[currentPage];
    const rects = allPageRects[currentPage] || [];

    // Set canvas dimensions only when image changes
    useEffect(() => {
        if (!canvasRef.current || !activeImage) return;
        const canvas = canvasRef.current;
        canvas.width = activeImage.naturalWidth || activeImage.width;
        canvas.height = activeImage.naturalHeight || activeImage.height;
    }, [activeImage]);

    // UI-Level Drawing Effect (keeps the canvas state reactive)
    useEffect(() => {
        if (!canvasRef.current || !activeImage) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and redraw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(activeImage, 0, 0, canvas.width, canvas.height);

        // Draw existing rects (Slate Black)
        ctx.fillStyle = '#0f172a';
        rects.forEach(r => {
            ctx.fillRect(r.x, r.y, r.w, r.h);
        });

        // Draw current drag rect
        if (isDrawing) {
            ctx.strokeStyle = 'var(--blue-600)';
            const displayWidth = canvas.clientWidth || 1;
            ctx.lineWidth = Math.max(2, (2 * canvas.width) / displayWidth);

            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const w = Math.abs(startPos.x - currentPos.x);
            const h = Math.abs(startPos.y - currentPos.y);

            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
            ctx.fillRect(x, y, w, h);
        }
    }, [activeImage, rects, isDrawing, startPos, currentPos]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center sm:p-4 bg-background/70 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative w-full max-w-[900px] h-full sm:h-auto sm:max-h-[90vh] flex flex-col bg-white sm:rounded-hero rounded-none p-4 sm:p-8 shadow-2xl border border-border animate-in zoom-in-95 duration-500 mb-0" onClick={e => e.stopPropagation()}>

                <div className="flex justify-between items-center mb-4 sm:mb-6 w-full">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center text-lg sm:text-xl shadow-inner">
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
                            onClick={() => handlers.processAndAnonymize(onSave)}
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
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-primary leading-relaxed font-medium">
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
                        onMouseUp={handlers.handleEnd}
                        onTouchStart={e => tool === 'pen' && handlers.handleStart(e, canvasRef.current, activeImage)}
                        onTouchMove={e => tool === 'pen' && handlers.handleMove(e, canvasRef.current, activeImage)}
                        onTouchEnd={handlers.handleEnd}
                        className={`${tool === 'pen' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'} shadow-md bg-white rounded-md mx-auto transition-all`}
                        style={{
                            maxWidth: '100%',
                            height: 'auto',
                            display: 'block',
                            touchAction: tool === 'pen' ? 'none' : 'auto'
                        }}
                    />
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-center mt-4 sm:mt-6 gap-3 sm:gap-4 border-t border-border pt-4 sm:pt-6">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={handlers.handleUndo} disabled={rects.length === 0} className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 gap-2 text-xs sm:text-sm">
                            <RotateCcw size={16} /> Undo
                        </Button>
                        <Button variant="outline" onClick={handlers.handleReset} disabled={rects.length === 0} className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 gap-2 text-xs sm:text-sm text-destructive hover:bg-destructive/10 border-destructive/20">
                            <Trash2 size={16} /> Reset
                        </Button>
                    </div>

                    {Object.keys(images).length > 1 && (
                        <div className="flex items-center justify-center gap-2 sm:gap-3 bg-muted/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-border shadow-sm order-first sm:order-none w-full sm:w-auto">
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
                        <Button onClick={() => handlers.processAndAnonymize(onSave)} disabled={loading || Object.keys(images).length === 0} className="h-10 px-6 font-bold flex-1 sm:flex-none shadow-lg shadow-primary/20 gap-2">
                            <Check size={18} /> Schwärzen anwenden
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RedactionModal;
