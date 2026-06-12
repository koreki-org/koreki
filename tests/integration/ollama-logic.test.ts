import { executeOllamaRequest } from '../../src/lib/ai/ollama-logic';
import { invoke } from '@tauri-apps/api/core';
import { isDesktopTarget } from '../../src/lib/env-context';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
    invoke: jest.fn()
}));

// Mock env context
jest.mock('../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn()
}));

const mockInvoke = invoke as jest.Mock;
const mockIsDesktopTarget = isDesktopTarget as jest.Mock;

describe('Ollama Provider - Layer 2 Integration Tests', () => {
    const mockSettings = {
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: 'mistral:7b-instruct-q4_K_M'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsDesktopTarget.mockReturnValue(true);
    });

    it('should correctly map the Mistral Instruct model and enable JSON mode', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        const payload = { promptText: 'Test Prompt', action: 'correction' };
        await executeOllamaRequest('correction', payload as any, mockSettings as any);

        // Verify that invoke was called with correct payload (flat structure matching Rust bridge)
        expect(mockInvoke).toHaveBeenCalledWith('execute_ollama_command', expect.objectContaining({
            url: mockSettings.ollamaUrl,
            model: 'mistral:7b-instruct-q4_K_M',
            format: 'json',
            prompt: expect.any(String)
        }));
    });

    it('should throw an error if no model is provided', async () => {
        const emptySettings = { ollamaUrl: 'http://localhost:11434' };
        const payload = { promptText: 'Fallback Test', action: 'correction' };
        await expect(executeOllamaRequest('correction', payload as any, emptySettings as any))
            .rejects.toThrow('Ollama-Verbindung fehlgeschlagen: Kein Ollama-Modell in den Einstellungen ausgewählt.');
    });

    it('should throw an error if no url is provided', async () => {
        const emptySettings = { ollamaModel: 'gemma4:latest' };
        const payload = { promptText: 'Fallback Test', action: 'correction' };
        await expect(executeOllamaRequest('correction', payload as any, emptySettings as any))
            .rejects.toThrow('Ollama-Verbindung fehlgeschlagen: Keine Ollama-URL in den Einstellungen konfiguriert.');
    });

    it('should respect custom maxTokens for standard actions', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        const customSettings = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma4:latest', maxTokens: 5000 };
        const payload = { promptText: 'Test', action: 'correction' };
        await executeOllamaRequest('correction', payload as any, customSettings as any);

        expect(mockInvoke).toHaveBeenCalledWith('execute_ollama_command', expect.objectContaining({
            numPredict: 5000
        }));
    });

    it('should respect default and custom visionMaxTokens for vision action', async () => {
        mockInvoke.mockResolvedValue('{"status": "success"}');

        const payload = { buffer: 'base64_data', action: 'vision' };
        
        // 1. Default visionMaxTokens
        const defaultSettings = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma4:latest', ollamaNumCtx: 32768 };
        await executeOllamaRequest('vision', payload as any, defaultSettings as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numPredict: 16000
        }));

        // 2. Custom visionMaxTokens
        const customSettings = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma4:latest', visionMaxTokens: 8000 };
        await executeOllamaRequest('vision', payload as any, customSettings as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numPredict: 8000
        }));
    });

    it('should clamp temperature to 0.1 if 0 is passed to prevent local GPU loops for non-Gemma models', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        const zeroSettings = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'mistral:latest', temperature: 0.0 };
        const payload = { promptText: 'Test', action: 'correction' };
        await executeOllamaRequest('correction', payload as any, zeroSettings as any);

        expect(mockInvoke).toHaveBeenCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.1
        }));
    });

    it('should clamp temperature to 0.5 for Gemma/MoE models if temperature is low', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        const lowSettings = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma4:26b-a4b-it-qat', temperature: 0.2 };
        const payload = { promptText: 'Test', action: 'correction' };
        await executeOllamaRequest('correction', payload as any, lowSettings as any);

        expect(mockInvoke).toHaveBeenCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.5
        }));
    });

    it('should use default temperatures (Gemma -> 0.5, Qwen -> 0.3, Others -> 0.2, 31b -> 0.2) when no settings temperature is defined', async () => {
        mockInvoke.mockResolvedValue('{"tasks": [{"name": "Aufgabe 1", "maxPoints": 10}]}');

        const baseSettings = { ollamaUrl: 'http://localhost:11434' };
        const payload = { promptText: 'Test' };

        // Gemma -> 0.5
        await executeOllamaRequest('clean-and-analyze', payload as any, { ...baseSettings, ollamaModel: 'gemma4:latest' } as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.5
        }));

        // 31b (dense) -> 0.2
        await executeOllamaRequest('clean-and-analyze', payload as any, { ...baseSettings, ollamaModel: 'my-custom-31b-model' } as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.2
        }));

        // gemma4:31b (dense) -> 0.2 (even though it contains 'gemma')
        await executeOllamaRequest('clean-and-analyze', payload as any, { ...baseSettings, ollamaModel: 'gemma4:31b' } as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.2
        }));

        // Qwen -> 0.3
        await executeOllamaRequest('clean-and-analyze', payload as any, { ...baseSettings, ollamaModel: 'qwen2.5:7b' } as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.3
        }));

        // Others -> 0.2 for clean-and-analyze
        await executeOllamaRequest('clean-and-analyze', payload as any, { ...baseSettings, ollamaModel: 'mistral:latest' } as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.2
        }));
    });

    it('should dynamically scale context size (numCtx) based on prompt size and vision images', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        // 1. Text only (small) => 8192
        const smallSettings = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma4:latest', ollamaNumCtx: 0 };
        const payload = { promptText: 'Short prompt', action: 'correction' };
        await executeOllamaRequest('correction', payload as any, smallSettings as any);

        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numCtx: 8192
        }));

        // 2. Vision (large, 1 image * 8000 + buffer) => 16384
        const visionPayload = { buffer: 'img_data_base64', action: 'vision' };
        await executeOllamaRequest('vision', visionPayload as any, smallSettings as any);

        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numCtx: 16384
        }));

        // 3. Explicit manual context size => respects manual setting
        const manualSettings = { ollamaUrl: 'http://localhost:11434', ollamaModel: 'gemma4:latest', ollamaNumCtx: 4096 };
        await executeOllamaRequest('correction', payload as any, manualSettings as any);

        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numCtx: 4096
        }));
    });

    it('should ignore settings temperature and topP for clean-and-map and clean-and-analyze and use fixed defaults', async () => {
        mockInvoke.mockResolvedValue('{"tasks": [{"name": "Aufgabe 1", "maxPoints": 10}]}');

        const customSettings = { 
            ollamaUrl: 'http://localhost:11434', 
            ollamaModel: 'gemma4:latest', 
            temperature: 0.8,
            topP: 0.2
        };
        const payload = { promptText: 'Test' };

        // 1. clean-and-map
        await executeOllamaRequest('clean-and-map', payload as any, customSettings as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.5, // Gemma default instead of settings.temperature (0.8)
            topP: 0.9        // System default topP instead of settings.topP (0.2)
        }));

        // 2. clean-and-analyze
        await executeOllamaRequest('clean-and-analyze', payload as any, customSettings as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.5, // Gemma default instead of settings.temperature (0.8)
            topP: 0.9        // System default topP instead of settings.topP (0.2)
        }));
    });

    it('should throw an explicit structure validation error if clean-and-analyze response is missing task names', async () => {
        mockInvoke.mockResolvedValueOnce(JSON.stringify({
            tasks: [
                { name: 'Aufgabe 1', maxPoints: 5 },
                { maxPoints: 10 } // missing name!
            ]
        }));

        const payload = { modelSolution: 'some text' };
        await expect(executeOllamaRequest('clean-and-analyze', payload as any, mockSettings as any))
            .rejects.toThrow('Ungültige KI-Struktur: Aufgabe an Index 1 besitzt keinen gültigen Namen (Punkte: 10)');
    });
});
