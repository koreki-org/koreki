/**
 * Die Namensrettung in der ZUORDNUNG (Clean & Map) — und die Punktangabe im Namen.
 *
 * ANLASS (10.11.2026). qwen3.8 gab in der Zuordnung die Namen so zurueck, wie der
 * Prompt die Aufgaben auflistet: "Aufgabe 3.1 (1 P)" statt "Aufgabe 3.1". Der Inhalt
 * war vollstaendig richtig. `parseMappingResult` verglich aber zeichengenau und
 * verzieh nur Gross-/Kleinschreibung — JEDE Aufgabe des Blatts wurde wortlos zu
 * "[unbeantwortet]", die Korrektur vergab ueberall 0 Punkte mit voller Sicherheit.
 *
 * Die Korrektur hatte die sorgfaeltige Rettung (`findeKiAufgabe`) schon; die Zuordnung
 * nutzt jetzt dieselbe. Dazu faellt die Punktangabe vor dem Vergleich weg: Mit ihr
 * wurde "Aufgabe 1 (2 P)" zum Kern "12p" und passte auf "Aufgabe 1" UND "Aufgabe 12".
 */
import { parseMappingResult } from '../../../src/lib/ai/ai-orchestrator';
import { alsKern } from '../../../src/lib/ai/aufgabenname-zuordnung';
import type { Task } from '../../../src/types';

const layout = (...namen: string[]) => namen.map(name => ({ name, maxPoints: 2 } as Task));
const antwort = (...paare: [string, string][]) => ({ tasks: paare.map(([name, content]) => ({ name, content })) });

describe('Punktangabe im Aufgabennamen', () => {
    it.each([
        ['Aufgabe 3.1 (1 P)', '31'],
        ['Aufgabe 2.1 (Max: 4 P)', '21'],
        ['Aufgabe 1 (2,5 Punkte)', '1'],
        ['Aufgabe 4a (3 Pkt.)', '4a'],
        ['Task 2 (2 points)', '2'],
    ])('"%s" hat den Kern "%s"', (name, kern) => {
        expect(alsKern(name)).toBe(kern);
    });

    /** Nur eine Punktangabe faellt weg — eine Klammer mit anderem Inhalt gehoert zum Namen. */
    it('laesst andere Klammern stehen', () => {
        expect(alsKern('Aufgabe 2 (Zusatz)')).toBe('2zusatz');
        expect(alsKern('Aufgabe (b)')).toBe('b');
    });
});

describe('parseMappingResult rettet veraenderte Namen wie die Korrektur', () => {
    it('der Fall vom 10.11.2026: Punktangabe an jedem Namen', () => {
        const ergebnis = parseMappingResult(
            antwort(['Aufgabe 3.1 (1 P)', 'm = 1'], ['Aufgabe 3.2 (3 P)', '[EINTRAGUNG: Beschriftung "g" | gerade Linie | …]']),
            layout('Aufgabe 3.1', 'Aufgabe 3.2')
        );

        expect(ergebnis.tasks?.map(t => t.name)).toEqual(['Aufgabe 3.1', 'Aufgabe 3.2']);
        expect(ergebnis.tasks?.[0].content).toContain('m = 1');
        expect(ergebnis.tasks?.[1].content).toContain('[EINTRAGUNG');
        expect(ergebnis.tasks?.[0].content).toContain('[KI-FEHLER?]');
    });

    /** Der gefaehrliche Fall, den die Punktangabe vorher erst erzeugt hat. */
    it('"Aufgabe 1 (2 P)" geht an Aufgabe 1, nicht an Aufgabe 12', () => {
        const ergebnis = parseMappingResult(
            antwort(['Aufgabe 1 (2 P)', 'eins'], ['Aufgabe 12 (2 P)', 'zwoelf']),
            layout('Aufgabe 1', 'Aufgabe 12')
        );

        expect(ergebnis.tasks?.[0].content).toContain('eins');
        expect(ergebnis.tasks?.[0].content).not.toContain('zwoelf');
        expect(ergebnis.tasks?.[1].content).toContain('zwoelf');
    });

    it('der exakte Name bleibt ohne Hinweis', () => {
        const ergebnis = parseMappingResult(antwort(['Aufgabe 1', 'Text']), layout('Aufgabe 1'));

        expect(ergebnis.tasks?.[0]).toEqual({ name: 'Aufgabe 1', content: 'Text' });
    });

    it('nur Gross-/Kleinschreibung abweichend: weiterhin gerettet, mit Hinweis', () => {
        const ergebnis = parseMappingResult(antwort(['aufgabe 1', 'Text']), layout('Aufgabe 1'));

        expect(ergebnis.tasks?.[0].content).toContain('[KI-FEHLER?] Name nicht exakt');
        expect(ergebnis.tasks?.[0].content).toContain('Text');
    });

    it('mehrdeutig: keine Zuordnung, sondern "[unbeantwortet]"', () => {
        const ergebnis = parseMappingResult(antwort(['Aufgabe 1a', 'x'], ['Aufgabe 1b', 'y']), layout('Aufgabe 1'));

        expect(ergebnis.tasks?.[0].content).toBe('[unbeantwortet]');
    });

    it('eine wirklich fehlende Aufgabe bleibt "[unbeantwortet]"', () => {
        const ergebnis = parseMappingResult(antwort(['Aufgabe 1', 'x']), layout('Aufgabe 1', 'Aufgabe 2'));

        expect(ergebnis.tasks?.[1]).toEqual({ name: 'Aufgabe 2', content: '[unbeantwortet]' });
    });
});
