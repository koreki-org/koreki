import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../../src/pages/index';

// We rely on global mocks in jest.setup.js for Logto, Router, and Fonts.
// This ensures the test is "Industrial Grade" and doesn't break when infrastructure changes.

describe('Landing Page Smoke Test', () => {

    it('renders the main heading and branding', async () => {
        render(<Home />);

        // The Header contains the Logo with "Koreki" text.
        // The Landing Page H1 reads "Jede Arbeit. Derselbe Maßstab." (since 12.10.2026).
        
        await waitFor(() => {
            const branding = screen.getAllByText(/Koreki/i)[0];
            expect(branding).toBeInTheDocument();
            
            const mainHeading = screen.getByRole('heading', { level: 1, name: /Jede Arbeit/i });
            expect(mainHeading).toBeInTheDocument();
        });
    });

    it('contains a link to the features and security pages', () => {
        render(<Home />);
        
        // Header-Navigation: "Funktionen" (/features) und "Datenschutz" (/security)
        const featuresLink = screen.getAllByRole('link', { name: 'Funktionen' })[0];
        expect(featuresLink).toHaveAttribute('href', '/features');

        const securityLink = screen.getAllByRole('link', { name: 'Datenschutz' })[0];
        expect(securityLink).toHaveAttribute('href', '/security');
    });
});
