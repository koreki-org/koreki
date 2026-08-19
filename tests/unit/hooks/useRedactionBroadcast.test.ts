import { renderHook, act } from '@testing-library/react';
import { useRedactionBroadcast } from '../../../src/hooks/useRedactionBroadcast';
import { renderDocumentPages } from '../../../src/lib/file-utils';
import { BatchFile } from '../../../src/types';

jest.mock('../../../src/lib/file-utils', () => ({
    renderDocumentPages: jest.fn()
}));

const mockedRenderDocumentPages = renderDocumentPages as jest.MockedFunction<typeof renderDocumentPages>;

/**
 * Layer 1 — Sammel-Übertragung einer Schwärzung auf den gesamten Stapel.
 *
 * jsdom lädt keine Bilder: ohne den Mock unten feuert `onload` nie und
 * `applyRedactionsToPreviews` würde ewig warten. Ein Canvas-Kontext existiert
 * ebenfalls nicht — die Hilfsfunktion reicht dann die Original-URL durch, was
 * für die hier geprüfte Zustands-Logik ausreicht.
 */
describe('useRedactionBroadcast', () => {
    const OriginalImage = global.Image;
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
        mockedRenderDocumentPages.mockReset();
        mockedRenderDocumentPages.mockResolvedValue(['data:image/jpeg;base64,RENDERED']);

        // jsdom liefert fuer `getContext('2d')` null. Bis zum 19.08.2026 fiel
        // das nicht auf, weil `applyRedactionsToPreviews` dann das ORIGINAL
        // durchreichte — dieser Test bestand also, waehrend die "geschwaerzten"
        // Bilder in Wahrheit die ungeschwaerzten waren. Er hat den Fehler
        // mitgetragen, statt ihn zu zeigen.
        //
        // Mit einer funktionierenden Leinwand pruefen die Zusicherungen unten
        // das, was sie behaupten.
        originalCreateElement = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
            if (tag !== 'canvas') return originalCreateElement(tag);
            return {
                width: 0,
                height: 0,
                getContext: () => ({ drawImage: jest.fn(), fillRect: jest.fn(), fillStyle: '' }),
                toDataURL: () => 'data:image/jpeg;base64,GESCHWAERZT'
            };
        }) as typeof document.createElement);

        class LoadingImage {
            onload: (() => void) | null = null;
            onerror: ((e: any) => void) | null = null;
            width = 800;
            height = 1000;
            private _src = '';
            set src(value: string) {
                this._src = value;
                setTimeout(() => this.onload?.(), 0);
            }
            get src() { return this._src; }
        }
        (global as any).Image = LoadingImage;
    });

    afterEach(() => {
        (global as any).Image = OriginalImage;
        jest.restoreAllMocks();
    });

    const scan = (name: string, overrides: Partial<BatchFile> = {}): BatchFile => ({
        name,
        files: [new File(['x'], `${name}.pdf`, { type: 'application/pdf' })],
        status: 'pending',
        documentType: 'scanned',
        pageCount: 2,
        previewDataUrls: ['data:image/jpeg;base64,AAA', 'data:image/jpeg;base64,BBB'],
        ...overrides
    } as BatchFile);

    const header = { x: 0, y: 0, w: 1, h: 0.08 };
    /** Übertragene Balken tragen die Herkunft `shared` — daran hängt die Einfärbung im Modal. */
    const sharedHeader = { ...header, scope: 'shared' as const };

    /** Führt eine Übertragung aus und liefert den resultierenden Stapel. */
    const broadcast = async (files: BatchFile[], sourceIdx: number, rects: any, applyToAll: boolean) => {
        let current = files;
        const setBatchFiles = jest.fn((update: any) => {
            current = typeof update === 'function' ? update(current) : update;
        });

        const { result } = renderHook(() => useRedactionBroadcast(files, setBatchFiles as any));

        await act(async () => {
            await result.current.applyRedaction(sourceIdx, ['data:image/jpeg;base64,RED'], rects, applyToAll);
        });

        return current;
    };

    it('markiert ALLE Scans als geschwärzt, nicht nur den bearbeiteten', async () => {
        const files = [scan('Schüler #1'), scan('Schüler #2'), scan('Schüler #3')];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        // Das GESCHWÄRZT-Tag in der Stapelliste hängt an genau diesem Flag.
        expect(next.map(f => f.isRedacted)).toEqual([true, true, true]);
        expect(next.every(f => (f.redactedDataUrls?.length ?? 0) > 0)).toBe(true);
    });

    it('legt die Vorlage auf jede Seite jedes Scans', async () => {
        const files = [scan('Schüler #1'), scan('Schüler #2')];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        expect(next[1].redactionRects?.[0]).toContainEqual(sharedHeader);
        expect(next[1].redactionRects?.[1]).toContainEqual(sharedHeader);
    });

    it('erhält eine bereits individuell gezogene Schwärzung', async () => {
        const sideNote = { x: 0.8, y: 0.4, w: 0.15, h: 0.05 };
        const files = [scan('Schüler #1'), scan('Schüler #2', { redactionRects: { 1: [sideNote] } })];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        expect(next[1].redactionRects?.[1]).toContainEqual(sideNote);
        expect(next[1].redactionRects?.[1]).toContainEqual(sharedHeader);
    });

    it('rührt ohne Haken ausschließlich das bearbeitete Dokument an', async () => {
        const files = [scan('Schüler #1'), scan('Schüler #2')];

        const next = await broadcast(files, 0, { 0: [header] }, false);

        expect(next[0].isRedacted).toBe(true);
        expect(next[1].isRedacted).toBeUndefined();
    });

    it('überspringt bereits korrigierte Arbeiten', async () => {
        const files = [scan('Schüler #1'), scan('Schüler #2', { status: 'done', fileText: 'Antwort' })];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        expect(next[1].isRedacted).toBeUndefined();
        expect(next[1].fileText).toBe('Antwort');
    });

    /**
     * REGRESSION: Bild-Uploads (JPG/PNG) erhalten von `extractTextFromFile` nie
     * `previewDataUrls`. Sie wurden dadurch stillschweigend übersprungen und
     * blieben in der Stapelliste ohne GESCHWÄRZT-Tag — also ungeschwärzt.
     */
    it('rendert fehlende Seitenbilder nach, statt den Scan zu überspringen', async () => {
        const files = [scan('Schüler #1'), scan('Schüler #2', { previewDataUrls: undefined })];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        expect(mockedRenderDocumentPages).toHaveBeenCalled();
        expect(next[1].isRedacted).toBe(true);
        expect(next[1].redactedDataUrls?.length).toBeGreaterThan(0);
    });

    /**
     * 🏮 Erkannter Text eines NOCH NICHT geschwärzten Scans stammt vom
     * ungeschwärzten Bild und kann Klarnamen enthalten. Er muss weichen.
     */
    it('verwirft die Bilderkennung eines noch ungeschwärzten Scans', async () => {
        const files = [
            scan('Schüler #1'),
            scan('Schüler #2', { ocrDone: true, fileText: 'Antwort mit Klarname' })
        ];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        expect(next[1].ocrDone).toBe(false);
        expect(next[1].fileText).toBe('');
    });

    /**
     * REGRESSION: Eine Sammel-Übertragung setzte pauschal `ocrDone: false` für
     * JEDEN Scan im Stapel — auch für solche, deren Balken sich gar nicht
     * änderten. Ergebnis: „Korrigieren" war gesperrt, der erkannte Text samt
     * manueller Korrekturen war weg und die Bilderkennung kostete erneut
     * Credits. Ändert sich nichts, bleibt die Erkennung gültig.
     */
    it('erhält die Bilderkennung, wenn sich die Balken nicht ändern', async () => {
        const files = [
            scan('Schüler #1'),
            scan('Schüler #2', {
                isRedacted: true,
                redactionRects: { 0: [sharedHeader], 1: [sharedHeader] },
                ocrDone: true,
                fileText: 'Bereits geprüfter Text'
            })
        ];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        expect(next[1].ocrDone).toBe(true);
        expect(next[1].fileText).toBe('Bereits geprüfter Text');
    });

    it('erhält die Bilderkennung des bearbeiteten Dokuments bei unveränderten Balken', async () => {
        const files = [
            scan('Schüler #1', {
                isRedacted: true,
                redactionRects: { 0: [header] },
                ocrDone: true,
                fileText: 'Bereits geprüfter Text'
            })
        ];

        const next = await broadcast(files, 0, { 0: [header] }, false);

        expect(next[0].ocrDone).toBe(true);
        expect(next[0].fileText).toBe('Bereits geprüfter Text');
    });

    it('verwirft die Bilderkennung des bearbeiteten Dokuments bei neuen Balken', async () => {
        const files = [
            scan('Schüler #1', {
                isRedacted: true,
                redactionRects: { 0: [header] },
                ocrDone: true,
                fileText: 'Bereits geprüfter Text'
            })
        ];

        const next = await broadcast(files, 0, { 0: [header, { x: 0.5, y: 0.5, w: 0.2, h: 0.05 }] }, false);

        expect(next[0].ocrDone).toBe(false);
        expect(next[0].fileText).toBe('');
    });

    /**
     * 🏮 Lässt sich wirklich kein Seitenbild erzeugen, existiert kein
     * anonymisierter Abzug. `isRedacted` darf dann NICHT gesetzt werden, weil
     * `resolveOCRSource` sonst auf das Original zurückfällt und ungeschwärzte
     * Seiten an die Bilderkennung schickt.
     */
    it('markiert Scans ohne erzeugbare Seitenbilder nicht als geschwärzt', async () => {
        mockedRenderDocumentPages.mockResolvedValue([]);
        const files = [scan('Schüler #1'), scan('Schüler #2', { previewDataUrls: undefined })];

        const next = await broadcast(files, 0, { 0: [header] }, true);

        expect(next[1].isRedacted).toBeUndefined();
        expect(next[1].redactedDataUrls).toBeUndefined();
        expect(next[1].redactionRects?.[0]).toContainEqual(sharedHeader); // vorgemerkt
    });
});
