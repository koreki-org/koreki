import { extractTextFromFile, renderSinglePage, toBase64 } from '../file-utils';
import { performOCRRequest } from '../ai-logic';
import { promisePool } from '../ai/promise-pool';
import * as pdfjsLib from 'pdfjs-dist';

export interface OCRResult {
    text: string;
    pageCount: number;
    documentType: 'typed' | 'scanned' | 'unknown';
    previewDataUrls?: string[];
}

/**
 * Industrial Document Extraction Strategy (Logic in Lib)
 * Decides between Browser-Native Extraction (Typed) and Parallel Image OCR (Scan).
 */
export async function runExtractionStrategy(
    file: File,
    options: {
        isScan: boolean;
        needsPreview: boolean;
        appMode: any;
        settings: any;
        pageRange?: [number, number];
        sourceOverride?: { buffers: string[], mimeType: string, isScanned: boolean };
        isComplex?: boolean;
    }
): Promise<OCRResult> {
    const { isScan, needsPreview, appMode, settings, pageRange, sourceOverride, isComplex } = options;

    // --- CASE 0: Privacy / Source Override ---
    if (sourceOverride) {
        const text = await performOCRRequest(
            sourceOverride.buffers, 
            sourceOverride.mimeType, 
            false, 
            appMode, 
            settings, 
            sourceOverride.isScanned,
            sourceOverride.buffers.length,
            isComplex
        );
        return { 
            text, 
            pageCount: sourceOverride.buffers.length,
            documentType: sourceOverride.isScanned ? 'scanned' : 'typed',
            previewDataUrls: sourceOverride.buffers.map(b => `data:${sourceOverride.mimeType};base64,${b}`)
        };
    }

    // --- CASE A: Digital Documents (Non-Scanned) ---
    if (!isScan) {
        const res = await extractTextFromFile(file, false, pageRange, { skipPreview: !needsPreview });
        return {
            text: res.text,
            pageCount: res.pageCount,
            documentType: res.documentType,
            previewDataUrls: res.previewDataUrls
        };
    }

    // --- CASE B: Scanned PDF (Pipelined) ---
    if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
        const numPages = pdf.numPages;
        const startPage = pageRange ? pageRange[0] : 1;
        const endPage = pageRange ? pageRange[1] : numPages;

        const pageIndices: number[] = [];
        for (let i = startPage; i <= endPage; i++) pageIndices.push(i);

        const pageCount = pageIndices.length;
        const previewDataUrls: string[] = [];

        // 🚀 INDUSTRIAL PIPELINING: Render Page -> OCR immediately
        const textResults = await promisePool(pageIndices, 1, async (pageNum, idx) => {
            const buffer = await renderSinglePage(pdf, pageNum, 2.5);
            if (needsPreview) {
                previewDataUrls[idx] = `data:image/jpeg;base64,${buffer}`;
            }
            return await performOCRRequest(
                [buffer], 
                'image/jpeg', 
                true, 
                appMode, 
                settings, 
                true, 
                1,
                isComplex
            );
        });

        return {
            text: textResults.join('\n\n'),
            pageCount,
            documentType: 'scanned',
            previewDataUrls: needsPreview ? previewDataUrls : undefined
        };
    }

    // --- CASE C: Direct Image Files ---
    const base64 = await toBase64(file);
    const text = await performOCRRequest(
        [base64], 
        file.type, 
        true, 
        appMode, 
        settings, 
        true, 
        1,
        isComplex
    );
    return {
        text,
        pageCount: 1,
        documentType: 'scanned',
        previewDataUrls: [`data:${file.type};base64,${base64}`]
    };
}
