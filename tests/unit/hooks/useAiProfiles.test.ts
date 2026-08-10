import { renderHook, act, waitFor } from '@testing-library/react';
import { useAiProfiles, STANDARD_AI_PROFILE, MATH_AI_PROFILE } from '../../../src/hooks/useAiProfiles';
import { AppSettings } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(() => false)
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

describe('useAiProfiles - Industrial Hook Verification', () => {
    const mockOnSave = jest.fn();
    const mockOnClose = jest.fn();
    const defaultSettings: AppSettings = {
        provider: 'mistral',
        mistralKey: 'test-key'
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    describe('Standard Profiles Constants', () => {
        it('should define valid system AI profiles with strict parameters', () => {
            expect(STANDARD_AI_PROFILE.isSystem).toBe(true);
            expect(STANDARD_AI_PROFILE.name).toBe('Standard');

            expect(MATH_AI_PROFILE.isSystem).toBe(true);
            expect(MATH_AI_PROFILE.name).toBe('Logik & Mathe');
            expect(MATH_AI_PROFILE.temperature).toBe(0.0);
        });
    });

    describe('useAiProfiles Hook Behavior', () => {
        it('should initialize with correct default state', async () => {
            const { result } = renderHook(() =>
                useAiProfiles(defaultSettings, mockOnSave, mockOnClose)
            );

            // Die Auswahl steht erst, wenn die Profile geladen sind — sie wird
            // aus dem Verweis aufgeloest statt als Name vorbelegt.
            await waitFor(() => expect(result.current.selectedProfileId).toBe('system-standard'));
            expect(result.current.selectedProfile).toBe('Standard');
            expect(result.current.isCreatingNew).toBe(false);
            expect(result.current.saving).toBe(false);
        });

        it('should update selectedProfile and allow creation mode', async () => {
            const { result } = renderHook(() =>
                useAiProfiles(defaultSettings, mockOnSave, mockOnClose)
            );
            await waitFor(() => expect(result.current.profiles.length).toBeGreaterThan(1));

            // Auswahl ueber die Kennung statt ueber den Namen.
            act(() => {
                result.current.handleSelectProfile(MATH_AI_PROFILE);
            });

            expect(result.current.selectedProfileId).toBe('system-math');
            expect(result.current.selectedProfile).toBe('Logik & Mathe');

            act(() => {
                result.current.setIsCreatingNew(true);
                result.current.setNewProfileName('Mein Spezial-KI-Profil');
            });

            expect(result.current.isCreatingNew).toBe(true);
            expect(result.current.newProfileName).toBe('Mein Spezial-KI-Profil');
        });
    });
});
