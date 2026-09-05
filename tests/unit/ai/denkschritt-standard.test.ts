/**
 * Waechter: Ein nicht gesetzter Denkschritt heisst AN — und es gibt EINEN Schalter. 💭
 *
 * ANLASS (05.09.2026). Beim Testen zeigte der Schalter "Deep Reasoning" im Anbieter-
 * Panel AUS, obwohl der Betrieb den Denkschritt ausfuehrte. Die Ursache war nicht ein
 * falscher gespeicherter Wert, sondern verschiedene Lesarten desselben `undefined`:
 *
 * | Stelle                          | undefined bedeutete |
 * |---------------------------------|---------------------|
 * | `useAiProfiles` (KI-Intelligenz)| an                  |
 * | Ollama-Pfad                     | an                  |
 * | OpenAI-Pfad (Korrektur)         | an                  |
 * | Schalter im Anbieter-Panel      | **aus**             |
 * | Speicherweg `AiConfigurationContent` | **aus, und schrieb das fest** |
 *
 * Der Schalter im Anbieter-Panel ist deshalb ENTFALLEN, nicht repariert worden: Er war
 * eine zweite Bedienung fuer denselben Wert, und die richtige steht im KI-Intelligenz-
 * Modal. Zwei Schalter fuer einen Wert brauchen keine Abstimmung, sondern einen Schalter.
 *
 * Der Speicherweg blieb — dort war das harte `false` der eigentliche Schaden: Wer den
 * Einrichtungsdialog einmal durchlief, schaltete den Denkschritt ungewollt ab. Am
 * 24.08.2026 wurde er als der Schalter mit dem groessten Einfluss auf die Genauigkeit
 * gemessen.
 */
import fs from 'fs';
import path from 'path';
import { denkschrittAktiv } from '@/lib/ai/temperature-guidance';

const lies = (datei: string) => fs.readFileSync(path.join(process.cwd(), datei), 'utf-8');

describe('denkschrittAktiv', () => {
    it('liest einen ungesetzten Wert als an', () => {
        expect(denkschrittAktiv(undefined)).toBe(true);
        expect(denkschrittAktiv(null)).toBe(true);
    });

    /** Ein ausdrueckliches Aus bleibt Aus — der Rueckfall darf keine Wahl ueberschreiben. */
    it('respektiert eine ausdrueckliche Wahl in beide Richtungen', () => {
        expect(denkschrittAktiv(false)).toBe(false);
        expect(denkschrittAktiv(true)).toBe(true);
    });
});

describe('Speicherweg', () => {
    /**
     * Hier stand `settings.enableThinking || false`. Der Ausdruck sieht harmlos aus und
     * ist es fuer jeden gesetzten Wert auch — er schlaegt genau dann zu, wenn nie jemand
     * etwas gewaehlt hat, und macht aus "nicht entschieden" ein gespeichertes Nein.
     */
    it('schreibt ein ungesetztes Feld nicht als Nein fest', () => {
        const inhalt = lies('src/components/AiConfigurationContent.tsx');

        expect(inhalt).toContain('denkschrittAktiv(settings.enableThinking)');
        expect(inhalt).not.toMatch(/settings\.enableThinking\s*\|\|/);
    });
});

describe('Nur ein Ort fuer die Bedienung', () => {
    it('das KI-Intelligenz-Modal traegt den Schalter', () => {
        expect(lies('src/components/settings/AiProfileModules.tsx')).toContain('Deep Reasoning');
    });

    /**
     * Kommt der zweite Schalter zurueck, faengt die Divergenz von vorne an — nicht
     * unbedingt mit demselben Rueckfall, aber mit demselben Muster.
     */
    it.each([
        'src/components/settings/OpenAICompatibleConfig.tsx',
        'src/components/settings/MistralConfig.tsx',
        'src/components/settings/OllamaConfig.tsx'
    ])('%s bedient den Denkschritt nicht selbst', datei => {
        const inhalt = lies(datei);

        expect(inhalt).not.toContain('Deep Reasoning');
        expect(inhalt).not.toMatch(/onSave\(\{[^}]*enableThinking/);
    });
});
