import { renderHook, act } from '@testing-library/react';
import { useRedactionEngine } from '../../../src/hooks/useRedactionEngine';

// Mock pdfjs
jest.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: jest.fn()
}));

describe('useRedactionEngine - Industrial Hook Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * REGRESSIONSTESTS für einen Ladevorgang, der seine Komponente überlebt.
     *
     * DashboardModals rendert das RedactionModal bedingt — Schließen hängt es aus,
     * auch mitten im Laden. Vorher lief `loadFiles` danach weiter, schrieb State auf
     * der ausgehängten Komponente und protokollierte einen Fehler für ein Dokument,
     * das niemand mehr sieht. Unter jsdom kam das zusätzlich erst nach dem Abbau der
     * Testumgebung an ("Cannot log after tests are done") und färbte die gesamte
     * Suite mit Exit-Code 1 rot, obwohl kein einziger Test fehlschlug.
     *
     * jsdom lädt keine Bilder — ohne den Mock unten feuert weder `onload` noch
     * `onerror`, der Ladevorgang erreicht die kritische Stelle also nie und der Test
     * wäre wertlos (er bestünde auch ohne den Fix).
     */
    describe('Ladevorgang überlebt die Komponente', () => {
        const OriginalImage = global.Image;

        beforeEach(() => {
            class FailingImage {
                onload: (() => void) | null = null;
                onerror: ((e: any) => void) | null = null;
                private _src = '';
                set src(value: string) {
                    this._src = value;
                    setTimeout(() => this.onerror?.(new Event('error')), 0);
                }
                get src() { return this._src; }
            }
            (global as any).Image = FailingImage;
        });

        afterEach(() => {
            (global as any).Image = OriginalImage;
        });

        const pngFile = () => new File(['dummy content'], 'test.png', { type: 'image/png' });

        const settle = async () => {
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
            });
        };

        it('protokolliert nichts mehr, nachdem die Komponente während des Ladens ausgehängt wurde', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            const { unmount } = renderHook(() => useRedactionEngine(true, pngFile()));
            unmount();

            await settle();

            expect(errorSpy).not.toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        /**
         * Gegenprobe: Der Fix darf Fehler nicht generell verschlucken. Solange die
         * Komponente steht, muss ein fehlgeschlagener Ladevorgang sichtbar bleiben.
         */
        it('meldet Ladefehler weiterhin, solange die Komponente steht', async () => {
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            renderHook(() => useRedactionEngine(true, pngFile()));

            await settle();

            expect(errorSpy).toHaveBeenCalled();
            errorSpy.mockRestore();
        });
    });

    it('should initialize with default empty state when not open', () => {
        const { result } = renderHook(() => useRedactionEngine(false, null));

        expect(result.current.state.currentPage).toBe(0);
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.isDrawing).toBe(false);
        expect(result.current.state.allPageRects).toEqual({});
    });

    it('should initialize with provided initialRects when passed', () => {
        const initialRects = {
            0: [{ x: 10, y: 10, w: 100, h: 50 }]
        };
        const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });

        const { result } = renderHook(() => useRedactionEngine(true, mockFile, undefined, initialRects));

        expect(result.current.state.allPageRects).toEqual(initialRects);
    });

    it('should allow changing current page index via setCurrentPage', () => {
        const { result } = renderHook(() => useRedactionEngine(false, null));

        act(() => {
            result.current.state.setCurrentPage(2);
        });

        expect(result.current.state.currentPage).toBe(2);
    });

    it('should handle drawing, undoing, and resetting redaction rectangles deterministically', () => {
        const { result } = renderHook(() => useRedactionEngine(false, null));

        const mockCanvas = {
            width: 1000,
            height: 1000,
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 })
        } as unknown as HTMLCanvasElement;

        const mockImage = {} as HTMLImageElement;

        // 1. Simulate Start Dragging at (50, 50) -> canvas coords (100, 100)
        act(() => {
            result.current.handlers.handleStart(
                { clientX: 50, clientY: 50 },
                mockCanvas,
                mockImage
            );
        });

        expect(result.current.state.isDrawing).toBe(true);

        // 2. Simulate Move to (150, 150) -> canvas coords (300, 300)
        act(() => {
            result.current.handlers.handleMove(
                { clientX: 150, clientY: 150 },
                mockCanvas,
                mockImage
            );
        });

        // 3. Finish drawing rect (width 200, height 200)
        act(() => {
            result.current.handlers.handleEnd();
        });

        expect(result.current.state.isDrawing).toBe(false);
        expect(result.current.state.allPageRects[0]).toEqual([
            { x: 100, y: 100, w: 200, h: 200 }
        ]);

        // 4. Test Undo - should remove the added rect
        act(() => {
            result.current.handlers.handleUndo();
        });

        expect(result.current.state.allPageRects[0]).toEqual([]);

        // 5. Add a rect again, then Reset
        act(() => {
            result.current.handlers.handleStart({ clientX: 10, clientY: 10 }, mockCanvas, mockImage);
        });

        act(() => {
            result.current.handlers.handleMove({ clientX: 100, clientY: 100 }, mockCanvas, mockImage);
        });

        act(() => {
            result.current.handlers.handleEnd();
        });

        expect(result.current.state.allPageRects[0]).toEqual([
            { x: 20, y: 20, w: 180, h: 180 }
        ]);

        act(() => {
            result.current.handlers.handleReset();
        });

        expect(result.current.state.allPageRects[0]).toEqual([]);
    });
});
