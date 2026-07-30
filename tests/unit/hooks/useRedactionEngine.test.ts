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
