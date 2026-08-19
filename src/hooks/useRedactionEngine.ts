import { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { toPixelRects, toRelativeRects, RedactionRect as Rect, RedactionScope } from '../lib/privacy-utils';

// Configure worker to use local file
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Rechnet eine Rechteck-Sammlung seitenweise um — jede Seite gegen die Maße
 * IHRES eigenen Bildes, da Seiten innerhalb eines Dokuments unterschiedlich
 * groß sein können (z.B. eingescannte Beiblätter im Querformat).
 */
const mapRects = (
    rects: Record<number, Rect[]> | undefined,
    images: Record<number, HTMLImageElement>,
    convert: (rects: Rect[], width: number, height: number) => Rect[]
): Record<number, Rect[]> => {
    if (!rects) return {};
    const result: Record<number, Rect[]> = {};
    Object.keys(rects).map(Number).forEach(page => {
        const img = images[page];
        // Ohne geladenes Bild fehlen die Bezugsmaße. Die Rechtecke werden dann
        // unverändert durchgereicht statt verworfen — sonst verlöre ein Speichern
        // stillschweigend eine bestehende Schwärzung.
        result[page] = img ? convert(rects[page] || [], img.width, img.height) : (rects[page] || []);
    });
    return result;
};

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

    // Das Laden unten ist asynchron und kann die Komponente überleben: DashboardModals
    // rendert das RedactionModal bedingt, Schließen hängt es also aus — auch mitten im
    // Ladevorgang. Ohne diese Markierung schreibt der Vorgang danach noch State und
    // protokolliert Fehler für ein Dokument, das niemand mehr sieht.
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // --- Document Loading Logic ---
    useEffect(() => {
        if (!isOpen || !file) return;

        // --- STAGE 8 STABILITY: Avoid redundant resets when drawing ---
        const currentKey = `${file.name}-${file.size}-${pageRange?.join(',')}`;
        if (lastFileKey.current === currentKey) return;
        
        lastFileKey.current = currentKey;
        setLoading(true);
        // Die gespeicherten Rechtecke sind relativ zur Seitengröße. Sie lassen
        // sich erst in Leinwand-Koordinaten umrechnen, wenn die Seitenbilder
        // geladen sind — deshalb hier leeren und unten nachziehen.
        setAllPageRects({});
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
                                    if (isMountedRef.current) console.error("Failed to load PDF page image:", e);
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
                            if (isMountedRef.current) console.error("Failed to load file image:", e);
                            reject(e);
                        };
                        img.src = dataUrl;
                    });
                    loadedImages[0] = img;
                }
                // Bewusst an Mount-Zustand UND Datei-Key gebunden, nicht an den
                // Effect-Lauf: `pageRange` und `initialRects` kommen als Objekte aus
                // dem batchFiles-State und wechseln bei jedem Ersetzen die Identität.
                // Der Effect läuft dadurch auch mitten im Laden neu — ein am
                // Effect-Cleanup hängendes Abbruch-Flag würde hier einen völlig
                // legitimen Ladevorgang abwürgen. Der Key-Vergleich verwirft dagegen
                // gezielt nur Ergebnisse eines inzwischen abgelösten Dokuments.
                if (!isMountedRef.current || lastFileKey.current !== currentKey) return;

                setImages(loadedImages);
                setAllPageRects(mapRects(initialRects, loadedImages, toPixelRects));
                setLoading(false);
            } catch (err) {
                if (!isMountedRef.current || lastFileKey.current !== currentKey) return;

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

    /**
     * @param scope Herkunft des neuen Balkens. Ergibt sich aus dem Haken
     * „Auf alle Scans übernehmen" IM MOMENT DES ZIEHENS — so lassen sich
     * gemeinsame und individuelle Schwärzungen in einem Durchgang setzen.
     */
    const handleEnd = (scope: RedactionScope = 'local') => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const w = Math.abs(startPos.x - currentPos.x);
        const h = Math.abs(startPos.y - currentPos.y);

        if (w > 2 && h > 2) {
            setAllPageRects(prev => ({
                ...prev,
                [currentPage]: [...(prev[currentPage] || []), { x, y, w, h, scope }]
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
    /**
     * Erzeugt den geschwaerzten Abzug — vollstaendig oder gar nicht.
     *
     * GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand `if (!offCtx) continue;`.
     * Liess sich fuer eine Seite keine Leinwand anlegen, verschwand sie
     * lautlos aus dem Abzug. Der Lehrkraft wurde ein fertiges Ergebnis
     * gemeldet, tatsaechlich hatte das Dokument eine Seite weniger — und die
     * Texterkennung lief anschliessend ueber eine Schuelerseite weniger, ohne
     * dass irgendwo etwas fehlte, das jemandem aufgefallen waere.
     *
     * Selten, aber nicht theoretisch: `getContext('2d')` scheitert unter
     * Speicherdruck, und mehrseitige Scans werden hier mit Faktor 2.0
     * gerendert.
     *
     * Ein Teil-Abzug ist die schlechteste aller Antworten — er sieht aus wie
     * ein ganzer. Deshalb: entweder alle Seiten oder ein Fehler.
     */
    const processAndAnonymize = async (onSave: (dataUrls: string[], rects: Record<number, Rect[]>) => void) => {
        const pageIndices = Object.keys(images).map(Number).sort((a, b) => a - b);
        if (pageIndices.length === 0) {
            throw new Error('Es sind keine Seitenbilder geladen — die Schwärzung kann nicht angewendet werden.');
        }

        const results: string[] = [];

        for (const i of pageIndices) {
            const img = images[i];
            const pRects = allPageRects[i] || [];

            const offCanvas = document.createElement('canvas');
            offCanvas.width = img.width;
            offCanvas.height = img.height;
            const offCtx = offCanvas.getContext('2d');
            if (!offCtx) {
                throw new Error(
                    `Seite ${i + 1} konnte nicht geschwärzt werden (keine Zeichenfläche verfügbar). `
                    + 'Es wurde nichts gespeichert — bitte andere Anwendungen schließen und erneut versuchen.'
                );
            }

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

        // Nach außen immer relativ: Die Koordinaten werden später auf andere
        // Auflösungen angewendet (Vorschaubilder, fremde Schülerarbeiten).
        onSave(results, mapRects(allPageRects, images, toRelativeRects));
    };

    return {
        state: { images, currentPage, setCurrentPage, allPageRects, loading, isDrawing, startPos, currentPos },
        handlers: { handleStart, handleMove, handleEnd, handleUndo, handleReset, processAndAnonymize }
    };
};
