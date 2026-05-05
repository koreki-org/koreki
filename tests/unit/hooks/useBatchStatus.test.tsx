import { renderHook, act } from '@testing-library/react';
import { useBatchStatus } from '../../../src/hooks/useBatchStatus';
import { BatchFile } from '../../../src/types';

// Industrial Mocking Strategy 🏮🛡️
global.fetch = jest.fn(() => 
    Promise.resolve({
        ok: true,
        json: async () => ({})
    })
) as jest.Mock;

global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('useBatchStatus Hook (Mobile Transition Suite)', () => {
    const mockOnExtractOCR = jest.fn();
    const mockOnProcess = jest.fn();
    const mockOnUpdateText = jest.fn();

    const initialFiles: BatchFile[] = [
        { name: 'Student 1', status: 'pending', ocrDone: false, selected: true, result: null, error: null }
    ];

    it('should default to image mode (SCAN) for new batches', () => {
        const { result } = renderHook(() => 
            useBatchStatus(initialFiles, [], mockOnExtractOCR, mockOnProcess, mockOnUpdateText)
        );
        expect(result.current.state.mobileViewMode).toBe('image');
    });

    it('should auto-switch to text mode when OCR finishes for a file', () => {
        const { result, rerender } = renderHook(
            ({ files }) => useBatchStatus(files, [], mockOnExtractOCR, mockOnProcess, mockOnUpdateText),
            { initialProps: { files: initialFiles } }
        );

        // Simulate OCR complete
        const ocrDoneFiles: BatchFile[] = [
            { name: 'Student 1', status: 'pending', ocrDone: true, selected: true, result: null, error: null }
        ];

        rerender({ files: ocrDoneFiles });

        expect(result.current.state.mobileViewMode).toBe('text');
    });

    it('should auto-switch to image mode (KORREKTUR) when correction finishes', () => {
        const ocrDoneFiles: BatchFile[] = [
            { name: 'Student 1', status: 'pending', ocrDone: true, selected: true, result: null, error: null }
        ];

        const { result, rerender } = renderHook(
            ({ files }) => useBatchStatus(files, [], mockOnExtractOCR, mockOnProcess, mockOnUpdateText),
            { initialProps: { files: ocrDoneFiles } }
        );

        // Internal state should be 'text' after OCR (verified in previous test)
        expect(result.current.state.mobileViewMode).toBe('text');

        // Simulate Correction complete
        const correctionDoneFiles: BatchFile[] = [
            { name: 'Student 1', status: 'done', ocrDone: true, selected: true, result: null, error: null }
        ];

        rerender({ files: correctionDoneFiles });

        // Should switch to 'image' (which labels as KORREKTUR in UI)
        expect(result.current.state.mobileViewMode).toBe('image');
    });

    it('should maintain status-tracking across multiple rerenders', () => {
         const { result, rerender } = renderHook(
            ({ files }) => useBatchStatus(files, [], mockOnExtractOCR, mockOnProcess, mockOnUpdateText),
            { initialProps: { files: initialFiles } }
        );

        // OCR Finish
        rerender({ files: [{ name: 'Student 1', status: 'pending', ocrDone: true, selected: true, result: null, error: null }] });
        expect(result.current.state.mobileViewMode).toBe('text');

        // Random prop change (not status)
        rerender({ files: [{ name: 'Student 1', status: 'pending', ocrDone: true, selected: true, pageCount: 2, result: null, error: null }] });
        expect(result.current.state.mobileViewMode).toBe('text'); // Stayed in text

        // Correction Finish
        rerender({ files: [{ name: 'Student 1', status: 'done', ocrDone: true, selected: true, pageCount: 2, result: null, error: null }] });
        expect(result.current.state.mobileViewMode).toBe('image');
    });
});
