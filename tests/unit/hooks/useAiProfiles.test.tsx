import { renderHook, act } from '@testing-library/react';
import { useAiProfiles, STANDARD_AI_PROFILE } from '../../../src/hooks/useAiProfiles';
import { isDesktopTarget } from '../../../src/lib/env-context';

// Mock env context
jest.mock('../../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn(),
    isLocalInstance: jest.fn().mockReturnValue(false)
}));

// Mock apiClient to prevent un-acted state hydration in hook tests
jest.mock('../../../src/lib/api-client', () => ({
    apiClient: {
        get: jest.fn().mockReturnValue(new Promise(() => {}))
    }
}));

const mockIsDesktopTarget = isDesktopTarget as jest.Mock;

describe('useAiProfiles Hook 🧪🛡️', () => {
    let mockSettings: any;
    let mockOnSave: jest.Mock;
    let mockOnClose: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsDesktopTarget.mockReturnValue(false); // Default to SaaS mode
        mockSettings = {
            provider: 'mistral',
            temperature: 0.2,
            topP: 0.8,
            maxTokens: 32768,
            presencePenalty: 0.0,
            enableThinking: true,
            visionTemperature: 0.0,
            visionTopP: 0.8,
            visionMaxTokens: 16000,
            visionPresencePenalty: 0.0,
            ollamaNumCtx: 0,
            activeAiProfileId: 'system-standard'
        };
        mockOnSave = jest.fn();
        mockOnClose = jest.fn();
        
        // Clear LocalStorage mock if needed
        Storage.prototype.getItem = jest.fn();
        Storage.prototype.setItem = jest.fn();
    });

    it('should initialize with default settings', () => {
        const { result } = renderHook(() => useAiProfiles(mockSettings, mockOnSave, mockOnClose));

        expect(result.current.temperature).toBe(0.2);
        expect(result.current.visionTemperature).toBe(0.0);
        expect(result.current.ollamaNumCtx).toBe(0);
        expect(result.current.isDirty).toBe(false);
    });

    it('should clamp temperature to 0.2 for Ollama and OpenAI-Compatible providers', () => {
        mockSettings.provider = 'ollama';
        mockSettings.temperature = 0.0;
        mockSettings.visionTemperature = 0.0;

        const { result: resultOllama } = renderHook(() => useAiProfiles(mockSettings, mockOnSave, mockOnClose));
        expect(resultOllama.current.temperature).toBe(0.2);
        expect(resultOllama.current.visionTemperature).toBe(0.2);

        // Reset and test with openai-compatible
        mockSettings.provider = 'openai-compatible';
        const { result: resultOpenAI } = renderHook(() => useAiProfiles(mockSettings, mockOnSave, mockOnClose));
        expect(resultOpenAI.current.temperature).toBe(0.2);
        expect(resultOpenAI.current.visionTemperature).toBe(0.2);
    });

    it('should NOT clamp temperature for other providers', () => {
        mockSettings.provider = 'mistral';
        mockSettings.temperature = 0.0;
        mockSettings.visionTemperature = 0.0;

        const { result } = renderHook(() => useAiProfiles(mockSettings, mockOnSave, mockOnClose));

        expect(result.current.temperature).toBe(0.0);
        expect(result.current.visionTemperature).toBe(0.0);
    });

    it('should clone existing profiles when template is provided in handleStartNew', () => {
        const { result } = renderHook(() => useAiProfiles(mockSettings, mockOnSave, mockOnClose));

        const template = {
            id: 'template-id',
            name: 'Special Presets',
            temperature: 0.45,
            topP: 0.75,
            maxTokens: 1000,
            presencePenalty: 0.1,
            enableThinking: false,
            visionTemperature: 0.15,
            visionTopP: 0.65,
            visionMaxTokens: 2000,
            visionPresencePenalty: 0.2,
            ollamaNumCtx: 8192
        };

        act(() => {
            result.current.handleStartNew(template);
        });

        expect(result.current.isCreatingNew).toBe(true);
        expect(result.current.newProfileName).toBe('Kopie von Special Presets');
        expect(result.current.temperature).toBe(0.45);
        expect(result.current.topP).toBe(0.75);
        expect(result.current.maxTokens).toBe(1000);
        expect(result.current.presencePenalty).toBe(0.1);
        expect(result.current.enableThinking).toBe(false);
        expect(result.current.visionTemperature).toBe(0.15);
        expect(result.current.visionTopP).toBe(0.65);
        expect(result.current.visionMaxTokens).toBe(2000);
        expect(result.current.visionPresencePenalty).toBe(0.2);
        expect(result.current.ollamaNumCtx).toBe(8192);
    });

    it('should reset parameters to defaults when handleStartNew is called without a template', () => {
        const { result } = renderHook(() => useAiProfiles(mockSettings, mockOnSave, mockOnClose));

        // First modify values
        act(() => {
            result.current.setTemperature(0.9);
            result.current.setOllamaNumCtx(4096);
        });

        // Trigger reset start new
        act(() => {
            result.current.handleStartNew();
        });

        expect(result.current.isCreatingNew).toBe(true);
        expect(result.current.newProfileName).toBe('');
        expect(result.current.temperature).toBe(0.2); // Default standard
        expect(result.current.ollamaNumCtx).toBe(0); // Default auto
    });

    it('should set isDirty correctly when ollamaNumCtx changes', () => {
        const { result } = renderHook(() => useAiProfiles(mockSettings, mockOnSave, mockOnClose));

        expect(result.current.isDirty).toBe(false);

        act(() => {
            result.current.setOllamaNumCtx(2048);
        });

        expect(result.current.isDirty).toBe(true);
    });
});
