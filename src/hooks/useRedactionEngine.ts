import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';

// Configure worker to use local file
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Industrial Redaction Engine (Stage 8)
 * 🏮🛡️🖋️
 * Encapsulates PDF-to-Image conversion, coordinate mapping, 
 * and multi-page redaction stitching.
 */
export const useRedactionEngine = (
    isOpen: boolean,
    file: File | null,
    pageRange?: [number, number],
    initialRects?: Record<number, Rect[]>
) => {
    const [images, setImages] = useState<Record<number, HTMLImageElement>>({});
    const [currentPage, setCurrentPage] = useState(0);
    const [allPageRects, setAllPageRects] = useState<Record<number, Rect[]>>({});
    const [loading, setLoading] = useState(false);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

    const lastFileKey = useRef<string>("");

    // --- Document Loading Logic ---
    useEffect(() => {
        if (!isOpen || !file) return;

        // --- STAGE 8 STABILITY: Avoid redundant resets when drawing ---
        const currentKey = `${file.name}-${file.size}-${pageRange?.join(',')}`;
        if (lastFileKey.current === currentKey) return;
        
        lastFileKey.current = currentKey;
        setLoading(true);
        setAllPageRects(initialRects || {});
        setCurrentPage(0); // Only reset on fresh document load
        
        const loadFiles = async () => {
            try {
                const loadedImages: Record<number, HTMLImageElement> = {};
                if (file.type === 'application/pdf') {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjs.getDocument({ 
                        data: arrayBuffer,
                        verbosity: 0 // ERRORS ONLY
                    }).promise;

                    const start = pageRange ? pageRange[0] : 1;
                    const end = pageRange ? pageRange[1] : pdf.numPages;

                    for (let p = start; p <= end; p++) {
                        const page = await pdf.getPage(p);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = viewport.width;
                        tempCanvas.height = viewport.height;
                        const tempCtx = tempCanvas.getContext('2d');
                        
                        if (tempCtx) {
                            await page.render({ canvasContext: tempCtx, viewport }).promise;
                            const img = new Image();
                            await new Promise((resolve, reject) => {
                                img.onload = resolve;
                                img.onerror = (e) => {
                                    console.error("Failed to load PDF page image:", e);
                                    reject(e);
                                };
                                img.src = tempCanvas.toDataURL('image/jpeg', 0.9);
                            });
                            loadedImages[p - start] = img;
                        }
                    }
                } else {
                    // ... (rest of loading logic)
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>((resolve) => {
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(file);
                    });
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = (e) => {
                            console.error("Failed to load file image:", e);
                            reject(e);
                        };
                        img.src = dataUrl;
                    });
                    loadedImages[0] = img;
                }
                setImages(loadedImages);
                setLoading(false);
            } catch (err) {
                console.error("Error loading file for redaction:", err);
                setLoading(false);
            }
        };
        loadFiles();
    }, [isOpen, file, pageRange, initialRects]);

    // --- Coordinate Mapping Logic ---
    const getCanvasCoordinates = useCallback((e: any, canvas: HTMLCanvasElement | null, activeImage: HTMLImageElement | null) => {
        if (!canvas || !activeImage) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        let clientX = 0;
        let clientY = 0;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Map coordinates from rendered size to internal resolution
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        return { x, y };
    }, []);

    // --- Drawing Handlers ---
    const handleStart = (e: any, canvas: HTMLCanvasElement | null, activeImage: HTMLImageElement | null) => {
        const pos = getCanvasCoordinates(e, canvas, activeImage);
        setStartPos(pos);
        setCurrentPos(pos);
        setIsDrawing(true);
    };

    const handleMove = (e: any, canvas: HTMLCanvasElement | null, activeImage: HTMLImageElement | null) => {
        if (!isDrawing) return;
        const pos = getCanvasCoordinates(e, canvas, activeImage);
        setCurrentPos(pos);
    };

    const handleEnd = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(startPos.x - currentPos.x);
        const h = Math.abs(startPos.y - currentPos.y);

        if (w > 2 && h > 2) {
            setAllPageRects(prev => ({
                ...prev,
                [currentPage]: [...(prev[currentPage] || []), { x, y, w, h }]
            }));
        }
    };

    const handleUndo = () => {
        setAllPageRects(prev => {
            const pageRects = prev[currentPage] || [];
            return {
                ...prev,
                [currentPage]: pageRects.slice(0, -1)
            };
        });
    };

    const handleReset = () => {
        setAllPageRects(prev => ({
            ...prev,
            [currentPage]: []
        }));
    };

    // --- Final Anonymization Logic ---
    const processAndAnonymize = async (onSave: (dataUrls: string[], rects: Record<number, Rect[]>) => void) => {
        const pageIndices = Object.keys(images).map(Number).sort((a, b) => a - b);
        if (pageIndices.length === 0) return;

        const results: string[] = [];

        for (const i of pageIndices) {
            const img = images[i];
            const pRects = allPageRects[i] || [];

            const offCanvas = document.createElement('canvas');
            offCanvas.width = img.width;
            offCanvas.height = img.height;
            const offCtx = offCanvas.getContext('2d');
            if (!offCtx) continue;

            // Draw original page
            offCtx.drawImage(img, 0, 0);
            
            // Apply permanent black-out redactions
            offCtx.fillStyle = 'black';
            pRects.forEach(r => {
                offCtx.fillRect(r.x, r.y, r.w, r.h);
            });

            const dataUrl = offCanvas.toDataURL('image/jpeg', 0.9);
            results.push(dataUrl);
        }

        onSave(results, allPageRects);
    };

    return {
        state: { images, currentPage, setCurrentPage, allPageRects, loading, isDrawing, startPos, currentPos },
        handlers: { handleStart, handleMove, handleEnd, handleUndo, handleReset, processAndAnonymize }
    };
};
