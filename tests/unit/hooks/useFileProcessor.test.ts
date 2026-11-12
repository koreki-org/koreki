import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileProcessor } from '../../../src/hooks/useFileProcessor';
import React from 'react';
import { extractTextFromFile, convertPdfToImage, toBase64 } from '../../../src/lib/file-utils';
import { performOCRRequest, performAIRequest } from '../../../src/lib/ai-logic';
import { runExtractionStrategy } from '../../../src/lib/ai/extraction-logic';
import { useBatchStore } from '../../../src/hooks/store/useBatchStore';

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
        // Der Stapel liegt in einem globalen Speicher, nicht im Hook. Ohne dieses
        // Zuruecksetzen erbt jeder Test den Stand des vorigen — bisher UNSICHTBAR,
        // weil ein Upload alles ersetzte. Seit er ANHAENGT (09.11.2026) kam die
        // Arbeit des Vortests mit und die Nummern verschoben sich.
        useBatchStore.setState({ batchFiles: [] });
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

        act(() => {
            result.current.handleStudentUpload(mockFiles);
        });

        expect(result.current.pdfTypeQueue.length).toBe(1);
        expect(result.current.pdfTypeQueue[0].fileName).toBe('test.pdf') // der Dateiname, damit der Dialog sagen kann, welche Datei gemeint ist;
    });

    it('haengt weitere Arbeiten an, statt die geladenen zu ersetzen', async () => {
        // Die Fehlerklasse, gegen die dieser Test steht: Bis zum 09.11.2026 ERSETZTE
        // jeder weitere Upload die ganze Liste. Wer eine nachgereichte Arbeit
        // hinzufuegte, verlor alle anderen — ohne Rueckfrage und ohne Weg zurueck,
        // denn Schuelerdaten leben nur im Arbeitsspeicher.
        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, '', [], setUserData
        ));

        await act(async () => {
            await result.current.handleStudentUpload([
                new File([''], 'anna.pdf', { type: 'application/pdf' })
            ]);
        });
        expect(result.current.batchFiles.length).toBe(1);

        await act(async () => {
            await result.current.handleStudentUpload([
                new File([''], 'bruno.pdf', { type: 'application/pdf' })
            ]);
        });

        expect(result.current.batchFiles.length).toBe(2);
        expect(result.current.batchFiles.map(f => f.originalName)).toEqual(['anna', 'bruno']);
        // Die Nummern entstehen aus der Position, nicht aus der Upload-Reihenfolge.
        expect(result.current.batchFiles.map(f => f.name)).toEqual(['Schüler #1', 'Schüler #2']);
    });

    it('laesst fertige Arbeiten in Ruhe, wenn eine weitere dazukommt', async () => {
        // Die teuerste Falle beim Anhaengen: `startExtraction` bekommt die GESAMTE
        // Liste, weil seine Schleifen-Platznummer darauf zeigt. Wer dort nur auf
        // Vorschaubilder prueft, schickt jeden fertigen Moodle-Eintrag und jede
        // fertige Textdatei ERNEUT durch die KI — eine nachgereichte Arbeit kostet
        // dann den ganzen Stapel an Credits und ueberschreibt Handkorrekturen.
        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, '', [], setUserData
        ));

        // Eine fertige Arbeit ohne Vorschaubilder — genau der verwundbare Fall.
        act(() => {
            result.current.setBatchFiles([{
                name: 'Schüler #1',
                originalName: 'anna',
                files: [new File(['fertig'], 'anna.txt', { type: 'text/plain' })],
                status: 'done',
                fileText: 'Antwort von Anna',
                result: { tasks: [], overallMatchPercentage: 80 },
                error: null,
                selected: true,
                ocrDone: true
            }]);
        });

        (runExtractionStrategy as jest.Mock).mockClear();

        await act(async () => {
            await result.current.handleStudentUpload([
                new File(['neu'], 'bruno.txt', { type: 'text/plain' })
            ]);
            // Der Typ-Dialog beantwortet sich im Test selbst — das loest die
            // Einlesung aus, so wie der Klick der Lehrkraft.
            await result.current.handlePDFTypeSelect('typed', true);
        });

        const gelesen = (runExtractionStrategy as jest.Mock).mock.calls
            .map(aufruf => aufruf[0]?.name);
        expect(gelesen).not.toContain('anna.txt');
        expect(result.current.batchFiles[0].status).toBe('done');
        expect(result.current.batchFiles[0].fileText).toBe('Antwort von Anna');
    });

    it('erkennt eine bereits geladene Datei am Namen und nimmt sie nicht doppelt', async () => {
        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, '', [], setUserData
        ));

        await act(async () => {
            await result.current.handleStudentUpload([
                new File([''], 'anna.pdf', { type: 'application/pdf' })
            ]);
        });

        // Dieselbe Datei erneut — beim Ziehen leicht passiert, und zweimal
        // dieselbe Arbeit im Stapel kostet zweimal Credits.
        await act(async () => {
            await result.current.handleStudentUpload([
                new File([''], 'anna.pdf', { type: 'application/pdf' }),
                new File([''], 'clara.pdf', { type: 'application/pdf' })
            ]);
        });

        expect(result.current.batchFiles.map(f => f.originalName)).toEqual(['anna', 'clara']);
    });

    it('teilt eine Stapel-PDF auf und haengt danach weiter an', async () => {
        // Die Stapel-PDF ist der haeufigste Fall ueberhaupt: EINE Datei, dreissig
        // Schueler. Sie laeuft ueber `executeSplit`, nicht ueber den Upload — und
        // ihre dreissig Eintraege teilen sich DIESELBE Datei. Beim Anhaengen darf
        // das weder zu dreissig vermeintlichen Doppelgaengern fuehren noch die
        // aufgeteilten Eintraege verlieren.
        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, '', [], setUserData
        ));

        const stapel = new File([''], 'klassenarbeit-8b.pdf', { type: 'application/pdf' });
        act(() => {
            result.current.setBatchFiles([{
                name: 'Schüler #1', originalName: 'klassenarbeit-8b', files: [stapel],
                status: 'pending', result: null, error: null, selected: true,
                documentType: 'typed', pageCount: 3, ocrDone: false
            }]);
        });

        act(() => { result.current.setSplitIdx(0); });
        act(() => {
            result.current.executeSplit([
                { firstName: 'Anna', lastName: 'Albers', pageCount: 1 },
                { firstName: 'Bruno', lastName: 'Berg', pageCount: 1 },
                { firstName: 'Clara', lastName: 'Cheng', pageCount: 1 }
            ]);
        });

        expect(result.current.batchFiles.length).toBe(3);
        // Der Klarname lebt in `originalName`; `name` ist die Platznummer.
        expect(result.current.batchFiles.map(f => f.originalName))
            .toEqual(['Anna Albers', 'Bruno Berg', 'Clara Cheng']);
        expect(result.current.batchFiles.map(f => f.pageRange))
            .toEqual([[1, 1], [2, 2], [3, 3]]);

        // Jetzt reicht die Lehrkraft eine vergessene Arbeit nach.
        await act(async () => {
            await result.current.handleStudentUpload([
                new File([''], 'nachzuegler.pdf', { type: 'application/pdf' })
            ]);
        });

        expect(result.current.batchFiles.length).toBe(4);
        expect(result.current.batchFiles.map(f => f.originalName))
            .toEqual(['Anna Albers', 'Bruno Berg', 'Clara Cheng', 'nachzuegler']);
        expect(result.current.batchFiles.map(f => f.name))
            .toEqual(['Schüler #1', 'Schüler #2', 'Schüler #3', 'Schüler #4']);
        // Die Seitenbereiche der aufgeteilten Arbeiten bleiben, wie sie waren.
        expect(result.current.batchFiles[1].pageRange).toEqual([2, 2]);
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

    it('should allow aborting handleExtractOCR using the activeBatchController', async () => {
        let isAborted = false;
        (runExtractionStrategy as jest.Mock).mockImplementation((file, options) => {
            return new Promise((resolve, reject) => {
                if (options.signal) {
                    options.signal.addEventListener('abort', () => {
                        isAborted = true;
                        reject(new DOMException('The user aborted a request.', 'AbortError'));
                    });
                }
            });
        });

        const { result } = renderHook(() => useFileProcessor(
            mockUserData, { provider: 'mistral', mistralKey: '' }, 'MASTER', [{ name: 'A1', maxPoints: 5 }], setUserData
        ));

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

        const ocrPromise = act(async () => {
            await result.current.handleExtractOCR(result.current.batchFiles);
        });

        act(() => {
            useBatchStore.getState().abortBatch();
        });

        await ocrPromise;

        expect(isAborted).toBe(true);
        expect(result.current.batchFiles[0].status).toBe('pending');
    });
});
