import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import OrgAdminDashboard from '../../src/pages/org-admin';
import { useRouter } from 'next/router';
import '@testing-library/jest-dom';

// 1. Mock Next.js Router
jest.mock('next/router', () => ({
    useRouter: jest.fn()
}));

// 2. Mock useAuth Hook (Centralized for Industrial Testing) 🛡️
jest.mock('../../src/hooks/useAuth', () => ({
    useAuth: jest.fn()
}));

import { useAuth } from '../../src/hooks/useAuth';
import { meldeFehler } from '@/lib/notify';

jest.mock('@/lib/notify', () => ({
    meldeErfolg: jest.fn(),
    meldeHinweis: jest.fn(),
    meldeFehler: jest.fn(),
    meldeNachNeuladen: jest.fn()
}));

describe('Org-Admin Dashboard Integration (God Mode & Interactive)', () => {
    jest.setTimeout(20000); // Increase timeout for industrial-grade integration
    
    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({
            isReady: true,
            query: { workspaceId: 'ws-industrial-123' },
            push: jest.fn()
        });

        (useAuth as jest.Mock).mockReturnValue({
            userData: mockUserResponse.user,
            authLoading: false,
            isFetched: true,
            aiStatus: mockUserResponse.aiStatus,
            setUserData: jest.fn(),
            checkAuth: jest.fn(),
            fetchAiStatus: jest.fn()
        });
        
        // Mock global window interactions
        window.confirm = jest.fn(() => true);
        window.alert = jest.fn();
    });

    afterEach(cleanup);

    const mockUserResponse = {
        loggedIn: true,
        user: {
            id: 'admin-999',
            username: 'admin-test',
            role: 'ADMIN',
            appMode: 'STANDARD'
        },
        aiStatus: { ocrBrakeActive: false, correctionBrakeActive: false }
    };

    const mockSuccessResponse = {
        workspace: {
            id: 'ws-industrial-123',
            name: 'Industrial Institute',
            credits: 500,
            inviteCode: 'JOIN-GODMODE',
            avvAccepted: true
        },
        members: [
            {
                id: 'user-456',
                membershipId: 'mem-789',
                username: 'lehrer-test',
                systemRole: 'USER',
                workspaceRole: 'Lehrkraft',
                appMode: 'STANDARD',
                ocrUsed: 10,
                correctionUsed: 5,
                joinedAt: new Date().toISOString()
            }
        ],
        currentUserId: 'admin-999',
        currentUserRole: 'ADMIN'
    };

    it('should correctly handle a God Mode Jump via workspaceId query parameter', async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/api/user') && !url.includes('/prompt-profiles')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => mockUserResponse
                });
            }
            if (url.includes('/api/ai-status')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => mockUserResponse.aiStatus
                });
            }
            if (url.includes('/api/org-admin')) {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => mockSuccessResponse
                });
            }
            if (url.includes('/api/user/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => ([]) });
            }
            return Promise.resolve({ ok: true, json: async () => ([]) });
        });

        render(<OrgAdminDashboard />);

        await waitFor(() => {
            expect(screen.getByText('Industrial Institute')).toBeInTheDocument();
            expect(screen.getByText('500')).toBeInTheDocument(); 
        });

        expect(screen.getByText('lehrer-test')).toBeInTheDocument();
    });

    it('should regenerate invite code when clicking "Neu generieren"', async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/api/user') && !url.includes('/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => mockUserResponse });
            }
            if (url.includes('/api/org-admin/update-code')) {
                return Promise.resolve({ ok: true });
            }
            if (url.includes('/api/user/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => ([]) });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => mockSuccessResponse
            });
        });

        render(<OrgAdminDashboard />);
        await waitFor(() => screen.getByText('JOIN-GODMODE'));

        const regenButton = screen.getByText(/Neu generieren/i);
        fireEvent.click(regenButton);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/api/org-admin/update-code', expect.anything());
        });
    });

    it('should remove a member after confirmation', async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/api/user') && !url.includes('/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => mockUserResponse });
            }
            if (url.includes('/api/org-admin/remove-member')) {
                return Promise.resolve({ ok: true });
            }
            if (url.includes('/api/user/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => ([]) });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => mockSuccessResponse
            });
        });

        render(<OrgAdminDashboard />);
        await waitFor(() => screen.getByText('lehrer-test'));

        const removeButton = screen.getByTitle(/Aus Organisation entfernen/i);
        fireEvent.click(removeButton);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/api/org-admin/remove-member', expect.anything());
        });
    });

    it('should toggle member role', async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/api/user') && !url.includes('/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => mockUserResponse });
            }
            if (url.includes('/api/org-admin/toggle-role')) {
                return Promise.resolve({ ok: true });
            }
            if (url.includes('/api/user/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => ([]) });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => mockSuccessResponse
            });
        });

        render(<OrgAdminDashboard />);
        await waitFor(() => screen.getByText('lehrer-test'));

        const toggleButton = screen.getByTitle(/Zum Verwalter befördern/i);
        fireEvent.click(toggleButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/org-admin/toggle-role', expect.anything());
        });
    });

    it('should handle API errors with alerts', async () => {
        global.fetch = jest.fn().mockImplementation((url) => {
            if (url.includes('/api/user') && !url.includes('/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => mockUserResponse });
            }
            if (url.includes('/api/org-admin/toggle-role')) {
                return Promise.resolve({ 
                    ok: false, 
                    json: async () => ({ message: 'Error from server' }) 
                });
            }
            if (url.includes('/api/user/prompt-profiles')) {
                return Promise.resolve({ ok: true, status: 200, json: async () => ([]) });
            }
            return Promise.resolve({
                ok: true,
                status: 200,
                json: async () => mockSuccessResponse
            });
        });

        render(<OrgAdminDashboard />);
        await waitFor(() => screen.getByText('lehrer-test'));

        const toggleButton = screen.getByTitle(/Zum Verwalter befördern/i);
        fireEvent.click(toggleButton);

        await waitFor(() => {
            expect(meldeFehler).toHaveBeenCalledWith('Error from server');
        });
    });

    it('should redirect if unauthorized (403)', async () => {
        const pushMock = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({
            isReady: true,
            query: {},
            push: pushMock
        });

        global.fetch = jest.fn().mockResolvedValue({
            status: 403,
            ok: false
        });

        render(<OrgAdminDashboard />);

        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith('/app');
        });
    });
});
