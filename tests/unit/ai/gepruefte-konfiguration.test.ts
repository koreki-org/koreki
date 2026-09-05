/**
 * Waechter: Nur EINE Konfiguration gilt als geprueft. 🧪
 *
 * ANLASS (05.09.2026). Anhang IV §4.6 weist genau eine gemessene Konfiguration aus:
 * `qwen3.6:35b` ueber lokales Ollama. In der Oberflaeche stand davon nichts — wer
 * Gemma oder Mistral waehlte, bekam dieselbe Darstellung wie im gemessenen Fall.
 *
 * Der Fallstrick ist der Anbieter, nicht das Modell: Dasselbe Qwen 3.6 laeuft ueber
 * einen OpenAI-kompatiblen Endpunkt in einer ANDEREN Konfiguration — dort werden die
 * Abtastwerte der Rechenweg-Extraktion nicht berechnet, sondern stehen fest, und der
 * Denkschritt aus R18 wird nicht gesendet. Eine Pruefung allein auf den Modellnamen
 * wuerde diesen Weg faelschlich als geprueft ausweisen.
 */
import { istGepruefteKonfiguration, aktivesModell } from '@/lib/ai/gepruefte-konfiguration';

describe('istGepruefteKonfiguration', () => {
    it('erkennt die eine gemessene Konfiguration', () => {
        expect(istGepruefteKonfiguration('ollama', 'qwen3.6:35b')).toBe(true);
    });

    it('verlangt den Anbieter mit — derselbe Modellname genuegt nicht', () => {
        expect(istGepruefteKonfiguration('openai-compatible', 'Qwen3.6-35B-A3B-FP8')).toBe(false);
    });

    it('weist andere Ollama-Modelle als ungeprueft aus', () => {
        expect(istGepruefteKonfiguration('ollama', 'gemma4:31b')).toBe(false);
        expect(istGepruefteKonfiguration('ollama', 'mistral-small3.2:latest')).toBe(false);
    });

    it('urteilt nicht ins Blaue, wenn kein Modell gesetzt ist', () => {
        expect(istGepruefteKonfiguration('ollama', undefined)).toBe(false);
        expect(istGepruefteKonfiguration(undefined, 'qwen3.6:35b')).toBe(false);
    });
});

describe('aktivesModell', () => {
    /**
     * Jeder Anbieter fuehrt sein Modell in einem eigenen Feld. Griffe die Anzeige
     * immer auf dasselbe Feld zu, waere der Hinweis bei zwei von drei Anbietern
     * wirkungslos — genau die Fehlerklasse, die dieses Projekt wiederholt getroffen hat.
     */
    it('liest das Modell aus dem Feld des jeweiligen Anbieters', () => {
        const settings = { ollamaModel: 'qwen3.6:35b', openaiModel: 'Qwen3.6-35B-A3B-FP8', model: 'mistral-medium-2604' };

        expect(aktivesModell({ ...settings, provider: 'ollama' })).toBe('qwen3.6:35b');
        expect(aktivesModell({ ...settings, provider: 'openai-compatible' })).toBe('Qwen3.6-35B-A3B-FP8');
        expect(aktivesModell({ ...settings, provider: 'mistral' })).toBe('mistral-medium-2604');
    });
});
