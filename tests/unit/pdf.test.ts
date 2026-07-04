import { exportIndividualPDFs } from '../../src/lib/pdf';
import { cleanDidacticalMarks, formatMarkdownTableForPDF } from '../../src/lib/pdf-utils';
import { toSafeString } from '../../src/lib/validation';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import autoTable from 'jspdf-autotable';

// Redundant local mocks removed. Using global mocks from jest.setup.js. 🏮🛡️
jest.mock('../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false),
    isLocalInstance: jest.fn(() => false)
}));


describe('PDF Utils tests', () => {
    it('toSafeString should convert arrays to strings', () => {
        expect(toSafeString(['a', 'b'])).toBe('a\n\nb');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock browser globals
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
        
        const originalCreateElement = document.createElement.bind(document);
        jest.spyOn(document, 'createElement').mockImplementation((tag) => {
            if (tag === 'a') {
                const a = originalCreateElement('a');
                a.click = jest.fn();
                return a;
            }
            return originalCreateElement(tag);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const mockResults = [
        {
            studentName: 'Max Mustermann',
            analysis: {
                overallFeedback: 'Gut gemacht',
                tasks: [
                    { name: 'Aufgabe 1', feedback: 'Toll' }
                ]
            }
        }
    ];

    it('should generate PDFs and bundle them in a ZIP', async () => {
        await exportIndividualPDFs(mockResults);
        
        expect(jsPDF).toHaveBeenCalled();
        expect(JSZip).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should return early if results are empty', async () => {
        await exportIndividualPDFs([]);
        expect(jsPDF).not.toHaveBeenCalled();
    });

    describe('PDF Text and Table Formatting Helpers', () => {
        it('should keep didactical codes untouched and strip emojis', () => {
            const rawText = '[r] LOB: Toll gemacht! [f] TIPP: Fehler hier. [FF] Folgefehler.';
            const cleaned = cleanDidacticalMarks(rawText);
            expect(cleaned).toBe('[r] LOB: Toll gemacht! [f] TIPP: Fehler hier. [FF] Folgefehler.');
        });

        it('should replace system/gear tag and strip emojis', () => {
            const rawText = '[⚙️ AGS Engine - VLSM] Test';
            const cleaned = cleanDidacticalMarks(rawText);
            expect(cleaned).toBe('[System AGS Engine - VLSM] Test');
        });

        it('should format a markdown table as a structured bulleted list', () => {
            const rawTable = `[⚙️ AGS Engine - VLSM]
| Subnetz | Netz-ID | Maske | First |
|---|---|---|---|
| **Subnetz A** | 10.0.0.0 [r] | /24 [r] | 10.0.0.1 [r] |
| **Subnetz B** | 10.0.1.0 [f] | /24 [r] | - |`;

            const formatted = formatMarkdownTableForPDF(rawTable);
            expect(formatted).toContain('[System AGS Engine - VLSM]');
            expect(formatted).toContain('• Subnetz A:');
            expect(formatted).toContain('- Netz-ID: 10.0.0.0 [r]');
            expect(formatted).toContain('- Maske: /24 [r]');
            expect(formatted).toContain('• Subnetz B:');
            expect(formatted).toContain('- Netz-ID: 10.0.1.0 [f]');
            expect(formatted).not.toContain('- First: -'); // Omitted empty/dash cells
        });
    });

    describe('Regression: non-string fields from LLM response (arrays, etc.)', () => {
        it('should handle overallFeedback and task.feedback when they are arrays', async () => {
            const rawResults = [
                {
                    studentName: 'Max Mustermann',
                    analysis: {
                        overallFeedback: ['Erste Zeile des Feedbacks', 'Zweite Zeile des Feedbacks'] as any,
                        tasks: [
                            { 
                                name: 'Aufgabe 1', 
                                feedback: ['Schritt 1 OK', 'Schritt 2 unvollständig'] as any 
                            }
                        ]
                    }
                }
            ];

            await expect(exportIndividualPDFs(rawResults)).resolves.not.toThrow();
            expect(jsPDF).toHaveBeenCalled();
            expect(JSZip).toHaveBeenCalled();
        });
    });

    describe('Points Display Modes', () => {
        const mockResults = [
            {
                studentName: 'Max Mustermann',
                analysis: {
                    overallFeedback: 'Gut gemacht',
                    tasks: [
                        { name: 'Aufgabe 1a', pointsObtained: 3, maxPoints: 4, feedback: 'Teil A' },
                        { name: 'Aufgabe 1b', pointsObtained: 5, maxPoints: 6, feedback: 'Teil B' },
                        { name: 'Aufgabe 2', pointsObtained: 10, maxPoints: 10, feedback: 'Teil C' }
                    ]
                }
            }
        ];

        it('should generate PDF table without points in "none" mode', async () => {
            await exportIndividualPDFs(mockResults, 'none');
            expect(autoTable).toHaveBeenLastCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    body: [
                        ['Aufgabe 1a', 'Teil A'],
                        ['Aufgabe 1b', 'Teil B'],
                        ['Aufgabe 2', 'Teil C']
                    ]
                })
            );
        });

        it('should generate PDF table with parent sum points in "total" mode', async () => {
            await exportIndividualPDFs(mockResults, 'total');
            expect(autoTable).toHaveBeenLastCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    body: [
                        ['Aufgabe 1a', 'Teil A'],
                        ['Aufgabe 1b', 'Teil B'],
                        ['Gesamt Aufgabe 1 (8 / 10 P.)', ''],
                        ['Aufgabe 2 (10 / 10 P.)', 'Teil C']
                    ]
                })
            );
        });

        it('should generate PDF table with subtask and parent sum points in "detailed" mode', async () => {
            await exportIndividualPDFs(mockResults, 'detailed');
            expect(autoTable).toHaveBeenLastCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    body: [
                        ['Aufgabe 1a (3 / 4 P.)', 'Teil A'],
                        ['Aufgabe 1b (5 / 6 P.)', 'Teil B'],
                        ['Gesamt Aufgabe 1 (8 / 10 P.)', ''],
                        ['Aufgabe 2 (10 / 10 P.)', 'Teil C']
                    ]
                })
            );
        });
    });
});
