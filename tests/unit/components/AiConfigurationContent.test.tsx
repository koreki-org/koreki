import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AiConfigurationContent from '@/components/AiConfigurationContent';

// Mock the ollama-logic
jest.mock('@/lib/ai/ollama-logic', () => ({
    pingOllama: jest.fn(),
    fetchOllamaModels: jest.fn(),
    resolveOllamaModel: jest.fn((preset) => preset)
}));

import { fetchOllamaModels, pingOllama } from '@/lib/ai/ollama-logic';
import { getKorekiMode } from '@/lib/env-context';

jest.mock('@/lib/env-context', () => ({
    getKorekiMode: jest.fn(() => 'desktop'),
    isLocalInstance: jest.fn(() => true)
}));

describe('AiConfigurationContent (Layer 2: Integration Verification)', () => {
    const mockOnSaveOllama = jest.fn();
    const mockOnSaveMistral = jest.fn();
    const initialSettings = { provider: 'ollama' as const, ollamaUrl: 'http://localhost:11434', ollamaModel: 'qwen3.6:35b' };

    beforeEach(() => {
        jest.clearAllMocks();
        (fetchOllamaModels as jest.Mock).mockResolvedValue({ models: ['qwen:35b', 'gemma:7b'], isSelfSigned: false, version: '0.1.2' });
        (pingOllama as jest.Mock).mockResolvedValue({ success: true, isSelfSigned: false, version: '0.1.2' });
    });

    it('should switch between Mistral, Ollama and Custom providers', async () => {
        render(
            <AiConfigurationContent 
                initialSettings={initialSettings} 
                onSaveOllama={mockOnSaveOllama} 
                onSaveMistral={mockOnSaveMistral} 
            />
        );

        // Initially Ollama
        expect(screen.getByText(/Ollama Lokal/i)).toBeInTheDocument();
        
        // Switch to Mistral
        fireEvent.click(screen.getByText(/Mistral API/i));
        expect(screen.getByLabelText(/Mistral API Key/i)).toBeInTheDocument();

        // Switch to Custom OpenAI
        fireEvent.click(screen.getByText(/OpenAI Kompatibel/i));
        expect(screen.getByLabelText(/Base URL/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    it('should trigger save when applying Ollama config', async () => {
        render(
            <AiConfigurationContent 
                initialSettings={initialSettings} 
                onSaveOllama={mockOnSaveOllama} 
                onSaveMistral={mockOnSaveMistral} 
            />
        );

        const saveButton = screen.getByText(/Konfiguration anwenden/i);
        fireEvent.click(saveButton);

        expect(mockOnSaveOllama).toHaveBeenCalledWith('http://localhost:11434', 'qwen3.6:35b');
    });

    it('should perform ping and update status', async () => {
        render(
            <AiConfigurationContent 
                initialSettings={initialSettings} 
                onSaveOllama={mockOnSaveOllama} 
                onSaveMistral={mockOnSaveMistral} 
            />
        );

        const pingButton = screen.getByRole('button', { name: /Verbindung prüfen/i });
        fireEvent.click(pingButton);

        await waitFor(() => {
            expect(pingOllama).toHaveBeenCalled();
            expect(screen.getByText(/bereit/i)).toBeInTheDocument();
        });
    });
});
