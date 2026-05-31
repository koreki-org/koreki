// Migrating moodle-import.test.ts from Vitest to Jest to align with the repository's test framework standard. Removed vitest imports as Jest provides these as globals.
import * as XLSX from 'xlsx';

// Mocking the FileReader for Node environment
class MockFileReader {
    onload: (e: any) => void = () => {};
    readAsArrayBuffer(blob: Blob) {
        // We simulate the read by manually calling onload with a buffer
        // In actual tests, we'll bypass FileReader and test the logic or use a more sophisticated mock
    }
}

describe('Moodle Parser Robustness (@principal_architect)', () => {
    // We test the column detection logic conceptually
    it('should detect various name and response patterns', () => {
        const rowEn = {
            'Last name': 'Doe',
            'First name': 'John',
            'Response 1': 'Hello World',
            'Response 2': 'Test answer'
        };

        const rowDe = {
            'Nachname': 'Mustermann',
            'Vorname': 'Max',
            'Antwort 1': 'Hallo Welt',
            'F 2 /3,00': 'Eine lange Antwort'
        };

        const rowMixed = {
            'Surname': 'Smith',
            'First name': 'Jane',
            'Frage 1': 'Digital answer',
            'Response 2': 'Another one'
        };

        const responsePattern = /^(Response|Antwort|Frage|F\s*\d+)/i;

        // Test English
        expect(rowEn['Last name']).toBe('Doe');
        expect(Object.keys(rowEn).filter(k => responsePattern.test(k))).toHaveLength(2);

        // Test German
        expect(rowDe['Nachname']).toBe('Mustermann');
        expect(Object.keys(rowDe).filter(k => responsePattern.test(k))).toHaveLength(2);
        
        // Test Fxy pattern
        expect(responsePattern.test('F 2 /3,00')).toBe(true);
        expect(responsePattern.test('F1')).toBe(true);
    });

    it('should distinguish between text and points', () => {
        const valStrText = "Das ist eine lange Antwort.";
        const valStrPoint = "2,50";
        const valStrSmallNum = "12";

        const isNumeric = (val: string) => /^-?\d+([.,]\d+)?$/.test(val);

        expect(isNumeric(valStrText)).toBe(false);
        expect(isNumeric(valStrPoint)).toBe(true);
        expect(isNumeric(valStrSmallNum)).toBe(true);

        // Our heuristic: length < 5 AND numeric -> likely a point
        const looksLikePoint = (val: string) => isNumeric(val) && val.length < 5;
        
        expect(looksLikePoint(valStrPoint)).toBe(true);
        expect(looksLikePoint(valStrSmallNum)).toBe(true);
        expect(looksLikePoint(valStrText)).toBe(false);
    });
});
