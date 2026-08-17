import { renderHook, act, waitFor } from '@testing-library/react';
import { useSkillProfiles } from '../../../src/hooks/useSkillProfiles';
import { sortObjectKeys, deduplicateCustomSkills } from '../../../src/lib/skills/skill-dedup';
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
            // `unknown` als Rueckgabe ist Absicht: die Funktion sortiert
            // beliebige Strukturen und kann ueber deren Form nichts zusichern.
            const sorted = sortObjectKeys(unordered) as { m: Record<string, unknown> };

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
        /** Zwei gleichnamige Sets — vor dem Umbau ununterscheidbar. */
        const zweiGleichnamige = [
            { id: 'system-mint-standard', name: 'MINT Standard (Allgemein)', activeSkillIds: ['a'], isSystem: true },
            { id: 'local-skill-1', name: 'FISI-Skills', activeSkillIds: ['b'], isSystem: false },
            { id: 'local-skill-2', name: 'FISI-Skills', activeSkillIds: ['c'], isSystem: false }
        ];

        const mitProfilen = (profile: any[]) => {
            mockApiClientGet.mockResolvedValue({ ok: true, json: async () => profile });
        };

        it('should initialize with correct default state', async () => {
            mitProfilen(zweiGleichnamige);

            const { result } = renderHook(() =>
                useSkillProfiles(defaultSettings, mockOnSave, mockOnClose, 'system-mint-standard')
            );

            await waitFor(() => expect(result.current.selectedProfileId).toBe('system-mint-standard'));
            expect(result.current.selectedProfile).toBe('MINT Standard (Allgemein)');
            expect(result.current.isCreatingNew).toBe(false);
            expect(result.current.saving).toBe(false);
        });

        /**
         * Altbestand: Vor den festen Kennungen wurde der NAME als aktive Auswahl
         * gespeichert. Der Hook muss ihn weiterhin annehmen — und intern sofort
         * auf die Kennung umstellen.
         */
        it('löst einen gespeicherten Namen auf die Kennung auf', async () => {
            mitProfilen(zweiGleichnamige);

            const { result } = renderHook(() =>
                useSkillProfiles(defaultSettings, mockOnSave, mockOnClose, 'MINT Standard (Allgemein)')
            );

            await waitFor(() => expect(result.current.selectedProfileId).toBe('system-mint-standard'));
        });

        /**
         * 🏮 Der Kern des Umbaus: Zwei gleichnamige Sets sind ueber ihre Kennung
         * unterscheidbar. Zuvor haette die Auswahl beide getroffen — die
         * Seitenleiste markierte beide, und ein Speichern landete beim ersten.
         */
        it('unterscheidet gleichnamige Sets über die Kennung', async () => {
            mitProfilen(zweiGleichnamige);

            const { result } = renderHook(() =>
                useSkillProfiles(defaultSettings, mockOnSave, mockOnClose, 'system-mint-standard')
            );
            await waitFor(() => expect(result.current.profiles.length).toBe(3));

            act(() => {
                result.current.handleSelectProfile(zweiGleichnamige[2]);
            });

            expect(result.current.selectedProfileId).toBe('local-skill-2');
            expect(result.current.selectedProfile).toBe('FISI-Skills');
            expect(result.current.activeSkillIds).toEqual(['c']);
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
