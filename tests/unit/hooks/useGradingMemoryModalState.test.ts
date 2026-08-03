import { renderHook, act } from '@testing-library/react';
import { useGradingMemoryModalState } from '../../../src/hooks/useGradingMemoryModalState';

const STABLE_MEMORIES = [
    {
        id: 'mem-1',
        name: 'Test Memory Profile',
        cases: [
            {
                id: 'case-1',
                taskName: 'Aufgabe 1',
                studentText: 'Schülerantwort 1',
                expectedCorrection: {
                    pointsObtained: 8,
                    maxPoints: 10,
                    correctionNotes: 'Guter Ansatz',
                    feedback: 'Sehr gut'
                }
            }
        ]
    }
];

const STABLE_HOOK_MEMORIES = {
    memories: STABLE_MEMORIES,
    loading: false,
    activeMemoryId: 'mem-1',
    selectMemory: jest.fn(),
    deleteMemory: jest.fn(),
    addLocalMemory: jest.fn(),
    refreshMemories: jest.fn(),
    getActiveMemory: jest.fn()
};

// Mock dependencies
jest.mock('../../../src/hooks/useGradingMemories', () => ({
    useGradingMemories: jest.fn(() => STABLE_HOOK_MEMORIES)
}));

jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false)
}));

const mockApiPost = jest.fn();
jest.mock('../../../src/lib/api-client', () => ({
    apiClient: {
        post: (...args: unknown[]) => mockApiPost(...args)
    }
}));

/** Antwort des Student-Simulators mit frei wählbarem Aufgabennamen. */
const simulatorResponse = (taskName?: string) => ({
    ok: true,
    json: async () => ({
        studentAnswers: [
            {
                character: 'TYPO',
                text: 'Eine simulierte Schülerantwort.',
                taskName,
                pointsObtained: 6,
                recommendedNotes: 'Kleiner Flüchtigkeitsfehler.',
                recommendedFeedback: 'Achte auf die Schreibweise.'
            }
        ]
    })
});

const STABLE_TASKS_LAYOUT = [
    { name: 'Aufgabe 1', maxPoints: 10 }
];

describe('useGradingMemoryModalState - Industrial Hook Verification', () => {
    const mockOnClose = jest.fn();
    const mockOnActiveMemoryChange = jest.fn();

    const defaultProps = {
        isOpen: true,
        onClose: mockOnClose,
        modelSolution: 'Standard Musterlösung für Testaufgabe',
        tasksLayout: STABLE_TASKS_LAYOUT,
        onActiveMemoryChange: mockOnActiveMemoryChange
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with correct default state when opened', () => {
        const { result } = renderHook(() => useGradingMemoryModalState(defaultProps));

        expect(result.current.step).toBe('start');
        expect(result.current.profileName).toContain('Erfahrungsschatz');
        expect(result.current.isSaving).toBe(false);
        expect(result.current.isGenerating).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.memories.length).toBeGreaterThan(0);
    });

    it('should update step deterministically within act() blocks', () => {
        const { result } = renderHook(() => useGradingMemoryModalState(defaultProps));

        act(() => {
            result.current.setStep('calibrate');
        });
        expect(result.current.step).toBe('calibrate');

        act(() => {
            result.current.setStep('saved');
        });
        expect(result.current.step).toBe('saved');
    });

    it('should update profileName when user types in the input field', () => {
        const { result } = renderHook(() => useGradingMemoryModalState(defaultProps));

        act(() => {
            result.current.setProfileName('Elektrotechnik Klausur 2026');
        });

        expect(result.current.profileName).toBe('Elektrotechnik Klausur 2026');
    });

    it('should handle selected tasks toggle within act()', () => {
        const { result } = renderHook(() => useGradingMemoryModalState(defaultProps));

        act(() => {
            result.current.setSelectedTasks(['Aufgabe 1', 'Aufgabe 2']);
        });

        expect(result.current.selectedTasks).toEqual(['Aufgabe 1', 'Aufgabe 2']);
    });

    it('should propagate active memory name change on load', () => {
        renderHook(() => useGradingMemoryModalState(defaultProps));

        expect(mockOnActiveMemoryChange).toHaveBeenCalledWith('Test Memory Profile');
    });

    describe('Task assignment of simulated cases', () => {
        const generateWith = async (taskName?: string) => {
            mockApiPost.mockResolvedValueOnce(simulatorResponse(taskName));
            const { result } = renderHook(() => useGradingMemoryModalState(defaultProps));

            act(() => {
                result.current.setSelectedTasks(['Aufgabe 1']);
            });
            await act(async () => {
                await result.current.handleGenerate();
            });

            const uid = result.current.syntheticAnswers[0].uid;
            return result.current.calibrations[uid];
        };

        it('adopts the canonical layout name when the simulator matches a task', async () => {
            const cal = await generateWith('Aufgabe 1');

            expect(cal.taskName).toBe('Aufgabe 1');
            expect(cal.maxPoints).toBe(10);
        });

        it('leaves the assignment empty instead of inventing a task name', async () => {
            const cal = await generateWith('Teilaufgabe C zur Netzplanung');

            expect(cal.taskName).toBe('');
        });

        it('leaves the assignment empty when the simulator omits the task name', async () => {
            const cal = await generateWith(undefined);

            expect(cal.taskName).toBe('');
        });
    });
});
