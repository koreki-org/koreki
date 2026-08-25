import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsModal from '@/components/SettingsModal';

/**
 * Waechter fuer eine DSGVO-Pflicht.
 *
 * Das Zahnrad hing lange hinter `role === 'ADMIN'`. Damit war die Konto-
 * Loeschung fuer normale SaaS-Nutzer unerreichbar — Art. 17 DSGVO verlangt
 * aber, dass jeder sein Konto selbst loeschen kann. Der Fehler war unsichtbar,
 * weil er kein Fehlverhalten erzeugte, sondern nur ein Fehlen.
 *
 * Geprueft wird beides: dass die Loeschung ohne Admin-Rolle da ist UND dass die
 * Systemeinstellungen es nicht sind.
 */

// SaaS-Umgebung: kein lokaler Betrieb, kein Keycloak.
jest.mock('@/lib/env-context', () => ({
    ...jest.requireActual('@/lib/env-context'),
    isLocalInstance: jest.fn(() => false),
    isKeycloakAuth: jest.fn(() => false),
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: { post: jest.fn() }
}));

// Die KI-Konfiguration bringt eigene Netzwerk- und Modell-Logik mit, die hier
// nichts zur Frage beitraegt.
jest.mock('@/components/settings/UnifiedAiConfig', () => ({
    UnifiedAiConfig: () => <div data-testid="ai-config" />
}));

import { apiClient } from '@/lib/api-client';

const LOESCH_BUTTON = /Konto unwiderruflich löschen/i;
const DATENSCHUTZ_ABSCHNITT = /Modus & Datenschutz/i;
const ACCOUNT_ABSCHNITT = /Aktueller Account/i;

const renderModal = (userRole: string) =>
    render(
        <SettingsModal
            settings={{}}
            onSave={jest.fn()}
            onClose={jest.fn()}
            userRole={userRole}
            username="Testnutzer"
        />
    );

describe('SettingsModal — Rollenabstufung (Layer 2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Der Erfolgsfall navigiert zum Sign-out; das kann jsdom nicht. Der
        // abgelehnte Aufruf beweist dieselbe Sache ohne Navigation.
        (apiClient.post as jest.Mock).mockRejectedValue(new Error('offline'));
    });

    it('laesst einen normalen Nutzer sein Konto loeschen', () => {
        renderModal('USER');
        expect(screen.getByRole('button', { name: LOESCH_BUTTON })).toBeInTheDocument();
    });

    it('zeigt einem normalen Nutzer keine Systemeinstellungen', () => {
        renderModal('USER');
        expect(screen.queryByText(DATENSCHUTZ_ABSCHNITT)).not.toBeInTheDocument();
        expect(screen.queryByText(ACCOUNT_ABSCHNITT)).not.toBeInTheDocument();
        expect(screen.queryByTestId('ai-config')).not.toBeInTheDocument();
    });

    it('zeigt einem Admin weiterhin alle Abschnitte', () => {
        renderModal('ADMIN');
        expect(screen.getByRole('button', { name: LOESCH_BUTTON })).toBeInTheDocument();
        expect(screen.getByText(DATENSCHUTZ_ABSCHNITT)).toBeInTheDocument();
        expect(screen.getByText(ACCOUNT_ABSCHNITT)).toBeInTheDocument();
        expect(screen.getByTestId('ai-config')).toBeInTheDocument();
    });

    it('fragt ueber den Projekt-Dialog nach, nicht per Browser-Kasten', () => {
        const browserKasten = jest.spyOn(window, 'confirm');
        renderModal('USER');

        fireEvent.click(screen.getByRole('button', { name: LOESCH_BUTTON }));

        expect(browserKasten).not.toHaveBeenCalled();
        expect(screen.getByTestId('bestaetigen')).toBeInTheDocument();
        // Entscheidend: der Klick allein loescht noch nichts.
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('loescht erst nach der Bestaetigung', async () => {
        renderModal('USER');

        fireEvent.click(screen.getByRole('button', { name: LOESCH_BUTTON }));
        fireEvent.click(screen.getByTestId('bestaetigen'));

        await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/api/user/delete', {}));
    });

    it('loescht nicht, wenn die Rueckfrage abgebrochen wird', () => {
        renderModal('USER');

        fireEvent.click(screen.getByRole('button', { name: LOESCH_BUTTON }));
        fireEvent.click(screen.getByRole('button', { name: /Abbrechen/i }));

        expect(screen.queryByTestId('bestaetigen')).not.toBeInTheDocument();
        expect(apiClient.post).not.toHaveBeenCalled();
    });
});