import { alsText } from '@/lib/ai/chat-types';

/**
 * Antwortinhalt der Chat-Anbieter (Layer 1)
 * 💬
 *
 * Denkmodelle antworten in Bausteinen statt mit einer Zeichenkette. Mistral
 * hat das behandelt, der OpenAI-Zweig nicht — dort landete die Liste in einem
 * Feld, das eine Zeichenkette erwartet. Aufgefallen ist es erst, als der Typ
 * dieses Feldes von `any` auf die echte Form umgestellt wurde.
 */
describe('alsText', () => {
    it('reicht eine gewoehnliche Zeichenkette durch', () => {
        expect(alsText('Die Antwort lautet 42.')).toBe('Die Antwort lautet 42.');
    });

    it('behaelt null als null', () => {
        expect(alsText(null)).toBeNull();
    });

    /** Der Fall, der im OpenAI-Zweig unbehandelt war. */
    it('setzt Bausteine zu einem Text zusammen', () => {
        expect(alsText([
            { type: 'text', text: '{"tasks": ' },
            { type: 'text', text: '[]}' }
        ])).toBe('{"tasks": []}');
    });

    /**
     * Ein Bildbaustein gehoert zur Anfrage, nicht zur Antwort — taucht er
     * trotzdem auf, darf er den Text nicht verunreinigen. Ein "[object Object]"
     * mitten im JSON macht die Antwort unlesbar.
     */
    it('ignoriert Bildbausteine', () => {
        expect(alsText([
            { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
            { type: 'text', text: 'Nur das hier zaehlt.' }
        ])).toBe('Nur das hier zaehlt.');
    });

    it('ergibt eine leere Zeichenkette, wenn kein Textbaustein dabei ist', () => {
        expect(alsText([
            { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } }
        ])).toBe('');
    });
});
