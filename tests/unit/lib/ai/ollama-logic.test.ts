import { resolveOllamaModel } from '@/lib/ai/ollama-logic';

/**
 * Ollama Modell-Aufloesung (Layer 1)
 * 🦙
 *
 * Der Lehrer waehlt eine Voreinstellung wie "qwen3.6:35b"; auf seinem Rechner
 * liegt aber eine andere Version. Diese Funktion entscheidet, welches der
 * tatsaechlich installierten Modelle gemeint war.
 *
 * Die zwei Bloecke unten kommen aus zwei Testdateien, die dieselbe Funktion an
 * verschiedenen Orten geprueft haben (tests/unit/ und tests/unit/lib/ai/).
 * Zusammengelegt, weil sonst niemand sieht, dass es die andere Haelfte gibt —
 * beide Modell-Listen bleiben erhalten, keine Pruefung ging verloren.
 */
describe('resolveOllamaModel', () => {
    describe('mit gemischten Versionsstaenden', () => {
        const available = [
            'qwen:35b',
            'mistral-small:latest',
            'gemma:7b',
            'llama3:8b',
            'qwen:7b'
        ];

        it('nimmt den exakten Treffer', () => {
            expect(resolveOllamaModel('llama3:8b', available)).toBe('llama3:8b');
        });

        it('ignoriert Gross-/Kleinschreibung', () => {
            expect(resolveOllamaModel('LLAMA3:8B', available)).toBe('llama3:8b');
        });

        it('loest eine abweichende Version auf (qwen)', () => {
            expect(resolveOllamaModel('qwen3.6:35b', available)).toBe('qwen:35b');
        });

        it('loest eine abweichende Version auf (mistral)', () => {
            expect(resolveOllamaModel('mistral-small3.2:latest', available)).toBe('mistral-small:latest');
        });

        it('faellt auf das erste Modell derselben Marke zurueck (gemma)', () => {
            expect(resolveOllamaModel('gemma4:31b', available)).toBe('gemma:7b');
        });

        it('gibt die Anfrage unveraendert zurueck, wenn nichts passt', () => {
            expect(resolveOllamaModel('deepseek:latest', available)).toBe('deepseek:latest');
        });

        it('kommt mit einer leeren Liste zurecht', () => {
            expect(resolveOllamaModel('qwen:35b', [])).toBe('qwen:35b');
        });

        it('bleibt bei der Marke, wenn nur die Version abweicht', () => {
            const complexAvailable = ['qwen2.5:35b', 'qwen3.0:35b'];
            const res = resolveOllamaModel('qwen3.6:35b', complexAvailable);
            expect(res).toContain('qwen');
            expect(res).toContain('35b');
        });
    });

    describe('mit mehreren Tags desselben Modells', () => {
        const availableModels = [
            'gemma4:e2b',
            'gemma4:31b',
            'mistral:latest',
            'mistral:v0.3',
            'qwen2.5:7b',
            'llama3:latest'
        ];

        it('nimmt den exakten Treffer', () => {
            expect(resolveOllamaModel('gemma4:31b', availableModels)).toBe('gemma4:31b');
            expect(resolveOllamaModel('llama3:latest', availableModels)).toBe('llama3:latest');
        });

        it('waehlt eine lokale Variante, wenn nur der Tag fehlt', () => {
            expect(resolveOllamaModel('gemma4:latest', availableModels)).toMatch(/gemma4:(31b|e2b)/);
        });

        /** Ohne diese Regel landet der Lehrer auf einem eingefrorenen alten Stand. */
        it('bevorzugt :latest, wenn mehrere Tags passen', () => {
            expect(resolveOllamaModel('mistral:0.1', availableModels)).toBe('mistral:latest');
        });

        it('loest ueber die Marke auf, wenn der volle Name abweicht', () => {
            expect(resolveOllamaModel('qwen:latest', availableModels)).toBe('qwen2.5:7b');
        });

        it('gibt die Anfrage unveraendert zurueck, wenn nichts passt', () => {
            expect(resolveOllamaModel('deepseek:latest', availableModels)).toBe('deepseek:latest');
        });

        it('kommt mit einer leeren Liste zurecht', () => {
            expect(resolveOllamaModel('gemma4:31b', [])).toBe('gemma4:31b');
        });
    });
});
