import { exportIndividualPDFs } from '../../src/lib/pdf';
import { cleanDidacticalMarks, formatMarkdownTableForPDF } from '../../src/lib/pdf-utils';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

// Redundant local mocks removed. Using global mocks from jest.setup.js. 🏮🛡️
jest.mock('../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false),
    isLocalInstance: jest.fn(() => false)
}));


describe('PDF Utils tests', () => {

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
});
