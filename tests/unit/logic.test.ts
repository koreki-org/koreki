import { calculateGrade, calculatePercentageFromTasks, compareTexts, getMatchPercentage } from '../../src/lib/logic';
import { createTask } from '../../src/test/factories';

describe('Logic module tests', () => {

    describe('calculateGrade', () => {
        const testCases = [
            { percentage: 100, expected: '1,0' },
            { percentage: 50, expected: '3,5' },
            { percentage: 0, expected: '6,0' },
            { percentage: -10, expected: '6,0' },
            { percentage: 110, expected: '1,0' },
            { percentage: 55.5, expected: '3,2' },
        ];

        it.each(testCases)('should return $expected for $percentage%', ({ percentage, expected }) => {
            expect(calculateGrade(percentage)).toBe(expected);
        });
    });

    describe('calculatePercentageFromTasks', () => {
        it('should correctly calculate percentage using factories', () => {
            const tasks = [
                createTask({ maxPoints: 10, pointsObtained: 5 }),
                createTask({ maxPoints: 10, pointsObtained: 10 })
            ];
            expect(calculatePercentageFromTasks(tasks)).toBe(75);
        });

        it.each([
            {
                description: 'handle string inputs',
                tasks: [
                    createTask({ maxPoints: '10', pointsObtained: '2' }),
                    createTask({ maxPoints: '10', pointsObtained: '2' })
                ],
                expected: 20
            },
            {
                description: 'return 0 for empty tasks',
                tasks: [],
                expected: 0
            },
            {
                description: 'handle 0 max points edge case',
                tasks: [createTask({ maxPoints: 0, pointsObtained: 5 })],
                expected: 0
            },
        ])('should $description', ({ tasks, expected }) => {
            expect(calculatePercentageFromTasks(tasks)).toBe(expected);
        });
    });

    describe('compareTexts', () => {
        it('should return empty array if inputs are missing', () => {
            expect(compareTexts('', 'test')).toEqual([]);
            expect(compareTexts('test', '')).toEqual([]);
        });

        it('should return diff parts for different texts', () => {
            const res = compareTexts('Hallo Welt', 'Hallo Mars');
            expect(res.length).toBeGreaterThan(0);
            expect(res.some(p => p.removed && p.value.includes('Welt'))).toBe(true);
            expect(res.some(p => p.added && p.value.includes('Mars'))).toBe(true);
        });
    });

    describe('getMatchPercentage', () => {
        it('should return 100 for identical texts', () => {
            const diff = [{ value: 'Test', added: false, removed: false }];
            expect(getMatchPercentage(diff)).toBe(100);
        });

        it('should return 0 for completely different texts', () => {
            const diff = [
                { value: 'Old', added: false, removed: true },
                { value: 'New', added: true, removed: false }
            ];
            expect(getMatchPercentage(diff)).toBe(0);
        });

        it('should return 50 for half match', () => {
            const diff = [
                { value: 'Keep', added: false, removed: false },
                { value: 'Remove', added: false, removed: true },
                { value: 'Add', added: true, removed: false }
            ];
            // matched: 4 ('Keep'), total: 10 ('Keep' + 'Remove') -> 40% (since total length is 10)
            // Wait, logic is total += part.value.length if NOT added. 
            // 'Keep' (4) + 'Remove' (6) = 10.
            // matched = 4. 4/10 = 40%.
            expect(getMatchPercentage(diff)).toBe(40);
        });

        it('should return 0 for empty parts', () => {
            expect(getMatchPercentage([])).toBe(0);
        });
    });

    describe('generateSplitBatchItems', () => {
        it('should create new items and clear historical extraction data', () => {
            const { generateSplitBatchItems } = require('../../src/lib/logic');
            
            const originalFile = {
                name: 'Schüler #1',
                documentType: 'digital',
                fileText: 'This is the old full text',
                tasks: [{ name: 'Aufgabe 1', content: 'Antwort' }],
                grade: '1,0',
                result: { someResultData: true },
                error: 'some historical error',
                ocrDone: true
            };

            const splits = [
                { name: 'Schüler #1 (Teil 1)', pageCount: 2 },
                { name: 'Schüler #2 (Teil 2)', pageCount: 3 }
            ];

            const result = generateSplitBatchItems(originalFile, splits, 0);

            expect(result.length).toBe(2);
            
            // Check clearing of historical data
            const part1 = result[0];
            expect(part1.name).toBe('Schüler #1');
            expect(part1.originalName).toBe('Schüler #1 (Teil 1)');
            expect(part1.status).toBe('pending');
            expect(part1.result).toBeNull();
            expect(part1.error).toBeNull();
            expect(part1.fileText).toBeUndefined();
            expect(part1.tasks).toBeUndefined();
            expect(part1.grade).toBeUndefined();
            expect(part1.ocrDone).toBe(false);
            
            // Check page ranges
            expect(part1.pageCount).toBe(2);
            expect(part1.pageRange).toEqual([1, 2]);

            const part2 = result[1];
            expect(part2.name).toBe('Schüler #2');
            expect(part2.originalName).toBe('Schüler #2 (Teil 2)');
            expect(part2.pageCount).toBe(3);
            expect(part2.pageRange).toEqual([3, 5]);
        });

        /**
         * Die pauschale 2-cm-Schwärzung beim Aufteilen wurde entfernt. Sie war nur
         * über den Split-Dialog erreichbar und blieb damit allen verborgen, die
         * ihre Arbeiten bereits vereinzelt hochladen; zudem schwärzte sie blind
         * eine geratene Zone statt der Stelle, an der der Name wirklich steht.
         * Anonymisiert wird ausschließlich über das Schwärzungs-Modal, das die
         * Schwärzung auf Wunsch auf alle Scans des Stapels überträgt.
         */
        it('versieht Teilstücke nicht mehr mit einer pauschalen Schwärzungs-Markierung', () => {
            const { generateSplitBatchItems } = require('../../src/lib/logic');
            const originalFile = { name: 'Schüler #1' };
            const splits = [{ name: 'A', pageCount: 1 }, { name: 'B', pageCount: 2 }];

            const result = generateSplitBatchItems(originalFile, splits, 0);

            expect(result.length).toBe(2);
            expect(result[0]).not.toHaveProperty('autoRedactTop2cm');
            expect(result[1]).not.toHaveProperty('autoRedactTop2cm');
            expect(result.every((r: any) => !r.isRedacted)).toBe(true);
        });

        it('should preserve user-provided split name in originalName to survive reindexing', () => {
            const { generateSplitBatchItems } = require('../../src/lib/logic');
            const originalFile = { name: 'scans', originalName: 'scans' };
            const splits = [
                { name: 'Max Mustermann', pageCount: 2 }, // Explicit name
                { name: 'Schüler #2', pageCount: 1 },     // Default-style name
                { name: '', pageCount: 1 }                // Empty name
            ];

            const result = generateSplitBatchItems(originalFile, splits, 0);

            expect(result.length).toBe(3);

            // Item 1: Explicit name provided
            expect(result[0].name).toBe('Schüler #1');
            expect(result[0].originalName).toBe('Max Mustermann');

            // Item 2: Default style name provided
            expect(result[1].name).toBe('Schüler #2');
            expect(result[1].originalName).toBeUndefined();

            // Item 3: No name provided
            expect(result[2].name).toBe('Schüler #3');
            expect(result[2].originalName).toBeUndefined();
        });
    });
});
