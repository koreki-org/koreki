import { resolveOllamaModel } from '../../src/lib/ai/ollama-logic';

describe('Ollama Logic: Smart Model Mapping', () => {
    const availableModels = [
        'gemma4:e2b',
        'gemma4:31b',
        'mistral:latest',
        'mistral:v0.3',
        'qwen2.5:7b',
        'llama3:latest'
    ];

    it('should return exact match if available', () => {
        expect(resolveOllamaModel('gemma4:31b', availableModels)).toBe('gemma4:31b');
        expect(resolveOllamaModel('llama3:latest', availableModels)).toBe('llama3:latest');
    });

    it('should map to a local alternative if exact tag is missing but name matches', () => {
        const resolved = resolveOllamaModel('gemma4:latest', availableModels);
        expect(resolved).toMatch(/gemma4:(31b|e2b)/);
    });

    it('should prioritize :latest tag if name match found', () => {
        expect(resolveOllamaModel('mistral:0.1', availableModels)).toBe('mistral:latest');
    });

    it('should resolve by brand name if full name is slightly different', () => {
        expect(resolveOllamaModel('qwen:latest', availableModels)).toBe('qwen2.5:7b');
    });

    it('should return the requested name if no match found at all', () => {
        expect(resolveOllamaModel('deepseek:latest', availableModels)).toBe('deepseek:latest');
    });

    it('should handle empty available list gracefully', () => {
        expect(resolveOllamaModel('gemma4:31b', [])).toBe('gemma4:31b');
    });
});
