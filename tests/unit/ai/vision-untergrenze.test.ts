/**
 * Waechter: Eine Untergrenze fuer die Bilderkennung — Qwen frei, andere lokal 0.4.
 *
 * ANLASS (30.10.2026). Temperatur 0.4 und `repeat_penalty` 1.2 kosteten Qwen messbar
 * Lesequalitaet; Gemma blieb ohne Untergrenze aber haengen. Berechnung, Hook und
 * Regler im Modal lesen deshalb dieselbe Funktion — die Lehrkraft soll keine Zahl
 * sehen, mit der nicht gerechnet wird.
 */
import { berechneSamplingParameter } from '../../../src/lib/ai/ollama-sampling';
import { VISION_TEMPERATURE_MINIMUM, visionTemperaturUntergrenze } from '../../../src/lib/ai/temperature-guidance';
import type { AppSettings } from '../../../src/types';

const sampling = (model: string, action: 'vision' | 'correction' = 'vision') => berechneSamplingParameter({
    action,
    model,
    settings: { visionTemperature: 0, temperature: 0.1 } as AppSettings,
    promptCharCount: 100,
    imageCount: 1,
    hasResponseSchema: false
});

describe('visionTemperaturUntergrenze', () => {
    it('ist fuer Qwen auf Ollama und OpenAI-kompatibel 0', () => {
        expect(visionTemperaturUntergrenze('ollama', 'qwen3.8:27b-mtp-q4_K_M')).toBe(0);
        expect(visionTemperaturUntergrenze('openai-compatible', 'Qwen3.8-27B-NVFP4')).toBe(0);
    });

    it('bleibt fuer andere lokale Modelle', () => {
        expect(visionTemperaturUntergrenze('ollama', 'gemma4:12b')).toBe(VISION_TEMPERATURE_MINIMUM);
    });

    it('gilt nicht fuer Mistral', () => {
        expect(visionTemperaturUntergrenze('mistral', 'mistral-medium-2604')).toBe(0);
    });
});

describe('Bilderkennung auf Ollama', () => {
    it('Qwen liest kalt und ohne Wiederholungsbremse', () => {
        const s = sampling('qwen3.8:27b-mtp-q4_K_M');
        expect(s.temperature).toBe(0);
        expect(s.repeatPenalty).toBe(1.0);
    });

    it('andere Modelle behalten Untergrenze und Bremse', () => {
        const s = sampling('gemma4:12b');
        expect(s.temperature).toBe(VISION_TEMPERATURE_MINIMUM);
        expect(s.repeatPenalty).toBe(1.2);
    });

    it('die Bewertung bleibt unberuehrt', () => {
        expect(sampling('qwen3.8:27b-mtp-q4_K_M', 'correction').repeatPenalty).toBe(1.15);
    });
});
