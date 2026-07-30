import { renderHook, act } from '@testing-library/react';
import { usePromptProfiles } from '../../../src/hooks/usePromptProfiles';
import { AppSettings } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false),
    isLocalInstance: jest.fn(() => false)
}));

const mockApiClientGet = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => []
});

jest.mock('../../../src/lib/api-client', () => ({
    apiClient: {
        get: (...args: any[]) => mockApiClientGet(...args),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
    }
}));

describe('usePromptProfiles - Industrial Hook Verification', () => {
    const mockOnSave = jest.fn();
    const mockOnClose = jest.fn();
    const defaultSettings: AppSettings = {
        provider: 'mistral',
        mistralKey: 'test-key',
        correctionPrompt: 'Standard System Prompt'
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it('should initialize with correct default state and settings prompt', () => {
        const { result } = renderHook(() =>
            usePromptProfiles(defaultSettings, mockOnSave, mockOnClose, 'Standard')
        );

        expect(result.current.selectedProfile).toBe('Standard');
        expect(result.current.correctionPrompt).toBe('Standard System Prompt');
        expect(result.current.isDirty).toBe(false);
        expect(result.current.isCreatingNew).toBe(false);
    });

    it('should mark dirty state when correctionPrompt changes from saved state', () => {
        const { result } = renderHook(() =>
            usePromptProfiles(defaultSettings, mockOnSave, mockOnClose)
        );

        act(() => {
            result.current.setCorrectionPrompt('Custom Modified System Prompt');
        });

        expect(result.current.correctionPrompt).toBe('Custom Modified System Prompt');
        expect(result.current.isDirty).toBe(true);
    });

    it('should support switching selected profile and creation mode', () => {
        const { result } = renderHook(() =>
            usePromptProfiles(defaultSettings, mockOnSave, mockOnClose)
        );

        act(() => {
            result.current.setSelectedProfile('Mathematik Spezial');
        });

        expect(result.current.selectedProfile).toBe('Mathematik Spezial');

        act(() => {
            result.current.setIsCreatingNew(true);
            result.current.setNewProfileName('Neues Profil 2026');
        });

        expect(result.current.isCreatingNew).toBe(true);
        expect(result.current.newProfileName).toBe('Neues Profil 2026');
    });
});
