import { exportIndividualPDFs } from '../../src/lib/pdf';
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
});
