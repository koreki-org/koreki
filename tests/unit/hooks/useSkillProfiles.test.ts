import { renderHook, act } from '@testing-library/react';
import { useSkillProfiles, sortObjectKeys, deduplicateCustomSkills } from '../../../src/hooks/useSkillProfiles';
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

describe('useSkillProfiles - Industrial Hook Verification', () => {
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

    describe('Helper Functions (Pure Logic)', () => {
        it('should sort object keys deterministically', () => {
            const unordered = { z: 1, a: 2, m: { y: 10, b: 20 } };
            const sorted = sortObjectKeys(unordered);

            expect(Object.keys(sorted)).toEqual(['a', 'm', 'z']);
            expect(Object.keys(sorted.m)).toEqual(['b', 'y']);
        });

        it('should deduplicate custom skills by normalized lower-case name', () => {
            const skills = {
                'id-1': { id: 'id-1', name: '  Mathe Formel  ' },
                'id-2': { id: 'id-2', name: 'mathe formel' },
                'id-3': { id: 'id-3', name: 'Physik Einheiten' }
            };

            const { cleaned, updatedActiveIds } = deduplicateCustomSkills(skills, ['id-2', 'id-3']);

            expect(Object.keys(cleaned)).toEqual(['id-1', 'id-3']);
            expect(updatedActiveIds).toEqual(['id-1', 'id-3']); // id-2 redirected to id-1
        });
    });

    describe('useSkillProfiles Hook Behavior', () => {
        it('should initialize with correct default state', () => {
            const { result } = renderHook(() => 
                useSkillProfiles(defaultSettings, mockOnSave, mockOnClose, 'MINT Standard (Allgemein)')
            );

            expect(result.current.selectedProfile).toBe('MINT Standard (Allgemein)');
            expect(result.current.isCreatingNew).toBe(false);
            expect(result.current.saving).toBe(false);
        });

        it('should update selectedProfile and toggling state', () => {
            const { result } = renderHook(() => 
                useSkillProfiles(defaultSettings, mockOnSave, mockOnClose)
            );

            act(() => {
                result.current.setSelectedProfile('Informatik Python');
            });

            expect(result.current.selectedProfile).toBe('Informatik Python');
        });

        it('should allow creating a new profile input mode', () => {
            const { result } = renderHook(() => 
                useSkillProfiles(defaultSettings, mockOnSave, mockOnClose)
            );

            act(() => {
                result.current.setIsCreatingNew(true);
                result.current.setNewProfileName('Chemie Labor 2026');
            });

            expect(result.current.isCreatingNew).toBe(true);
            expect(result.current.newProfileName).toBe('Chemie Labor 2026');
        });
    });
});
