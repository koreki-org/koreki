import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DatenschutzFuerSchulen, SchulDatenschutzLink } from '@/components/marketing/site/DatenschutzFuerSchulen';
import { isLocalInstance } from '@/lib/env-context';
import { openExternal } from '@/lib/os-utils';

/**
 * Der Verweis „Was deine Schule dafür braucht“ steht auf /desktop, das in der
 * installierten App der Startbildschirm ist. Dort gibt es die Marketing-Seite
 * nicht als Ziel — der Verweis muss sie im Browser auf koreki.org öffnen,
 * statt ins Leere der App zu springen.
 */

jest.mock('@/lib/env-context', () => ({
    isLocalInstance: jest.fn(),
}));
jest.mock('@/lib/os-utils', () => ({
    openExternal: jest.fn(() => Promise.resolve()),
}));

const lokal = isLocalInstance as jest.Mock;

describe('SchulDatenschutzLink', () => {
    beforeEach(() => jest.clearAllMocks());

    it('führt auf der Webseite zum Abschnitt auf /security', () => {
        lokal.mockReturnValue(false);
        render(<SchulDatenschutzLink />);
        expect(screen.getByRole('link')).toHaveAttribute('href', '/security#schulen');
    });

    it('öffnet in der installierten App koreki.org im Browser', () => {
        lokal.mockReturnValue(true);
        render(<SchulDatenschutzLink />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'https://koreki.org/security#schulen');
        fireEvent.click(link);
        expect(openExternal).toHaveBeenCalledWith('https://koreki.org/security#schulen');
    });
});

describe('DatenschutzFuerSchulen', () => {
    it('trägt den Anker, auf den die Verweise zeigen, und nennt beide Versionen', () => {
        lokal.mockReturnValue(false);
        const { container } = render(<DatenschutzFuerSchulen />);
        expect(container.querySelector('section#schulen')).not.toBeNull();
        expect(screen.getByText('Koreki Desktop')).toBeInTheDocument();
        expect(screen.getByText('Community Edition')).toBeInTheDocument();
    });
});
