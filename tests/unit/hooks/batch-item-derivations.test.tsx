import { renderHook } from '@testing-library/react';
import { useBatchItemDerivations } from '../../../src/hooks/useBatchItemDerivations';
import { BatchFile } from '../../../src/types';
import '@testing-library/jest-dom';

describe('useBatchItemDerivations', () => {
    const mockLayout = [
        { name: 'Aufgabe 1', maxPoints: 5, content: 'DAS IST DIE MUSTERLÖSUNG' },
        { name: 'Aufgabe 2', maxPoints: 10, content: 'MUSTERSCHLÜSSEL' }
    ];

    const mockItem: BatchFile = {
        name: 'Schüler_A.pdf',
        status: 'pending',
        fileText: '=== TASK: Aufgabe 1 ===\nSchülerantwort 1\n=== TASK: Aufgabe 2 ===\nSchülerantwort 2',
        documentType: 'scanned',
        hasLowConfidenceOcr: false,
        tasks: [],
        result: null,
        error: null
    };

    it('should correctly derive status and warnings', () => {
        const { result } = renderHook(() => useBatchItemDerivations({
            item: mockItem,
            idx: 0,
            tasksLayout: mockLayout,
            currentProcessingIndex: null,
            loading: false
        }));

        expect(result.current.isProcessing).toBe(false);
        expect(result.current.isDone).toBe(false);
        expect(result.current.itemHasWarnings).toBe(false);
    });

    it('should strip model solutions from student sections (Industrial Fix)', () => {
        const { result } = renderHook(() => useBatchItemDerivations({
            item: mockItem,
            idx: 0,
            tasksLayout: mockLayout,
            currentProcessingIndex: null,
            loading: false
        }));

        // The splitTextByTasks uses '#' as a delimiter by default if not specified, 
        // but it mainly splits by the layout length or markers.
        // We verify that the 'content' from mockLayout (Musterlösung) is NOT in the studentSections.
        expect(result.current.studentSections[0]).toBe('Schülerantwort 1');
        expect(result.current.studentSections[1]).toBe('Schülerantwort 2');
        expect(result.current.studentSections).not.toContain('DAS IST DIE MUSTERLÖSUNG');
    });

    it('should prioritize manual edits over OCR split', () => {
        const itemWithEdit: BatchFile = {
            ...mockItem,
            tasks: [{ name: 'Aufgabe 1', content: 'MANUELLE KORREKTUR', maxPoints: 5 }]
        };

        const { result } = renderHook(() => useBatchItemDerivations({
            item: itemWithEdit,
            idx: 0,
            tasksLayout: mockLayout,
            currentProcessingIndex: null,
            loading: false
        }));

        expect(result.current.studentSections[0]).toBe('MANUELLE KORREKTUR');
        expect(result.current.studentSections[1]).toBe('Schülerantwort 2');
    });

    it('should detect warnings based on low confidence IF NO TEXT EXIST', () => {
        const itemWithWarning: BatchFile = {
            ...mockItem,
            fileText: '', // NO TEXT YET -> SHOULD SHOW WARNING
            hasLowConfidenceOcr: true
        };

        const { result } = renderHook(() => useBatchItemDerivations({
            item: itemWithWarning,
            idx: 0,
            tasksLayout: mockLayout,
            currentProcessingIndex: null,
            loading: false
        }));

        expect(result.current.itemHasWarnings).toBe(true);
    });


    it('should issue a privacy warning for unredacted scans', () => {
        const unredactedScan: BatchFile = {
            ...mockItem,
            documentType: 'scanned',
            isRedacted: false
        };

        const { result } = renderHook(() => useBatchItemDerivations({
            item: unredactedScan,
            idx: 0,
            tasksLayout: mockLayout,
            currentProcessingIndex: null,
            loading: false
        }));

        expect(result.current.warnings).toContain("Dokument enthält evtl. noch Klarnamen (Anonymisierung prüfen).");
    });
});
