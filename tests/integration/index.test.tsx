import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../../src/pages/index';

// We rely on global mocks in jest.setup.js for Logto, Router, and Fonts.
// This ensures the test is "Industrial Grade" and doesn't break when infrastructure changes.

describe('Landing Page Smoke Test', () => {

    it('renders the main heading and branding', async () => {
        render(<Home />);

        // The Header contains the Logo with "Koreki" text.
        // The Landing Page contains "Präzise Korrektur" in the H1.
        
        await waitFor(() => {
            const branding = screen.getAllByText(/Koreki/i)[0];
            expect(branding).toBeInTheDocument();
            
            const mainHeading = screen.getByText(/Präzise/i);
            expect(mainHeading).toBeInTheDocument();
        });
    });

    it('contains a link to the features and security pages', () => {
        render(<Home />);
        
        // Use getAllByText for 'Features' and 'Sicherheit' to confirm presence in Header
        const featuresLink = screen.getAllByText(/Features/i)[0];
        expect(featuresLink).toBeInTheDocument();
        
        const securityLink = screen.getAllByText(/Sicherheit/i)[0];
        expect(securityLink).toBeInTheDocument();
    });
});
