import fs from 'fs';
import path from 'path';
import { getLegalDocument } from '../../src/lib/legal';

jest.mock('fs');

describe('Legal Library Unit Tests (Layer 1)', () => {
    const mockFiles = [
        'avv_v1.0.md',
        'avv_v1.1.md',
        'tom_v1.0.md',
        'betriebsanleitung_v1.0.md',
        'agb_v1.0.md',
        'other_file.txt'
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
        (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
            if (filePath.includes('avv_v1.1.md')) return '# AVV v1.1 Content';
            if (filePath.includes('avv_v1.0.md')) return '# AVV v1.0 Content';
            if (filePath.includes('tom_v1.0.md')) return '# TOM Content';
            return 'Generic Content';
        });
    });

    describe('getLegalDocument', () => {
        it('should return the latest version when no version is specified', () => {
            const doc = getLegalDocument('avv');
            expect(doc).not.toBeNull();
            expect(doc?.version).toBe('1.1');
            expect(doc?.content).toBe('# AVV v1.1 Content');
        });

        it('should return a specific version when requested', () => {
            const doc = getLegalDocument('avv', '1.0');
            expect(doc).not.toBeNull();
            expect(doc?.version).toBe('1.0');
            expect(doc?.content).toBe('# AVV v1.0 Content');
        });

        it('should fallback to latest version if specifically requested version is missing', () => {
            const doc = getLegalDocument('avv', '2.0'); // 2.0 does not exist
            expect(doc).not.toBeNull();
            expect(doc?.version).toBe('1.1'); // Fallback to latest
        });

        it('should return null if the document type does not exist', () => {
            const doc = getLegalDocument('avv' as any, null); // Just for testing
            (fs.readdirSync as jest.Mock).mockReturnValue([]);
            const missingDoc = getLegalDocument('avv');
            expect(missingDoc).toBeNull();
        });

        it('should correctly handle SemVer sorting (e.g. 1.10 > 1.2)', () => {
             const complexFiles = [
                'avv_v1.2.md',
                'avv_v1.10.md',
                'avv_v1.1.md'
            ];
            (fs.readdirSync as jest.Mock).mockReturnValue(complexFiles);
            
            const doc = getLegalDocument('avv');
            expect(doc?.version).toBe('1.10');
        });

        it('should generate a SHA-256 hash of the content', () => {
            const doc = getLegalDocument('avv', '1.1');
            expect(doc?.hash).toBeDefined();
            expect(doc?.hash.length).toBe(64); // SHA-256 length in hex
            expect(typeof doc?.hash).toBe('string');
        });
    });
});
