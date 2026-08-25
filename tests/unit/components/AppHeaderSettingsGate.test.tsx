import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AppHeader from '@/components/layout/AppHeader';
import { isLocalInstance, isKeycloakAuth, getAuthType } from '@/lib/env-context';

/**
 * Waechter fuer die Sichtbarkeit des Zahnrads.
 *
 * Hinter dem Zahnrad liegt die Konto-Loeschung, die im SaaS jedem Nutzer offen
 * stehen muss (Art. 17 DSGVO). Diese Oeffnung darf aber AUSSCHLIESSLICH im SaaS
 * greifen: in einer Schulinstanz (Keycloak) verwaltet der Identity Provider die
 * Konten, dort bleibt das Zahnrad Sache des Admins.
 *
 * Hinweis zur Zaehlweise: Der Header rendert seine Schnellzugriffe zweimal —
 * einmal fuer Mobil, einmal fuer Desktop; welcher sichtbar ist, entscheidet CSS.
 * Deshalb wird auf "mindestens einer" bzw. "keiner" geprueft, nicht auf genau
 * einen. Eine Zaehlung auf 1 waere an das Layout gekoppelt und truegerisch.
 *
 * Der letzte Fall prueft die Falle: die Bedingung "nicht Keycloak" ist
 * NICHT deckungsgleich mit "SaaS" — eine Community-Instanz mit AUTH_TYPE=NONE
 * auf einer koreki.org-Subdomain ist beides nicht.
 */

jest.mock('@/lib/env-context', () => ({
    isLocalInstance: jest.fn(),
    isKeycloakAuth: jest.fn(),
    getAuthType: jest.fn(),
}));

jest.mock('@/components/layout/HeaderBadges', () => ({
    HeaderBadges: () => <div />
}));

jest.mock('lucide-react', () => ({
    ...jest.requireActual('lucide-react'),
    Settings: () => <span data-testid="zahnrad" />,
}));

type Umgebung = { authType: string; lokal: boolean; keycloak: boolean };

const setzeUmgebung = ({ authType, lokal, keycloak }: Umgebung) => {
    (getAuthType as jest.Mock).mockReturnValue(authType);
    (isLocalInstance as jest.Mock).mockReturnValue(lokal);
    (isKeycloakAuth as jest.Mock).mockReturnValue(keycloak);
};

const renderHeader = (rolle: string) =>
    render(
        <AppHeader
            userData={{ id: '1', username: 'Testnutzer', role: rolle } as never}
            upgrading={false}
            onUpgrade={jest.fn()}
            onShowSettings={jest.fn()}
            onLogout={jest.fn()}
            onLoadDemo={jest.fn()}
            onShowHelp={jest.fn()}
        />
    );

describe('AppHeader — Zahnrad nur im SaaS fuer alle (Layer 2)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('zeigt es im SaaS auch einem normalen Nutzer', () => {
        setzeUmgebung({ authType: 'LOGTO', lokal: false, keycloak: false });
        renderHeader('USER');
        expect(screen.queryAllByTestId('zahnrad').length).toBeGreaterThan(0);
    });

    it('haelt es in der Schulinstanz (Keycloak) beim Admin', () => {
        setzeUmgebung({ authType: 'KEYCLOAK', lokal: true, keycloak: true });
        renderHeader('USER');
        expect(screen.queryAllByTestId('zahnrad')).toHaveLength(0);
    });

    it('zeigt es in der Schulinstanz weiterhin dem Admin', () => {
        setzeUmgebung({ authType: 'KEYCLOAK', lokal: true, keycloak: true });
        renderHeader('ADMIN');
        expect(screen.queryAllByTestId('zahnrad').length).toBeGreaterThan(0);
    });

    it('laesst die lokale Einzelplatz-Instanz unveraendert', () => {
        setzeUmgebung({ authType: 'NONE', lokal: true, keycloak: false });
        renderHeader('USER');
        expect(screen.queryAllByTestId('zahnrad').length).toBeGreaterThan(0);
    });

    it('oeffnet nichts fuer eine nicht-lokale Instanz ohne Logto', () => {
        // Community mit AUTH_TYPE=NONE auf einer koreki.org-Subdomain: weder
        // lokal noch Keycloak noch SaaS. Hier darf sich nichts geaendert haben.
        setzeUmgebung({ authType: 'NONE', lokal: false, keycloak: false });
        renderHeader('USER');
        expect(screen.queryAllByTestId('zahnrad')).toHaveLength(0);
    });
});
