import { exportTeacherList, exportStudentSummaries, exportIndividualFeedbacks, exportPerformanceExcel } from '../../src/lib/excel';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

// Redundant local mocks removed. Using global mocks from jest.setup.js. 🏮🛡️

describe('Excel Utils tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock browser globals
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
        
        document.createElement = jest.fn().mockImplementation((tag) => {
            if (tag === 'a') {
                return {
                    href: '',
                    download: '',
                    click: jest.fn(),
                };
            }
            return {};
        }) as any;
        document.body.appendChild = jest.fn();
        document.body.removeChild = jest.fn();
    });

    const mockResults = [
        {
            studentName: 'Max Mustermann',
            grade: '2,0',
            analysis: {
                overallFeedback: 'Gut gemacht',
                overallMatchPercentage: 80,
                tasks: [
                    { name: 'Aufgabe 1', pointsObtained: 8, maxPoints: 10, feedback: 'Toll' }
                ]
            }
        }
    ];

    describe('exportTeacherList', () => {
        it('should create a workbook and trigger download', () => {
            exportTeacherList(mockResults);
            expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
            expect(XLSX.utils.book_new).toHaveBeenCalled();
            expect(document.createElement).toHaveBeenCalledWith('a');
        });

        it('should correctly aggregate parent tasks (e.g. 1a, 1b -> 1)', () => {
            const multiResults = [{
                studentName: 'Max',
                analysis: {
                    tasks: [
                        { name: 'Aufgabe 1a', pointsObtained: 5, maxPoints: 10 },
                        { name: 'Aufgabe 1b', pointsObtained: 5, maxPoints: 10 }
                    ]
                }
            }];
            exportTeacherList(multiResults);
            const callData = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0];
            // Should contain a column for 'Aufgabe 1 (20 P)'
            expect(Object.keys(callData[0])).toContain('Aufgabe 1 (20 P)');
            expect(callData[0]['Aufgabe 1 (20 P)']).toBe(10); // 5 + 5
        });

        it('should handle numeric parent names (e.g. 1.1 -> 1)', () => {
            const numericResults = [{
                studentName: 'Leo',
                analysis: {
                    tasks: [{ name: '1.1', pointsObtained: 2, maxPoints: 5 }]
                }
            }];
            exportTeacherList(numericResults);
            const callData = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0];
            expect(Object.keys(callData[0])).toContain('1 (5 P)');
        });

        it('should return early if results are empty', () => {
            exportTeacherList([]);
            expect(XLSX.utils.book_new).not.toHaveBeenCalled();
        });
    });

    describe('exportStudentSummaries', () => {
        it('should handle students with no tasks', () => {
            const hollowResults = [{
                studentName: 'Hohlkopf',
                analysis: { tasks: [], overallFeedback: 'Nix' }
            }];
            exportStudentSummaries(hollowResults);
            const callData = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0][0];
            expect(callData[0]['Aufgabe']).toBe('-');
        });
    });

    describe('exportIndividualFeedbacks', () => {
        it('should create a ZIP file and trigger download', async () => {
            await exportIndividualFeedbacks(mockResults);
            expect(JSZip).toHaveBeenCalled();
            expect(document.createElement).toHaveBeenCalledWith('a');
        });
    });

    describe('exportPerformanceExcel', () => {
        it('should correctly format Qwen/Pro provider metadata in Excel header when high accuracy override is active', async () => {
            const mockBatchFiles: any[] = [
                {
                    name: 'Schüler 1',
                    status: 'done',
                    inferenceDuration: 2500,
                    fileText: 'Beispieltext mit fünf Wörtern',
                    result: { tasks: [{ name: 'A1' }] }
                }
            ];

            await exportPerformanceExcel(mockBatchFiles, {
                mode: 'saas',
                provider: 'openai-compatible',
                model: 'Qwen 3.6 (Pro)',
                isPure: false
            });

            expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
            const rows = (XLSX.utils.aoa_to_sheet as jest.Mock).mock.calls[0][0];
            expect(rows[1]).toEqual(['Deployment-Modus:', 'Saas']);
            expect(rows[2]).toEqual(['KI-Quelle:', 'SaaS API (Qwen/Pro)']);
            expect(rows[3]).toEqual(['Verwendetes Modell:', 'Qwen 3.6 (Pro)']);
        });
    });
});
