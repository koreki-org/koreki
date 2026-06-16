import { generateSplitBatchItems } from '../../src/lib/logic';

describe('Logic/PDF Utils', () => {
    it('should generate split items with correct ranges and properties', () => {
        const original = { name: 'Raw PDF', documentType: 'scanned', files: [new File([], 'test.pdf')] };
        const splits = [
            { name: 'S1', pageCount: 2 },
            { name: 'S2', pageCount: 3 }
        ];
        
        const result = generateSplitBatchItems(original, splits, 0);
        
        expect(result.length).toBe(2);
        expect(result[0].name).toBe('Schüler #1');
        expect(result[0].originalName).toBe('S1');
        expect(result[1].name).toBe('Schüler #2');
        expect(result[1].originalName).toBe('S2');
        
        // Ranges
        expect(result[0].pageRange).toEqual([1, 2]);
        expect(result[1].pageRange).toEqual([3, 5]);
        
        // Status & Preserved props
        expect(result[0].status).toBe('pending');
        expect(result[0].documentType).toBe('scanned');
        expect(result[0].splitInfo.originalName).toBe('Raw PDF');
    });

    it('should use default names if not provided', () => {
        const original = { name: 'A' };
        const splits = [{ name: '', pageCount: 1 }];
        const result = generateSplitBatchItems(original, splits, 5);
        expect(result[0].name).toBe('Schüler #6');
    });

    it('should handle empty input', () => {
        expect(generateSplitBatchItems(null, [], 0)).toEqual([]);
    });
});
