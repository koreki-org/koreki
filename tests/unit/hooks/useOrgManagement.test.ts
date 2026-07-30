import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrgManagement } from '../../../src/hooks/useOrgManagement';

// Mock dependencies
jest.mock('next/router', () => ({
    useRouter: jest.fn(() => ({
        isReady: true,
        query: { workspaceId: 'ws-123' },
        push: jest.fn()
    }))
}));

const mockApiClientGet = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
        members: [
            {
                id: 'usr-1',
                membershipId: 'm-1',
                username: 'Lehrer Muster',
                systemRole: 'USER',
                workspaceRole: 'ADMIN',
                appMode: 'SAAS',
                ocrUsed: 10,
                correctionUsed: 50,
                joinedAt: '2026-01-01'
            }
        ],
        workspace: {
            id: 'ws-123',
            name: 'Gymnasium Musterstadt',
            credits: 5000,
            inviteCode: 'JOIN123',
            avvAccepted: true,
            createdAt: '2026-01-01'
        },
        currentUserId: 'usr-1'
    })
});

jest.mock('../../../src/lib/api-client', () => ({
    apiClient: {
        get: (...args: any[]) => mockApiClientGet(...args),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
    }
}));

describe('useOrgManagement - Industrial Hook Verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize and load workspace members & info', async () => {
        const { result } = renderHook(() => useOrgManagement());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.members.length).toBe(1);
        expect(result.current.members[0].username).toBe('Lehrer Muster');
        expect(result.current.workspace?.name).toBe('Gymnasium Musterstadt');
        expect(result.current.currentUserId).toBe('usr-1');
    });

    it('should toggle AVV modal state deterministically', () => {
        const { result } = renderHook(() => useOrgManagement());

        expect(result.current.showAvvModal).toBe(false);

        act(() => {
            result.current.setShowAvvModal(true);
        });

        expect(result.current.showAvvModal).toBe(true);
    });
});
