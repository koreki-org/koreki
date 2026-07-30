import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuthGuard from '@/components/guards/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';

// Mocking dependencies
jest.mock('@/hooks/useAuth');
jest.mock('next/router', () => ({
    useRouter: jest.fn(),
}));

describe('AuthGuard Component (Reliability Suite)', () => {
    const mockPush = jest.fn();
    const mockUseRouter = useRouter as jest.Mock;
    const mockUseAuth = useAuth as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseRouter.mockReturnValue({
            push: mockPush,
        });
    });

    it('should show loading screen when auth is loading and not fetched', () => {
        mockUseAuth.mockReturnValue({
            userData: null,
            authLoading: true,
            isFetched: false,
        });

        render(<AuthGuard><div>Protected Content</div></AuthGuard>);

        expect(screen.getByText('Wird geladen …')).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show loading screen when userData is null even if not loading (initial state transition)', () => {
        mockUseAuth.mockReturnValue({
            userData: null,
            authLoading: false,
            isFetched: false,
        });

        render(<AuthGuard><div>Protected Content</div></AuthGuard>);

        expect(screen.getByText('Wird geladen …')).toBeInTheDocument();
    });

    it('should redirect to login if fetched and no userData', async () => {
        let triggerRerender: (() => void) | undefined;
        const TestWrapper = () => {
            const [, setTick] = React.useState(0);
            triggerRerender = () => setTick(t => t + 1);
            return <AuthGuard><div>Protected Content</div></AuthGuard>;
        };

        mockUseAuth.mockImplementation(() => ({
            userData: null,
            authLoading: false,
            isFetched: true,
            checkAuth: () => triggerRerender?.(),
        }));

        render(<TestWrapper />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/login');
        });
    });

    it('should redirect to home if requireAdmin is true and user is not ADMIN', async () => {
        mockUseAuth.mockReturnValue({
            userData: { role: 'USER' },
            authLoading: false,
            isFetched: true,
        });

        render(<AuthGuard requireAdmin><div>Admin Content</div></AuthGuard>);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        });
    });

    it('should render children if authenticated and authorized', () => {
        mockUseAuth.mockReturnValue({
            userData: { role: 'USER' },
            authLoading: false,
            isFetched: true,
        });

        render(<AuthGuard><div>Protected Content</div></AuthGuard>);

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
        expect(screen.queryByText('Wird geladen …')).not.toBeInTheDocument();
    });

    it('should render children if admin and requireAdmin is true', () => {
        mockUseAuth.mockReturnValue({
            userData: { role: 'ADMIN' },
            authLoading: false,
            isFetched: true,
        });

        render(<AuthGuard requireAdmin><div>Admin Content</div></AuthGuard>);

        expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
});
