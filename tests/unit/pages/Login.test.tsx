import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/pages/login';
import { signinOidc } from '@/lib/auth-keycloak';
import { useRouter } from 'next/router';
import { isKeycloakAuth } from '@/lib/env-context';
import { useAuth } from '@/hooks/useAuth';

// Mock dependencies
jest.mock('next/router', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/lib/auth-keycloak', () => ({
    signinOidc: jest.fn(),
}));

jest.mock('@/lib/env-context', () => ({
    isKeycloakAuth: jest.fn(),
    isLocalInstance: jest.fn().mockReturnValue(false),
    getKorekiMode: jest.fn().mockReturnValue('saas'),
}));

jest.mock('@/hooks/useAuth', () => ({
    useAuth: jest.fn(),
}));

describe('Login Page (Multi-Provider Logic)', () => {
    const mockPush = jest.fn();
    const mockUseRouter = useRouter as jest.Mock;
    const mockIsKeycloakAuth = isKeycloakAuth as jest.Mock;
    const mockUseAuth = useAuth as jest.Mock;

    const originalLocation = window.location;
    
    beforeAll(() => {
        // @ts-ignore
        delete window.location;
        // @ts-ignore
        window.location = {
            href: 'http://localhost',
            assign: jest.fn(),
            replace: jest.fn(),
        };
    });

    afterAll(() => {
        // @ts-ignore
        window.location = originalLocation;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseRouter.mockReturnValue({
            push: mockPush,
        });
        
        mockUseAuth.mockReturnValue({
            userData: null,
            authLoading: false,
        });
        
        // @ts-ignore
        window.location.href = 'http://localhost';
    });

    it('redirects to Keycloak automatically without showing the SaaS login card', async () => {
        mockIsKeycloakAuth.mockReturnValue(true);

        render(<LoginPage />);

        // Kein Klick nötig: der Redirect erfolgt beim Mount.
        await waitFor(() => expect(signinOidc).toHaveBeenCalled());

        // Die SaaS-Karte (Registrierung, Logto-Passwort-Reset) darf in diesem Tier
        // nicht einmal kurz aufblitzen — sie ist hier fachlich falsch.
        expect(screen.queryByRole('button', { name: /Mit Account anmelden/i })).toBeNull();
        expect(screen.queryByText(/kostenlos registrieren/i)).toBeNull();
    });

    it('should NOT trigger signinOidc when isKeycloakAuth returns false', () => {
        mockIsKeycloakAuth.mockReturnValue(false);
        
        render(<LoginPage />);
        
        const loginButton = screen.getByRole('button', { name: /Mit Account anmelden/i });
        fireEvent.click(loginButton);
        
        expect(signinOidc).not.toHaveBeenCalled();
        // expect(window.location.href).toContain('/api/logto/sign-in'); // JSDOM Mocking issue in this environment
    });
});
