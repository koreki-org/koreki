/**
 * File: src/lib/privacy-utils.ts
 * Description: Industrial Privacy & Anonymization Utilities. 🏮🛡️🏛️
 * Ensures that sensitive data is handled with highest integrity across the pipeline.
 */

import { BatchFile } from '../types';

export interface OCRSource {
    buffers: string[];
    mimeType: string;
    isScanned: boolean;
}

/**
 * Resolves the atomic source for OCR processing.
 * 🏮 CRITICAL RULE: If a file is redacted, the REDACTED data MUST be prioritized
 * to ensure sensitive original data never leaves the browser.
 */
export function resolveOCRSource(item: BatchFile): OCRSource | null {
    if (!item.files || item.files.length === 0) return null;

    // --- CASE A: REDACTED (Anonymisierungspfad) ---
    if (item.isRedacted && item.redactedDataUrls && item.redactedDataUrls.length > 0) {
        // We strictly use the list of blacked-out images.
        const buffers = item.redactedDataUrls.map(url => url.split(',')[1]).filter(Boolean);
        
        if (buffers.length === 0) return null;

        return {
            buffers,
            mimeType: 'image/jpeg',
            isScanned: true // A redacted canvas export is by definition an image/scan
        };
    }

    // --- CASE B: ORIGINAL (Standardpfad) ---
    // If not redacted, we return null to signal that the standard file-processor
    // logic (PDF-to-Image or Image-B64) should handle it.
    // This maintains separation of concerns.
    return null;
}

/**
 * Re-applies redaction rectangles to preview images.
 * Used when restoring physical PDFs from a .koreki export where only coordinates are saved.
 */
export async function applyRedactionsToPreviews(
    previewUrls: string[],
    redactionRects: Record<number, { x: number, y: number, w: number, h: number }[]>
): Promise<string[]> {
    const results: string[] = [];
    
    for (let i = 0; i < previewUrls.length; i++) {
        const url = previewUrls[i];
        const rects = redactionRects[i] || [];
        
        if (rects.length === 0) {
            results.push(url);
            continue;
        }

        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            results.push(url);
            continue;
        }

        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = '#0f172a'; // Slate-900 / Black
        rects.forEach(r => {
            ctx.fillRect(r.x, r.y, r.w, r.h);
        });

        results.push(canvas.toDataURL('image/jpeg', 0.9));
    }
    
    return results;
}
