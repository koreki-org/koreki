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

// Vor dem 18.11.2026 gab jede neue Vorschau-Adresse alle vorigen frei: Von
// mehreren hochgeladenen Fotos haette vor der Bilderkennung nur das letzte eine
// Vorschau gezeigt (zusaetzlich verbot die CSP `blob:`, s. csp-blob-vorschau.test.ts).
describe('useBatchStatus — Vorschau hochgeladener Fotos', () => {
    const foto = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
    const arbeit = (datei: File): BatchFile => ({ name: datei.name, files: [datei], status: 'pending', ocrDone: false, selected: true, result: null, error: null });
    let zaehler = 0;

    beforeEach(() => {
        (URL.createObjectURL as jest.Mock).mockImplementation(() => `blob:vorschau-${++zaehler}`);
        (URL.revokeObjectURL as jest.Mock).mockClear();
    });

    it('jedes Foto behaelt seine Adresse, solange es in der Liste steht', () => {
        const [a, b, c] = [foto('a.jpg'), foto('b.jpg'), foto('c.jpg')];
        const liste = [arbeit(a), arbeit(b), arbeit(c)];
        const { result, rerender } = renderHook(
            ({ files }) => useBatchStatus(files, [], jest.fn(), jest.fn(), jest.fn()),
            { initialProps: { files: liste } }
        );
        const adressen = liste.map((f, i) => result.current.handlers.getPreviewUrl(i, f));
        rerender({ files: [...liste] });

        expect(new Set(adressen).size).toBe(3);
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        // Dieselbe Datei bekommt beim naechsten Zeichnen dieselbe Adresse, keine neue.
        expect(result.current.handlers.getPreviewUrl(0, liste[0])).toBe(adressen[0]);
    });

    it('gibt die Adresse frei, sobald die Arbeit die Liste verlassen hat', () => {
        const [a, b] = [foto('a.jpg'), foto('b.jpg')];
        const { result, rerender } = renderHook(
            ({ files }) => useBatchStatus(files, [], jest.fn(), jest.fn(), jest.fn()),
            { initialProps: { files: [arbeit(a), arbeit(b)] } }
        );
        const adresseA = result.current.handlers.getPreviewUrl(0, arbeit(a));
        const adresseB = result.current.handlers.getPreviewUrl(1, arbeit(b));

        rerender({ files: [arbeit(b)] });

        expect(URL.revokeObjectURL).toHaveBeenCalledWith(adresseA);
        expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(adresseB);
    });
});
