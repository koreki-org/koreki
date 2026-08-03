import { renderHook, act } from '@testing-library/react';
import { useRedactionEngine } from '../../../src/hooks/useRedactionEngine';

/**
 * Redaction Engine Math Tests
 * 🏮🛡️📐
 * Deterministic validation of coordinate transformation and state integrity.
 */

describe('useRedactionEngine (Industrial Math Tests) 🖋️📐', () => {
    
    // We use a dummy object to satisfy the !activeImage check in the engine
    const mockActiveImage = { width: 1000, height: 1000 } as any;

    const setupCanvasMock = (width: number, height: number, rectWidth: number, rectHeight: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getBoundingClientRect = jest.fn(() => ({
            width: rectWidth, height: rectHeight,
            top: 100, left: 100, bottom: 100 + rectHeight, right: 100 + rectWidth,
            x: 100, y: 100, toJSON: () => {}
        })) as any;
        return canvas;
    };

    it('should correctly transform screen coordinates to internal canvas resolution', () => {
        const { result } = renderHook(() => useRedactionEngine(true, null));
        const canvas = setupCanvasMock(2000, 1000, 500, 250);
        const mouseEvent = { clientX: 200, clientY: 150 };

        act(() => {
            // Provide mockActiveImage to bypass internal safety checks
            result.current.handlers.handleStart(mouseEvent, canvas, mockActiveImage);
        });

        expect(result.current.state.startPos).toEqual({ x: 400, y: 200 });
    });

    it('should correctly calculate rectangle dimensions (Industrial Assemblies)', () => {
        const { result } = renderHook(() => useRedactionEngine(true, null));
        const canvas = setupCanvasMock(1000, 1000, 1000, 1000);

        act(() => {
            result.current.handlers.handleStart({ clientX: 300, clientY: 300 }, canvas, mockActiveImage);
        });
        act(() => {
            result.current.handlers.handleMove({ clientX: 200, clientY: 200 }, canvas, mockActiveImage);
        });
        act(() => {
            result.current.handlers.handleEnd();
        });

        const rects = result.current.state.allPageRects[0] || [];
        expect(rects).toHaveLength(1);
        // `scope` kennzeichnet die Herkunft: ohne gesetzten Haken „Auf alle Scans
        // übernehmen" gilt ein Balken nur für die aktuelle Arbeit.
        expect(rects[0]).toEqual({ x: 100, y: 100, w: 100, h: 100, scope: 'local' });
    });

    it('should correctly perform undo operations', () => {
        const { result } = renderHook(() => useRedactionEngine(true, null));
        const canvas = setupCanvasMock(1000, 1000, 1000, 1000);

        act(() => {
            result.current.handlers.handleStart({ clientX: 200, clientY: 200 }, canvas, mockActiveImage);
        });
        act(() => {
            result.current.handlers.handleMove({ clientX: 300, clientY: 300 }, canvas, mockActiveImage);
        });
        act(() => {
            result.current.handlers.handleEnd();
        });

        expect(result.current.state.allPageRects[0]).toHaveLength(1);

        act(() => {
            result.current.handlers.handleUndo();
        });

        expect(result.current.state.allPageRects[0]).toHaveLength(0);
    });
});
