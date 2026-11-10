/**
 * Zeichenaufgaben: Die Regeln fuer Zuordnung und Korrektur kommen NUR dann in den
 * Prompt, wenn die Bilderkennung eine Zeichnung als "[EINTRAGUNG: …]" gemeldet hat.
 *
 * Warum das wichtig ist (10.11.2026): Fest eingebaut haetten die Regeln jede
 * Arbeit begleitet, auch reine Textklausuren — mit unbekannter Wirkung auf deren
 * Bewertung. So bekommt eine Arbeit ohne Zeichnung exakt den bisherigen Prompt.
 */
import * as fs from 'fs';
import * as path from 'path';
import { buildCleanAndMapPrompt, buildCorrectionPrompt } from '../../../src/lib/ai/prompt-builder';
import { enthaeltEintragung, mitZeichenRegel } from '../../../src/lib/ai/eintragungen';
import type { Task } from '../../../src/types';

const PROMPTS = path.join(__dirname, '../../../src/prompts/core/default');
const lies = (datei: string) => fs.readFileSync(path.join(PROMPTS, datei), 'utf8');
const ZUORDNUNG = lies('eintragungen/zuordnung.md');
const KORREKTUR = lies('eintragungen/korrektur.md');

const layout = [{ name: 'Aufgabe 1', maxPoints: 2 }] as Task[];
const MIT = 'Zeichne die Kennlinie.\n[EINTRAGUNG: Beschriftung "C" | gerade Linie | durch (5|20)]';
const OHNE = 'Die Antwort ist 42.';

describe('enthaeltEintragung', () => {
    it('erkennt die Marke der Bilderkennung', () => {
        expect(enthaeltEintragung(MIT)).toBe(true);
        expect(enthaeltEintragung(OHNE)).toBe(false);
        expect(enthaeltEintragung(undefined)).toBe(false);
    });
});

describe('Zuordnung', () => {
    it('ohne Zeichnung: der unveraenderte Prompt', () => {
        expect(buildCleanAndMapPrompt(OHNE, layout).system).toBe(lies('analyze-and-map/system.md'));
    });

    it('mit Zeichnung: die Zuordnungsregel ist angehaengt', () => {
        const { system } = buildCleanAndMapPrompt(MIT, layout);
        expect(system).toContain(ZUORDNUNG.trim());
        expect(system).not.toContain(KORREKTUR.trim());
    });
});

describe('Korrektur', () => {
    it('ohne Zeichnung: keine Regel im Prompt', () => {
        const { system } = buildCorrectionPrompt('Musterloesung', OHNE, layout);
        expect(system).not.toContain('eintragungen_in_grafiken');
    });

    it('mit Zeichnung: die Korrekturregel ist angehaengt', () => {
        const { system } = buildCorrectionPrompt('Musterloesung', MIT, layout);
        expect(system).toContain(KORREKTUR.trim());
        expect(system).not.toContain(ZUORDNUNG.trim());
    });

    /** Eine Zeichnung allein in der Musterloesung macht den Schuelertext nicht zur Zeichnung. */
    it('Marke nur in der Musterloesung: keine Regel', () => {
        const { system } = buildCorrectionPrompt(MIT, OHNE, layout);
        expect(system).not.toContain('eintragungen_in_grafiken');
    });
});

it('mitZeichenRegel laesst den Prompt ohne Marke unberuehrt', () => {
    expect(mitZeichenRegel('SYSTEM', OHNE, 'korrektur')).toBe('SYSTEM');
});
