import { resolveOCRSource } from '../../src/lib/privacy-utils';
import { BatchFile } from '../../src/types';

describe('Privacy Utils (Layer 1 Security Proof)', () => {
    
    const mockFile = new File([''], 'test.png', { type: 'image/png' });

    it('should return null (Pass-through) for unredacted files', () => {
        const item: Partial<BatchFile> = {
            files: [mockFile],
            isRedacted: false
        };

        const result = resolveOCRSource(item as BatchFile);
        expect(result).toBeNull();
    });

    it('should enforce redacted source if isRedacted is true and dataUrls exist', () => {
        const item: Partial<BatchFile> = {
            files: [mockFile],
            isRedacted: true,
            redactedDataUrls: [
                'data:image/jpeg;base64,PAGE1_B64',
                'data:image/jpeg;base64,PAGE2_B64'
            ]
        };

        const result = resolveOCRSource(item as BatchFile);
        
        expect(result).not.toBeNull();
        expect(result?.buffers).toEqual(['PAGE1_B64', 'PAGE2_B64']);
        expect(result?.mimeType).toBe('image/jpeg');
        expect(result?.isScanned).toBe(true);
    });

    it('should preserve strict sequential order for multiple redacted pages', () => {
        const item: Partial<BatchFile> = {
            files: [mockFile],
            isRedacted: true,
            redactedDataUrls: Array.from({ length: 10 }, (_, i) => `data:image/jpeg;base64,DATA_${i}`)
        };

        const result = resolveOCRSource(item as BatchFile);
        expect(result?.buffers).toHaveLength(10);
        expect(result?.buffers[0]).toBe('DATA_0');
        expect(result?.buffers[9]).toBe('DATA_9');
        // Ensure no out-of-order mapping occurs
        result?.buffers.forEach((buf, i) => {
            expect(buf).toBe(`DATA_${i}`);
        });
    });

    it('should enforce image/jpeg MIME-type for the vision pipeline', () => {
        const item: Partial<BatchFile> = {
            files: [mockFile],
            isRedacted: true,
            redactedDataUrls: ['data:image/png;base64,PNG_DATA'] // Even if input is PNG dataUrl
        };

        const result = resolveOCRSource(item as BatchFile);
        expect(result?.mimeType).toBe('image/jpeg'); // We enforce jpeg for AI cost/speed
    });

    it('should fail-safe (return null) if redaction is active but dataUrls are empty', () => {
        const item: Partial<BatchFile> = {
            files: [mockFile],
            isRedacted: true,
            redactedDataUrls: []
        };

        const result = resolveOCRSource(item as BatchFile);
        expect(result).toBeNull();
    });

    it('should handle malformed dataUrls by returning null or empty set', () => {
        const item: Partial<BatchFile> = {
            files: [mockFile],
            isRedacted: true,
            redactedDataUrls: ['invalid-data-string']
        };

        const result = resolveOCRSource(item as BatchFile);
        expect(result).toBeNull();
    });
});

describe('applyRedactionsToPreviews (Layer 1 Security Proof)', () => {
    let mockDrawImage: jest.Mock;
    let mockFillRect: jest.Mock;
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
        mockDrawImage = jest.fn();
        mockFillRect = jest.fn();

        // Mock canvas context
        const mockContext = {
            drawImage: mockDrawImage,
            fillRect: mockFillRect,
            fillStyle: ''
        };

        const mockCanvas = {
            width: 800,
            height: 600,
            getContext: jest.fn(() => mockContext),
            toDataURL: jest.fn(() => 'data:image/jpeg;base64,MOCKED_REDACTED_IMAGE')
        };

        originalCreateElement = document.createElement.bind(document);
        document.createElement = jest.fn((tagName: string) => {
            if (tagName === 'canvas') return mockCanvas as any;
            return originalCreateElement(tagName);
        });

        // Mock Image to invoke onload immediately
        Object.defineProperty(global, 'Image', {
            writable: true,
            value: class {
                onload: () => void = () => {};
                src: string = '';
                width = 800;
                height = 600;
                set srcSet(val: string) {}
                // Trigger onload immediately when src is set
                set srcStr(val: string) {
                    this.src = val;
                    setTimeout(() => this.onload(), 0);
                }
            }
        });
        
        // Proper way to trigger onload synchronously for the test
        const NativeImage = global.Image;
        global.Image = class extends NativeImage {
            constructor() {
                super();
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 10);
            }
        } as any;
    });

    afterEach(() => {
        document.createElement = originalCreateElement;
        jest.clearAllMocks();
    });

    it('should pass through images if no redaction rects exist for that page', async () => {
        const { applyRedactionsToPreviews } = require('../../src/lib/privacy-utils');
        
        const previewUrls = ['data:image/jpeg;base64,PREVIEW_1'];
        const rects = {}; // Empty

        const result = await applyRedactionsToPreviews(previewUrls, rects);

        expect(result).toHaveLength(1);
        expect(result[0]).toBe('data:image/jpeg;base64,PREVIEW_1');
        expect(mockDrawImage).not.toHaveBeenCalled();
    });

    it('should apply redaction rects onto a canvas and return the new base64 image', async () => {
        const { applyRedactionsToPreviews } = require('../../src/lib/privacy-utils');
        
        const previewUrls = ['data:image/jpeg;base64,PREVIEW_1'];
        const rects = {
            0: [
                { x: 10, y: 20, w: 100, h: 50 },
                { x: 200, y: 300, w: 150, h: 60 }
            ]
        };

        const result = await applyRedactionsToPreviews(previewUrls, rects);

        expect(result).toHaveLength(1);
        expect(result[0]).toBe('data:image/jpeg;base64,MOCKED_REDACTED_IMAGE');
        expect(mockDrawImage).toHaveBeenCalledTimes(1);
        expect(mockFillRect).toHaveBeenCalledTimes(2);
        
        // Check coordinates
        expect(mockFillRect).toHaveBeenNthCalledWith(1, 10, 20, 100, 50);
        expect(mockFillRect).toHaveBeenNthCalledWith(2, 200, 300, 150, 60);
    });
});
