/**
 * File: src/lib/file-utils.ts
 * Description: Unified file handling utilities for Koreki AI.
 */
import { logger } from './logger';
import { isDesktopTarget } from './env-context';


/**
 * Converts a File object to a Base64 string (without data URI prefix).
 */
export const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

import * as pdfjsLib from 'pdfjs-dist';

// Use the local worker from the public folder (100% self-contained / firewall-proof)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Extracts text from a PDF or Text file entirely on the client side.
 */
export const extractTextFromFile = async (
    file: File,
    isScan: boolean,
    fileRange?: [number, number],
    options: { skipPreview?: boolean } = {}
): Promise<{ text: string, documentType: 'typed' | 'scanned' | 'unknown', pageCount: number, ocrDone?: boolean, previewDataUrls?: string[] }> => {
    if (file.type === 'application/pdf') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ 
                data: arrayBuffer,
                verbosity: 0
            });
            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            const startPage = fileRange ? fileRange[0] : 1;
            const endPage = fileRange ? fileRange[1] : numPages;
            const pageCount = endPage - startPage + 1;

            // Optional: Generate previews for all pages in the range
            let previewDataUrls: string[] = [];
            if (!options.skipPreview) {
                try {
                    const { buffers } = await convertPdfToImage(file, [startPage, endPage]);
                    if (buffers && buffers.length > 0) {
                        previewDataUrls = buffers.map(b => `data:image/jpeg;base64,${b}`);
                    }
                } catch (pErr) {
                    logger.warn("Failed to generate PDF previews", { message: String(pErr) });
                }
            }

            if (isScan) {
                return {
                    text: "",
                    documentType: 'scanned',
                    pageCount,
                    ocrDone: false,
                    previewDataUrls
                };
            }

            let fullText = "";
            for (let i = startPage; i <= endPage; i++) {
                const page = await pdf.getPage(i);
                const [textContent, annotations] = await Promise.all([
                    page.getTextContent({ includeMarkedContent: true }),
                    page.getAnnotations()
                ]);

                const rawItems = textContent.items as any[];

                // 🏗️ Step 1: Filter and Sort
                const items = rawItems
                    .filter(item => item && item.str != null && item.str.trim().length > 0)
                    .sort((a, b) => {
                        if (!a.transform || !b.transform) return 0;
                        const ay = Math.round(a.transform[5] * 10) / 10;
                        const by = Math.round(b.transform[5] * 10) / 10;
                        if (by !== ay) return by - ay;
                        return a.transform[4] - b.transform[4];
                    });

                let lastY: number | null = null;
                let lastStr: string = "";
                let pageText = '';
                
                for (let item of items) {
                    const currentY = Math.round(item.transform[5] * 10) / 10;
                    const currentStr = item.str || "";
                    
                    if (lastY !== null) {
                        const isLineBreak = Math.abs(lastY - currentY) > 5;
                        
                        if (isLineBreak) {
                            // 🚫 FIX 3: Hyphenation across line break
                            if (lastStr.endsWith('-')) {
                                // Remove hyphen and SKIP newline
                                pageText = pageText.slice(0, -1);
                            } else {
                                pageText += '\n';
                            }
                        } else {
                            // 🚫 FIX 2: Same line: only add space if not already present
                            if (pageText.length > 0 && !pageText.endsWith(' ') && !currentStr.startsWith(' ')) {
                                pageText += ' ';
                            }
                        }
                    }
                    
                    pageText += currentStr;
                    lastY = currentY;
                    lastStr = currentStr;
                }
                fullText += pageText + "\n\n";
            }

            const normalizedText = fullText.replace(/\n{3,}/g, '\n\n').trim();

            return {
                text: normalizedText,
                documentType: normalizedText ? 'typed' : 'scanned',
                pageCount,
                ocrDone: !!normalizedText,
                previewDataUrls
            };
        } catch (err) {
            logger.error("PDF Extraction error", { message: String(err) });
            throw err;
        }
    } else if (file.type.startsWith('image/')) {
        return { text: '', documentType: 'scanned', pageCount: 1, ocrDone: false };
    } else {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e: any) => resolve({ text: e.target.result, documentType: 'typed', pageCount: 1, ocrDone: true });
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
};

import { promisePool } from './ai/promise-pool';

/**
 * Converts PDF pages to JPEG images (Base64).
 * Industrial Parallel Rendering (Concurrency: 2)
 */
/**
 * Rendert die Seiten eines Dokuments als Data-URLs — bei Bedarf und unabhängig
 * davon, ob die Verarbeitungs-Pipeline bereits Vorschaubilder erzeugt hat.
 *
 * 🏮 Hintergrund: `extractTextFromFile` liefert für Bild-Uploads (JPG/PNG)
 * bewusst keine `previewDataUrls`. Wer Schwärzungen auf einen ganzen Stapel
 * überträgt, braucht die Seitenbilder aber für JEDEN Scan — sonst bliebe
 * ausgerechnet der Bild-Upload ungeschwärzt.
 */
