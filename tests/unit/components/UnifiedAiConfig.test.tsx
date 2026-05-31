import React from 'react';
import { render, screen } from '@testing-library/react';
import { UnifiedAiConfig } from '../../../src/components/settings/UnifiedAiConfig';
import { AppSettings } from '../../../src/types';

// Mock dependencies
jest.mock('@/lib/env-context', () => ({
    getKorekiMode: jest.fn(() => 'community'),
    isDesktopTarget: jest.fn(() => false)
}));

describe('UnifiedAiConfig (Layer 2 Integration)', () => {
    const mockSettings: Partial<AppSettings> = {
        provider: 'ollama',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'gemma4:31b'
    };

    const mockOnSave = jest.fn();

    it('should render the provider selection tabs', () => {
        render(<UnifiedAiConfig settings={mockSettings} onSave={mockOnSave} mode="USER_SETUP" />);
        expect(screen.getByText('Mistral API')).toBeDefined();
        expect(screen.getByText('Ollama Lokal')).toBeDefined();
        expect(screen.getByText('OpenAI Kompatibel')).toBeDefined();
    });

    it('should show the Ollama configuration by default (as per mockSettings)', () => {
        render(<UnifiedAiConfig settings={mockSettings} onSave={mockOnSave} mode="USER_SETUP" />);
        expect(screen.getByLabelText(/Ollama Adresse/i)).toBeDefined();
        expect(screen.getByText('Verbindung prüfen')).toBeDefined();
    });

    it('should display the "System-Standard" badge in community mode for Mistral', () => {
        const mistralSettings = { ...mockSettings, provider: 'mistral' as const };
        render(<UnifiedAiConfig settings={mistralSettings} onSave={mockOnSave} mode="USER_SETUP" />);
        
        // In community mode, Mistral key input should be hidden, and system badge shown
        expect(screen.queryByLabelText(/Mistral API Key/i)).toBeNull();
        expect(screen.getByText('System-Standard aktiv')).toBeDefined();
    });
});
