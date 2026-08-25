import { renderHook, act, waitFor } from '@testing-library/react';
import { useAiProfiles, STANDARD_AI_PROFILE, MATH_AI_PROFILE } from '../../../src/hooks/useAiProfiles';
import { AppSettings } from '../../../src/types';
import { TEMPERATURE_MINIMUM } from '@/lib/ai/temperature-guidance';
import { askConfirmation, confirmOverwrite } from '@/lib/confirm-dialog';

jest.mock('@/lib/confirm-dialog', () => ({
    askConfirmation: jest.fn().mockResolvedValue(true),
    confirmOverwrite: jest.fn().mockResolvedValue(true)
}));

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

    /**
     * REGRESSION: Die Namensregel galt bei Skill-Sets, Experten-Profilen und
     * Erfahrungsschatz, fehlte aber ausgerechnet hier. Im Desktop-Modus
     * entstand dadurch ungefragt ein zweites gleichnamiges KI-Profil.
     */
    describe('Anlegen unter vergebenem Namen (Desktop)', () => {
        const { isDesktopTarget } = jest.requireMock('../../../src/lib/env-context');

        const bestehendes = {
            id: 'local-ai-1',
            name: 'Mein Tuning',
            temperature: 0.9,
            topP: 0.9,
            maxTokens: 1000,
            presencePenalty: 0,
            enableThinking: true,
            visionTemperature: 0,
            visionTopP: 0.8,
            visionMaxTokens: 4000,
            visionPresencePenalty: 0,
            isSystem: false
        };

        beforeEach(() => {
            (isDesktopTarget as jest.Mock).mockReturnValue(true);
            localStorage.setItem('koreki_local_ai_profiles', JSON.stringify([bestehendes]));
        });

        afterEach(() => {
            (isDesktopTarget as jest.Mock).mockReturnValue(false);
            jest.restoreAllMocks();
        });

        const anlegenAls = async (name: string) => {
            const { result } = renderHook(() =>
                useAiProfiles(defaultSettings, mockOnSave, mockOnClose)
            );
            await waitFor(() => expect(result.current.profiles.length).toBe(3));

            act(() => {
                result.current.handleStartNew();
                result.current.setNewProfileName(name);
            });
            await act(async () => {
                await result.current.handleSaveProfile();
            });

            return JSON.parse(localStorage.getItem('koreki_local_ai_profiles') || '[]');
        };

        it('legt bei abgelehnter Rückfrage keine Dublette an', async () => {
            (confirmOverwrite as jest.Mock).mockResolvedValue(false);

            const gespeichert = await anlegenAls('Mein Tuning');

            expect(gespeichert).toHaveLength(1);
            expect(gespeichert[0].temperature).toBe(0.9);
        });

        it('überschreibt den bestehenden Eintrag statt ihn zu verdoppeln', async () => {
            (confirmOverwrite as jest.Mock).mockResolvedValue(true);
            jest.spyOn(window, 'alert').mockImplementation(() => {});

            const gespeichert = await anlegenAls('  mein tuning ');

            expect(gespeichert).toHaveLength(1);
            expect(gespeichert[0].id).toBe('local-ai-1');
            // Die Standardwerte des leeren Formulars haben die alten ersetzt.
            expect(gespeichert[0].temperature).toBe(TEMPERATURE_MINIMUM);
        });

        it('weist den Namen einer System-Vorlage ab', async () => {
            const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

            const gespeichert = await anlegenAls('Logik & Mathe');

            expect(gespeichert).toHaveLength(1);
            expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('System-Vorlage'));
        });
    });
});
