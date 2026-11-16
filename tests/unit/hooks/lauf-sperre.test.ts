import { renderHook, act } from '@testing-library/react';
import { useFileProcessor } from '../../../src/hooks/useFileProcessor';
import { useBatchStore } from '../../../src/hooks/store/useBatchStore';
import type { BatchFile } from '../../../src/types';

/**
 * Waehrend eines Laufs verschiebt nichts die Arbeiten-Liste.
 * 🔒
 *
 * ANLASS (16.11.2026): Waehrend der Bilderkennung wurde eine Zeile geloescht.
 * Der Lauf schrieb weiter nach Zeilennummer — ab da stand jeder erkannte Text
 * unter dem Namen des naechsten Schuelers, und am Ende entstand eine Zeile ohne
 * Namen. Siehe `src/hooks/file-processor/lauf-sperre.ts`.
 */

jest.mock('../../../src/lib/ai/extraction-logic', () => ({ runExtractionStrategy: jest.fn() }));
jest.mock('../../../src/lib/file-utils', () => ({
    extractTextFromFile: jest.fn().mockResolvedValue({ pageCount: 1, previewDataUrls: [] }),
    convertPdfToImage: jest.fn(),
    toBase64: jest.fn()
}));
jest.mock('../../../src/lib/ai-logic', () => ({ performOCRRequest: jest.fn(), performAIRequest: jest.fn() }));

const arbeit = (name: string, extra: Partial<BatchFile> = {}): BatchFile => ({
    name, originalName: name, status: 'pending', selected: true, result: null, error: null, ...extra
});

function starte() {
    return renderHook(() => useFileProcessor(
        { logtoId: 'u1', username: 't', credits: 100, appMode: 'STANDARD' },
        { provider: 'mistral', mistralKey: '' }, '', [], jest.fn()
    ));
}

describe('Sperre waehrend eines Laufs', () => {
    beforeEach(() => {
        useBatchStore.setState({ batchFiles: [], isLoadingBatch: false });
    });

    afterEach(() => {
        useBatchStore.setState({ isLoadingBatch: false });
    });

    it('loescht waehrend eines Laufs keine Zeile', () => {
        const { result } = starte();
        act(() => { result.current.setBatchFiles([arbeit('A'), arbeit('B'), arbeit('C')]); });

        act(() => { useBatchStore.setState({ isLoadingBatch: true }); });
        act(() => { result.current.removeFile(0); });

        expect(result.current.batchFiles.map(f => f.originalName)).toEqual(['A', 'B', 'C']);
    });

    it('loescht nach dem Lauf wieder wie gewohnt', () => {
        const { result } = starte();
        act(() => { result.current.setBatchFiles([arbeit('A'), arbeit('B')]); });

        act(() => { result.current.removeFile(0); });

        expect(result.current.batchFiles.map(f => f.originalName)).toEqual(['B']);
    });

    it('teilt waehrend eines Laufs nicht auf', () => {
        const { result } = starte();
        const stapel = new File([''], 'stapel.pdf', { type: 'application/pdf' });
        act(() => {
            result.current.setBatchFiles([
                arbeit('Stapel', { files: [stapel], pageCount: 2, documentType: 'scanned' }),
                arbeit('Danach')
            ]);
        });

        act(() => { useBatchStore.setState({ isLoadingBatch: true }); });
        act(() => { result.current.setSplitIdx(0); });
        act(() => {
            result.current.executeSplit([
                { firstName: 'Anna', lastName: 'Albers', pageCount: 1 },
                { firstName: 'Bruno', lastName: 'Berg', pageCount: 1 }
            ]);
        });

        expect(result.current.batchFiles.map(f => f.originalName)).toEqual(['Stapel', 'Danach']);
        // Das Fenster schliesst trotzdem — sonst haengt es offen ueber dem Lauf.
        expect(result.current.splitIdx).toBeNull();
    });
});
