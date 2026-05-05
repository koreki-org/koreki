import { renderHook, act } from '@testing-library/react';
import { useDashboardOrchestrator } from '../../../src/hooks/useDashboardOrchestrator';
import { useDashboardStore } from '../../../src/hooks/store/useDashboardStore';

// Mock the Dashboard Store 🏮
jest.mock('../../../src/hooks/store/useDashboardStore');
const mockedStore = useDashboardStore as jest.MockedFunction<typeof useDashboardStore>;

/**
 * Dashboard Orchestrator Integration Tests
 * 🏮🛡️🏛️
 * Validating the top-level compliance gating and modal triage logic.
 */

describe('useDashboardOrchestrator (Compliance & Triage Tests) 🏮🛡️', () => {
    
    const mockSetUserData = jest.fn();
    const mockFetchAiStatus = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        // Default Store State
        mockedStore.mockReturnValue({
            modelSolution: '',
            tasksLayout: [],
            aiSettings: { provider: 'mistral', mistralKey: '' },
            isHydrated: true,
            upgrading: false,
            pendingModelFile: null,
            setAiSettings: jest.fn(),
            setModelSolution: jest.fn(),
            setTasksLayout: jest.fn(),
            setUpgrading: jest.fn(),
            setPendingModelFile: jest.fn()
        } as any);
    });

    it('should trigger AVV Upload modal for unvalidated non-admin users', () => {
        const mockUser = {
            id: 'user-1',
            logtoId: 'lt-1',
            username: 'testuser',
            credits: 100,
            role: 'USER' as const,
            avvAccepted: false,
            appMode: 'STANDARD' as const
        };

        const { result } = renderHook(() => useDashboardOrchestrator(mockUser, false, mockFetchAiStatus));

        // Industrial Gating: User must see AVV Modal before proceeding
        expect(result.current.modals.showAVVUpload).toBe(true);
    });

    it('should bypass AVV Gating for ADMIN users', () => {
        const mockAdmin = {
            id: 'admin-1',
            logtoId: 'admin-1',
            username: 'admin',
            credits: 9999,
            role: 'ADMIN' as const,
            avvAccepted: false, // Even if not explicitly set
            appMode: 'STANDARD' as const
        };

        const { result } = renderHook(() => useDashboardOrchestrator(mockAdmin, false, mockFetchAiStatus));

        expect(result.current.modals.showAVVUpload).toBe(false);
    });

    it('should stay in Compliance-Gating even if user tries to close modal', () => {
        const mockUser = {
            id: 'user-1',
            logtoId: 'lt-1',
            username: 'testuser',
            credits: 100,
            role: 'USER' as const,
            avvAccepted: false,
            appMode: 'STANDARD' as const
        };

        const { result } = renderHook(() => useDashboardOrchestrator(mockUser, false, mockFetchAiStatus));

        expect(result.current.modals.showAVVUpload).toBe(true);

        // Attempt bypass
        act(() => {
            result.current.modals.setShowAVVUpload(false);
        });

        // The orchestrator should re-enforce the gating
        expect(result.current.modals.showAVVUpload).toBe(true);
    });

    it('should facilitate Expert-Enrollment workflow', async () => {
         const mockUser = {
            id: 'user-1',
            logtoId: 'lt-1',
            username: 'testuser',
            credits: 100,
            role: 'USER' as const,
            avvAccepted: true,
            appMode: 'STANDARD' as const
        };

        const { result } = renderHook(() => useDashboardOrchestrator(mockUser, false, mockFetchAiStatus));

        // Trigger Triage state for expert enrollment
        act(() => {
            result.current.modals.setShowPromptSettings(true);
        });

        expect(result.current.modals.showPromptSettings).toBe(true);
    });

    it('should NOT show setup modals while store is NOT hydrated', () => {
        // Force non-hydrated state 🧊
        mockedStore.mockReturnValue({
            aiSettings: { provider: 'mistral', mistralKey: '' },
            isHydrated: false, // <-- GATE IS CLOSED
        } as any);

        const mockUser = {
            id: 'local-bypass-user',
            logtoId: 'lt-bypass',
            username: 'bypass-user',
            credits: 0,
            avvAccepted: false,
            appMode: 'PURE' as const,
            role: 'USER' as const
        };

        const { result } = renderHook(() => useDashboardOrchestrator(mockUser, false, mockFetchAiStatus));

        // Even though settings are empty, the modal must NOT show yet
        expect(result.current.modals.showAiSetup).toBe(false);
    });

    it('should NOT show AI setup modal if server has a global key', () => {
        mockedStore.mockReturnValue({
            aiSettings: { provider: 'mistral', mistralKey: '' }, // Client key is empty
            isHydrated: true,
        } as any);

        const mockUser = {
            id: 'admin-1',
            logtoId: 'lt-admin-1',
            username: 'admin',
            credits: 9999,
            avvAccepted: true,
            role: 'ADMIN' as const,
            appMode: 'STANDARD' as const,
            hasGlobalAiKey: true // Server has a key!
        };

        const { result } = renderHook(() => useDashboardOrchestrator(mockUser, false, mockFetchAiStatus));

        // Setup modal should be bypassed because server key is present
        expect(result.current.modals.showAiSetup).toBe(false);
    });
});
