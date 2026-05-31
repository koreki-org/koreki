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
            model: 'gemma4:latest'
        }));
    });
});
