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

    it('should fallback to gemma4:latest if no model is provided', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        const emptySettings = { ollamaUrl: 'http://localhost:11434' };
        const payload = { promptText: 'Fallback Test', action: 'correction' };
        await executeOllamaRequest('correction', payload as any, emptySettings as any);

        expect(mockInvoke).toHaveBeenCalledWith('execute_ollama_command', expect.objectContaining({
            model: 'gemma4:latest',
            numPredict: 32768
        }));
    });

    it('should respect custom maxTokens for standard actions', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        const customSettings = { ollamaUrl: 'http://localhost:11434', maxTokens: 5000 };
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
        const defaultSettings = { ollamaUrl: 'http://localhost:11434' };
        await executeOllamaRequest('vision', payload as any, defaultSettings as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numPredict: 16000
        }));

        // 2. Custom visionMaxTokens
        const customSettings = { ollamaUrl: 'http://localhost:11434', visionMaxTokens: 8000 };
        await executeOllamaRequest('vision', payload as any, customSettings as any);
        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numPredict: 8000
        }));
    });

    it('should clamp temperature to 0.1 if 0 is passed to prevent local GPU loops', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        const zeroSettings = { ollamaUrl: 'http://localhost:11434', temperature: 0.0 };
        const payload = { promptText: 'Test', action: 'correction' };
        await executeOllamaRequest('correction', payload as any, zeroSettings as any);

        expect(mockInvoke).toHaveBeenCalledWith('execute_ollama_command', expect.objectContaining({
            temperature: 0.1
        }));
    });

    it('should dynamically scale context size (numCtx) based on prompt size and vision images', async () => {
        mockInvoke.mockResolvedValueOnce('{"status": "success"}');

        // 1. Text only (small) => 8192
        const smallSettings = { ollamaUrl: 'http://localhost:11434', ollamaNumCtx: 0 };
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
        const manualSettings = { ollamaUrl: 'http://localhost:11434', ollamaNumCtx: 4096 };
        await executeOllamaRequest('correction', payload as any, manualSettings as any);

        expect(mockInvoke).toHaveBeenLastCalledWith('execute_ollama_command', expect.objectContaining({
            numCtx: 4096
        }));
    });
});
