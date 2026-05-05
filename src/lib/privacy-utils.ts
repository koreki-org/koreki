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
