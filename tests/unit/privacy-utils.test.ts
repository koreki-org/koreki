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
