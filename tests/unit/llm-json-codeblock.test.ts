/**
 * Codeblöcke IN einer JSON-Antwort sind Inhalt, nicht die Antwort (lib/ai/llm-json.ts).
 *
 * ANLASS (24.10.2026). Eine Musterlösung mit Python-Code: Die Analyse schrieb ihn
 * korrekt als ```python … ``` in "content", und die Suche nach dem Markdown-Block nahm
 * genau diesen Code als Antwort. Jede Musterlösung mit Codeblock scheiterte am Lesen.
 */
import { extractJsonCandidate, parseLlmJson } from '@/lib/ai/llm-json';

const antwort = JSON.stringify({
    tasks: [{ name: 'Aufgabe 2c', content: 'Lösung:\n```python\nwhile True:\n    led.on()\n```\nEnde' }]
});

describe('JSON-Antwort mit Codeblock im Inhalt', () => {
    it('liest die Antwort, wenn sie selbst mit { beginnt', () => {
        const r = parseLlmJson<{ tasks: { content: string }[] }>(antwort);
        expect(r.tasks[0].content).toContain('```python');
    });

    it('nimmt weiterhin einen ```json-Block, der die Antwort umschließt', () => {
        expect(extractJsonCandidate('Hier ist das Ergebnis:\n```json\n{"a": 1}\n```')).toBe('{"a": 1}');
    });

    it('nimmt einen Block ohne Sprachangabe, wenn er JSON enthält', () => {
        expect(extractJsonCandidate('Ergebnis:\n```\n[1, 2]\n```')).toBe('[1, 2]');
    });

    it('übergeht einen Codeblock in anderer Sprache vor der eigentlichen Antwort', () => {
        const text = 'Ich prüfe:\n```python\nprint(1)\n```\nAntwort:\n```json\n{"ok": true}\n```';
        expect(extractJsonCandidate(text)).toBe('{"ok": true}');
    });
});

/**
 * ANLASS (24.10.2026). qwen3.8 schrieb ein deutsches Zitat mit MASKIERTEM Schlusszeichen:
 * `„… gar nichts.\"`. Die Reparatur für „…"-Zitate wartete weiter auf das Schlusszeichen
 * und machte aus dem echten Ende des Textwerts ein “ — die Antwort war unlesbar.
 */
describe('Deutsches Zitat mit maskiertem Schlusszeichen', () => {
    it('lässt gültiges JSON mit „…\\" unverändert lesbar', () => {
        const roh = '{"a": "Aussage: „Das bringt gar nichts.\\"\nWeiter.", "b": "x"}';
        expect(parseLlmJson<{ a: string; b: string }>(roh)).toEqual({ a: 'Aussage: „Das bringt gar nichts."\nWeiter.', b: 'x' });
    });

    it('repariert weiterhin „…" mit ungeschütztem Schlusszeichen', () => {
        const roh = '{"a": "Er nannte „Arbeitsplätze", weil es passt.", "b": "x"}';
        expect(parseLlmJson<{ a: string; b: string }>(roh).b).toBe('x');
    });
});
