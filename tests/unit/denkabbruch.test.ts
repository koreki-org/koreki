import {
    addiereVerbrauch,
    antwortAusFortsetzung,
    baueFortsetzung,
    bisZumLetztenSatz,
    DENKABSCHLUSS_SATZ,
    denktextAus,
    istDenkabbruch
} from '../../src/lib/ai/denkabbruch';
import type { ChatAnfrage } from '../../src/lib/ai/chat-types';

/**
 * Denkabbruch: Qwen 3.8 beendet seine Antwort mitten im Denken (vLLM #55420).
 * Die Fortsetzung schliesst das vorhandene Denken ab, statt neu zu wuerfeln.
 * Hintergrund in `src/lib/ai/denkabbruch.ts`.
 */
describe('Denkabbruch', () => {
    describe('istDenkabbruch', () => {
        const abgebrochen = { role: 'assistant' as const, content: null, reasoning_content: 'Ich pruefe a) ...' };

        it('erkennt leeren Inhalt mit Denktext nach stop', () => {
            expect(istDenkabbruch(abgebrochen, 'stop', true)).toBe(true);
        });

        it('erkennt auch den Kreisel bis zur Laengengrenze', () => {
            expect(istDenkabbruch(abgebrochen, 'length', true)).toBe(true);
        });

        it('liest das neuere Feld `reasoning` ebenso', () => {
            expect(istDenkabbruch({ role: 'assistant', content: '', reasoning: 'x' }, 'stop', true)).toBe(true);
        });

        it('nicht, wenn der Denkschritt aus war', () => {
            expect(istDenkabbruch(abgebrochen, 'stop', false)).toBe(false);
        });

        it('nicht, wenn Inhalt da ist', () => {
            expect(istDenkabbruch({ ...abgebrochen, content: '{"a":1}' }, 'stop', true)).toBe(false);
        });

        it('nicht ohne Denktext — dort gibt es nichts fortzusetzen', () => {
            expect(istDenkabbruch({ role: 'assistant', content: '' }, 'stop', true)).toBe(false);
        });

        it('nicht bei einem Filter — das ist eine Sperre, kein Abbruch', () => {
            expect(istDenkabbruch(abgebrochen, 'content_filter', true)).toBe(false);
        });
    });

    describe('bisZumLetztenSatz', () => {
        it('schneidet einen halben Satz am Ende ab', () => {
            expect(bisZumLetztenSatz('Erster Satz. Zweiter Satz. Wenn der Schueler in'))
                .toBe('Erster Satz. Zweiter Satz.');
        });

        it('laesst Text ohne Satzende unveraendert', () => {
            expect(bisZumLetztenSatz('ohne Satzende')).toBe('ohne Satzende');
        });
    });

    describe('baueFortsetzung', () => {
        const anfrage: ChatAnfrage = {
            model: 'Qwen3.8-27B-NVFP4',
            messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }],
            response_format: { type: 'json_object' },
            seed: 42,
            chat_template_kwargs: { enable_thinking: true }
        };

        it('haengt das abgeschlossene Denken als Beginn der Antwort an', () => {
            const f = baueFortsetzung(anfrage, 'Gedanke eins. Halber');
            const letzte = f.messages[f.messages.length - 1];
            expect(letzte.role).toBe('assistant');
            expect(letzte.content).toBe(`<think>\nGedanke eins.\n\n${DENKABSCHLUSS_SATZ}\n</think>\n\n`);
        });

        it('setzt die Nachricht fort statt eine neue zu beginnen', () => {
            const f = baueFortsetzung(anfrage, 'x.');
            expect(f.continue_final_message).toBe(true);
            expect(f.add_generation_prompt).toBe(false);
        });

        it('aendert sonst nichts an der Anfrage — gleiche Konfiguration', () => {
            const f = baueFortsetzung(anfrage, 'x.');
            expect(f.model).toBe(anfrage.model);
            expect(f.seed).toBe(42);
            expect(f.response_format).toEqual(anfrage.response_format);
            expect(f.chat_template_kwargs).toEqual(anfrage.chat_template_kwargs);
            expect(f.messages.slice(0, 2)).toEqual(anfrage.messages);
        });

        it('veraendert die urspruengliche Anfrage nicht', () => {
            baueFortsetzung(anfrage, 'x.');
            expect(anfrage.messages).toHaveLength(2);
        });
    });

    describe('antwortAusFortsetzung', () => {
        it('nimmt das Antwortfeld, wenn es gefuellt ist', () => {
            expect(antwortAusFortsetzung({ role: 'assistant', content: '{"a":1}', reasoning_content: 'egal' })).toBe('{"a":1}');
        });

        /** Mittwalds vLLM sortiert die Fortsetzung als Denktext ein (gemessen 19.10.2026). */
        it('nimmt sonst das Denkfeld — dort liegt die Antwort bei Mittwald', () => {
            expect(antwortAusFortsetzung({ role: 'assistant', content: null, reasoning_content: '{"a":1}' })).toBe('{"a":1}');
        });

        it('liefert leer, wenn beides leer ist', () => {
            expect(antwortAusFortsetzung({ role: 'assistant', content: '' })).toBe('');
        });
    });

    describe('denktextAus', () => {
        it('bevorzugt reasoning_content und kommt ohne Nachricht aus', () => {
            expect(denktextAus({ role: 'assistant', content: null, reasoning_content: ' a ', reasoning: 'b' })).toBe('a');
            expect(denktextAus(undefined)).toBe('');
        });
    });

    describe('addiereVerbrauch', () => {
        it('zaehlt beide Aufrufe', () => {
            expect(addiereVerbrauch({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, { prompt_tokens: 20, completion_tokens: 3, total_tokens: 23 }))
                .toEqual({ prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 });
        });

        it('kommt mit fehlendem Verbrauch zurecht', () => {
            expect(addiereVerbrauch(undefined, { completion_tokens: 3 })).toEqual({ completion_tokens: 3 });
            expect(addiereVerbrauch({ completion_tokens: 3 }, undefined)).toEqual({ completion_tokens: 3 });
        });
    });
});
