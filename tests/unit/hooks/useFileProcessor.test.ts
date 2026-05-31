import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileProcessor } from '../../../src/hooks/useFileProcessor';
import React from 'react';
import { extractTextFromFile, convertPdfToImage, toBase64 } from '../../../src/lib/file-utils';
import { performOCRRequest, performAIRequest } from '../../../src/lib/ai-logic';
import { runExtractionStrategy } from '../../../src/lib/ai/extraction-logic';

// 1. Mock file-utils, ai-logic and extraction-logic
jest.mock('../../../src/lib/ai/extraction-logic', () => ({
    runExtractionStrategy: jest.fn()
}));
jest.mock('../../../src/lib/file-utils', () => ({
    extractTextFromFile: jest.fn(),
    convertPdfToImage: jest.fn(),
    toBase64: jest.fn()
}));

jest.mock('../../../src/lib/ai-logic', () => ({
    performOCRRequest: jest.fn(),
    performAIRequest: jest.fn()
}));

describe('useFileProcessor Hook', () => {
    let mockUserData: any;
    let setUserData: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUserData = { logtoId: 'u1', username: 'test-user', credits: 100, appMode: 'STANDARD' };
        setUserData = jest.fn();
    });

    it('should initialize with an empty batch', () => {
        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, '', [], setUserData
        ));

        expect(result.current.batchFiles).toEqual([]);
    });

    it('should remove a file from the batch and re-index names', () => {
        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, '', [], setUserData
        ));

        // Manually set batch files via internal setter (simulating upload)
        act(() => {
            result.current.setBatchFiles([
                { name: 'Schüler #1', originalName: 'A', status: 'pending', selected: true, result: null, error: null },
                { name: 'Schüler #2', originalName: 'B', status: 'pending', selected: true, result: null, error: null }
            ]);
        });

        expect(result.current.batchFiles.length).toBe(2);

        act(() => {
            result.current.removeFile(0);
        });

        expect(result.current.batchFiles.length).toBe(1);
        expect(result.current.batchFiles[0].name).toBe('Schüler #1'); // Re-indexed from #2 to #1
    });

    it('should set pdfTypeQueue during student upload of PDFs', () => {
        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, '', [], setUserData
        ));

        const mockFiles = [
            new File([''], 'test.pdf', { type: 'application/pdf' })
        ];

        const event = {
            target: { files: mockFiles }
        } as unknown as React.ChangeEvent<HTMLInputElement>;

        act(() => {
            result.current.handleStudentUpload(event);
        });

        expect(result.current.pdfTypeQueue.length).toBe(1);
        expect(result.current.pdfTypeQueue[0].fileName).toBe('Schüler #1');
    });

    it('should perform handleExtractOCR with atomic state updates (Flicker-Fix)', async () => {
        (runExtractionStrategy as jest.Mock).mockResolvedValue({ 
            text: 'ROH TEXT', 
            pageCount: 1, 
            documentType: 'scanned', 
            previewDataUrls: ['url-1'] 
        });
        (convertPdfToImage as jest.Mock).mockResolvedValue({ buffers: ['b64'], mimeType: 'image/jpeg' });
        (performOCRRequest as jest.Mock).mockResolvedValue('ROH TEXT');
        (performAIRequest as jest.Mock).mockResolvedValue({ cleanedText: 'REINER TEXT', tasks: [{ name: 'A1', content: 'REINER TEXT' }] });

        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, 'MASTER', [{ name: 'A1', maxPoints: 5 }], setUserData
        ));

        // Setup a file in pending state
        const testFile = new File([''], 'scanned.pdf', { type: 'application/pdf' });
        act(() => {
            result.current.setBatchFiles([{
                name: 'Schüler #1',
                files: [testFile],
                status: 'pending',
                documentType: 'scanned',
                selected: true,
                ocrDone: false,
                result: null,
                error: null
            }]);
        });

        // Start OCR Extraction
        await act(async () => {
            await result.current.handleExtractOCR(result.current.batchFiles);
        });

        // Verification: Wait for the atomic state update
        await waitFor(() => {
            const file = result.current.batchFiles[0];
            expect(file.ocrDone).toBe(true);
            expect(file.fileText).toBe('ROH TEXT');
            expect(file.status).toBe('pending');
        }, { timeout: 4000 });
    });

    it('should perform processSingleFile and update status to done', async () => {
        (performAIRequest as jest.Mock).mockResolvedValue({ 
            overallMatchPercentage: 85,
            tasks: [{ name: 'A1', pointsObtained: 4, feedback: 'Gut' }]
        });

        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, 'MASTER', [{ name: 'A1', maxPoints: 5 }], setUserData
        ));

        // Setup a file in error state
        act(() => {
            result.current.setBatchFiles([{
                name: 'Schüler #1',
                status: 'error',
                error: 'Previous API Error',
                fileText: 'SCHÜLER TEXT',
                selected: true,
                ocrDone: true,
                result: null
            }]);
        });

        // Trigger single file process
        await act(async () => {
            await result.current.processSingleFile(0);
        });

        // Verification
        await waitFor(() => {
            const file = result.current.batchFiles[0];
            expect(file.status).toBe('done');
            expect(file.error).toBeNull();
            expect(file.result).not.toBeNull();
            expect(file.grade).toBeDefined();
        });
    });
});
