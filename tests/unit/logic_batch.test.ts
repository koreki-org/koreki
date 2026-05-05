import { reindexBatchFiles } from '../../src/lib/logic';

describe('Logic/Batch Utils', () => {
    it('should re-index an array of files correctly', () => {
        const input = [
            { name: 'Old Student 1', status: 'pending' },
            { name: 'Some Other Name', status: 'done' }
        ];
        
        const result = reindexBatchFiles(input);
        
        expect(result[0].name).toBe('Schüler #1');
        expect(result[1].name).toBe('Schüler #2');
        expect(result[0].status).toBe('pending');
        expect(result[1].status).toBe('done');
    });

    it('should handle empty or null input gracefully', () => {
        expect(reindexBatchFiles([])).toEqual([]);
        expect(reindexBatchFiles(null as any)).toEqual([]);
    });

    it('should preserve other properties during re-indexing', () => {
        const input = [{ name: 'A', id: '123', value: 42 }];
        const result = reindexBatchFiles(input);
        expect(result[0].id).toBe('123');
        expect(result[0].value).toBe(42);
    });
});
