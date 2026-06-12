import { renderHook, act } from '@testing-library/react';
import { useBatchActions } from '../../src/hooks/file-processor/useBatchActions';
import { createBatchFile, createTask } from '../../src/test/factories';
import { BatchFile } from '../../src/types';

describe('Data Integrity Integration (Layer 2)', () => {
    const mockSetBatchFiles = jest.fn();
    const mockSetPdfTypeQueue = jest.fn();
    const mockStartExtraction = jest.fn();

    const state = {
        batchFiles: [],
        setBatchFiles: mockSetBatchFiles,
        setPdfTypeQueue: mockSetPdfTypeQueue,
        setIsLoadingBatch: jest.fn(),
        setIsLoadingModel: jest.fn(),
        setTasksLayout: jest.fn(),
        setModelSolution: jest.fn(),
        setIsImportedSession: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should update result points independently of manual text edits to preserve structure', () => {
        // 1. Setup a file that has BOTH a result (points) AND manual content (structural markers)
        const initialTask = createTask({ name: 'Aufgabe 1', content: 'Studentischer Inhalt' });
        const initialFile = createBatchFile({
            status: 'done',
            tasks: [initialTask], // Manual content edits
            result: {
                tasks: [initialTask],
                overallMatchPercentage: 50,
            }
        });

        // Current state for the hook
        const currentState = { ...state, batchFiles: [initialFile] };

        const { result } = renderHook(() => useBatchActions(currentState, {}, { mistralKey: 'test-key' }, mockStartExtraction));

        // 2. Simulate updating points via onUpdateText (renamed locally or using tasksForResults)
        const updatedResultTasks = [{ ...initialTask, pointsObtained: 8 }];
        
        act(() => {
            result.current.onUpdateText(0, 'dummy text', updatedResultTasks);
        });

        // 3. Verify the state update function's logic
        expect(mockSetBatchFiles).toHaveBeenCalled();
        const updateFn = mockSetBatchFiles.mock.calls[0][0];
        const nextState = updateFn([initialFile]) as BatchFile[];
        const updatedItem = nextState[0];

        // ASSERTIONS FOR INDUSTRIAL STABILITY:
        // A. The results are updated
        expect(updatedItem.result?.tasks[0].pointsObtained).toBe(8);
        
        // B. THE SMOKING GUN: The 'tasks' field (manual content) remains pristine!
        // This ensures the left panel still sees 'Studentischer Inhalt' and correctly splits the tasks.
        expect(updatedItem.tasks).toEqual([initialTask]);
        expect(updatedItem.tasks?.[0].content).toBe('Studentischer Inhalt');
    });

    it('should update file text only when no result tasks are provided', () => {
        const initialFile = createBatchFile({ fileText: 'Alte Fassung' });
        const currentState = { ...state, batchFiles: [initialFile] };
        const { result } = renderHook(() => useBatchActions(currentState, {}, { mistralKey: 'test-key' }, mockStartExtraction));

        act(() => {
            result.current.onUpdateText(0, 'Neue Fassung');
        });

        const updateFn = mockSetBatchFiles.mock.calls[0][0];
        const nextState = updateFn([initialFile]) as BatchFile[];
        expect(nextState[0].fileText).toBe('Neue Fassung');
    });

    it('should import model solution and tasks layout when batchFiles is missing', async () => {
        const mockSetModelSolution = jest.fn();
        const mockSetTasksLayout = jest.fn();
        const mockSetBatchFilesLocal = jest.fn();
        const localState = {
            ...state,
            setBatchFiles: mockSetBatchFilesLocal,
        };

        const { result } = renderHook(() => useBatchActions(
            localState,
            {},
            { mistralKey: 'test-key' },
            mockStartExtraction,
            mockSetModelSolution,
            mockSetTasksLayout
        ));

        // Create a mock File containing only model solution and task layout
        const mockModelData = {
            version: '2.0',
            modelSolution: 'This is the model solution content',
            tasksLayout: [{ name: 'Task 1', maxPoints: 10 }]
        };
        const mockFile = {
            text: jest.fn().mockResolvedValue(JSON.stringify(mockModelData))
        } as unknown as File;

        await act(async () => {
            await result.current.handleKorekiImport(mockFile);
        });

        expect(mockSetModelSolution).toHaveBeenCalledWith('This is the model solution content');
        expect(mockSetTasksLayout).toHaveBeenCalledWith([{ name: 'Task 1', maxPoints: 10 }]);
        expect(mockSetBatchFilesLocal).toHaveBeenCalledWith([]);
    });
});
