import { resolveOllamaModel } from '@/lib/ai/ollama-logic';

describe('Ollama Logic (Layer 1: Unit Verification)', () => {
    
    describe('resolveOllamaModel', () => {
        const available = [
            'qwen:35b',
            'mistral-small:latest',
            'gemma:7b',
            'llama3:8b',
            'qwen:7b'
        ];

        it('should return exact match if available', () => {
            expect(resolveOllamaModel('llama3:8b', available)).toBe('llama3:8b');
        });

        it('should perform case-insensitive exact match', () => {
            expect(resolveOllamaModel('LLAMA3:8B', available)).toBe('llama3:8b');
        });

        it('should resolve fuzzy match for qwen (shorter/version mismatch)', () => {
            // Preset 'qwen3.6:35b' should resolve to 'qwen:35b' if it's the closest 35b
            expect(resolveOllamaModel('qwen3.6:35b', available)).toBe('qwen:35b');
        });

        it('should resolve fuzzy match for mistral', () => {
            expect(resolveOllamaModel('mistral-small3.2:latest', available)).toBe('mistral-small:latest');
        });

        it('should resolve fuzzy match for gemma', () => {
            expect(resolveOllamaModel('gemma4:31b', available)).toBe('gemma:7b'); // Finds first gemma
        });

        it('should return original preset if no match found at all', () => {
            expect(resolveOllamaModel('deepseek:latest', available)).toBe('deepseek:latest');
        });

        it('should handle empty availability gracefully', () => {
            expect(resolveOllamaModel('qwen:35b', [])).toBe('qwen:35b');
        });

        it('should prioritize exact name even if version differs', () => {
             const complexAvailable = ['qwen2.5:35b', 'qwen3.0:35b'];
             // Should find the "closest" one (usually the last or first depending on filter)
             const res = resolveOllamaModel('qwen3.6:35b', complexAvailable);
             expect(res).toContain('qwen');
             expect(res).toContain('35b');
        });
    });
});