export const renderDocumentPages = async (file: File, pageRange?: [number, number]): Promise<string[]> => {
    if (file.type === 'application/pdf') {
        const { buffers } = await convertPdfToImage(file, pageRange);
        return buffers.map(b => `data:image/jpeg;base64,${b}`);
    }

    if (file.type.startsWith('image/')) {
        return [await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        })];
    }

    return [];
};

export const convertPdfToImage = async (file: File, pageRange?: [number, number]): Promise<{ buffers: string[], mimeType: string }> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0
    });
    const pdf = await loadingTask.promise;

    const numPages = pdf.numPages;
    const startPage = pageRange ? pageRange[0] : 1;
    const endPage = pageRange ? pageRange[1] : numPages;

    const pageIndices: number[] = [];
    for (let i = startPage; i <= endPage; i++) pageIndices.push(i);

    const buffers = await promisePool(pageIndices, 2, async (pageNum) => {
        return await renderSinglePage(pdf, pageNum, 2.5);
    });

    return { buffers, mimeType: 'image/jpeg' };
};

/**
 * Renders a single PDF page to a JPEG Base64 string.
 * Optimized for AI OCR Consumption (Scale: 2.5, Quality: 92%).
 */
export const renderSinglePage = async (pdf: any, pageNum: number, scale: number = 2.5): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Canvas context creation failed");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
};

/**
 * Industrial Download & Save Bridge
 * 🏮🏗️⚓
 * 
 * SaaS Priority: Uses standard Web APIs for browser downloads.
 * Desktop Enhancement: Uses a custom Tauri bridge for native OS save dialogs.
 */
export const downloadFile = async (
    data: Uint8Array | Blob | string,
    fileName: string,
    mimeType: string
): Promise<void> => {
    try {
        if (isDesktopTarget()) {
            const { invoke } = await import('@tauri-apps/api/core');
            
            // Convert everything to Uint8Array for the Rust bridge
            let buffer: Uint8Array;
            if (data instanceof Blob) {
                buffer = new Uint8Array(await data.arrayBuffer());
            } else if (typeof data === 'string') {
                buffer = new TextEncoder().encode(data);
            } else {
                buffer = data;
            }

            const success = await invoke<boolean>('save_file_native', {
                data: Array.from(buffer), // Send as list of u8
                filename: fileName
            });

            if (!success) {
                logger.warn("Desktop save cancelled or failed");
            }
            return;
        }

        // --- SaaS / Browser Path ---
        let blob: Blob;
        if (data instanceof Blob) {
            blob = data;
        } else if (typeof data === 'string') {
            blob = new Blob([data], { type: mimeType });
        } else {
            // Explicit cast to address Uint8Array<ArrayBufferLike> strictness in Next.js build
            blob = new Blob([data as unknown as BlobPart], { type: mimeType });
        }


        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        
        // Industrial Standard: Must append to body for some webviews/browsers
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        logger.error("Download failed", { message: String(error) });
        throw new Error("Dateidownload fehlgeschlagen.");
    }
};

/**
 * Industrial File Selection Bridge
 * 🏮🏗️📂
 * 
 * SaaS Priority: Uses a standard hidden <input type="file"> for browser selection.
 * Desktop Enhancement: Uses a custom Tauri bridge for native OS "Open" dialogs.
 */
export const selectFiles = async (options: {
    multiple?: boolean;
    accept?: string;
}): Promise<File[]> => {
    try {
        if (isDesktopTarget()) {
            const { invoke } = await import('@tauri-apps/api/core');
            
            // Extract extensions from accept string (e.g. ".pdf,.koreki" -> ["pdf", "koreki"])
            const filters = options.accept 
                ? options.accept.split(',').map(ext => ext.trim().replace(/^\./, ''))
                : [];

            const nativeFiles = await invoke<{ name: string; data: number[] }[]>('open_file_native', {
                multiple: !!options.multiple,
                filters
            });

            return nativeFiles.map(nf => {
                const blob = new Blob([new Uint8Array(nf.data)]);
                return new File([blob], nf.name, { 
                    type: mimeTypeFromExtension(nf.name) 
                });
            });
        }

        // --- SaaS / Browser Path ---
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            if (options.multiple) input.multiple = true;
            if (options.accept) input.accept = options.accept;

            input.onchange = (e: any) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                resolve(files as File[]);
            };

            input.oncancel = () => resolve([]);
            
            input.click();
        });
    } catch (error) {
        logger.error("File selection failed", { message: String(error) });
        return [];
    }
};

/**
 * Small helper to guess mime type based on extension.
 * Essential for maintaining File object integrity on Desktop.
 */
const mimeTypeFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'koreki': return 'application/json';
        case 'txt': return 'text/plain';
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        default: return 'application/octet-stream';
    }
};


