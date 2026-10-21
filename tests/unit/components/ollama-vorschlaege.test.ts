import { OLLAMA_VORSCHLAEGE, EMPFOHLENES_OLLAMA_MODELL } from '@/components/settings/ollama-vorschlaege';
import { istGepruefteKonfiguration } from '@/lib/ai/gepruefte-konfiguration';

/**
 * Die Empfehlung im Einstellungsmenue ist zugleich die Voreinstellung fuer
 * Nutzer, die noch kein Modell gewaehlt haben (seit 21.10.2026: Qwen 3.8).
 * Sie darf deshalb nur ein geprueftes Modell sein — sonst landet, wer nichts
 * waehlt, unbemerkt auf einer ungemessenen Konfiguration.
 */
describe('Ollama-Vorschlaege', () => {
    it('setzt den ersten Vorschlag als Voreinstellung', () => {
        expect(EMPFOHLENES_OLLAMA_MODELL).toBe(OLLAMA_VORSCHLAEGE[0].id);
    });

    it('empfiehlt genau einen Vorschlag, und zwar den ersten', () => {
        const empfohlen = OLLAMA_VORSCHLAEGE.filter(v => v.desc.startsWith('Empfohlen'));
        expect(empfohlen.map(v => v.id)).toEqual([EMPFOHLENES_OLLAMA_MODELL]);
    });

    it('empfiehlt nur eine gepruefte Konfiguration', () => {
        expect(istGepruefteKonfiguration('ollama', EMPFOHLENES_OLLAMA_MODELL)).toBe(true);
    });
});
