import { findFreeName } from '../../src/lib/services/profile-naming';
/**
 * Kopieren darf nichts überschreiben
 * 📄🛡️
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. Der Knopf „Erfahrungsschatz kopieren" vergab
 * immer denselben Namen („Kopie von X"). Der Schreibpfad `addLocalMemory` sucht
 * per `isSameName` und überschreibt bei einem Treffer. Zweimal kopieren hieß
 * damit: die erste Kopie ist weg — wortlos, samt der Arbeit, die inzwischen
 * daran hängt.
 *
 * Eine Rückfrage wäre hier das falsche Mittel: Wer „kopieren" klickt, will eine
 * ZWEITE haben, keine Entscheidung über die erste.
 */
describe('findFreeName', () => {
    const liste = (...namen: string[]) => namen.map(name => ({ name }));

    it('nimmt den Wunschnamen, wenn er frei ist', () => {
        expect(findFreeName(liste('Andere'), 'Kopie von A')).toBe('Kopie von A');
    });

    /** DER BEFUND. */
    it('weicht aus, statt den bestehenden Eintrag zu treffen', () => {
        expect(findFreeName(liste('Kopie von A'), 'Kopie von A')).toBe('Kopie von A (2)');
    });

    it('zaehlt weiter, solange belegt ist', () => {
        const vorhanden = liste('Kopie von A', 'Kopie von A (2)', 'Kopie von A (3)');

        expect(findFreeName(vorhanden, 'Kopie von A')).toBe('Kopie von A (4)');
    });

    /** Dieselbe Schreibweisen-Regel wie beim Überschreiben — sonst klaffen sie auseinander. */
    it('erkennt Namensgleichheit unabhaengig von Gross- und Kleinschreibung', () => {
        expect(findFreeName(liste('kopie VON a'), 'Kopie von A')).toBe('Kopie von A (2)');
    });

    it('bleibt auch bei sehr vielen Kopien eindeutig', () => {
        const vorhanden = ['Kopie von A', ...Array.from({ length: 98 }, (_, i) => `Kopie von A (${i + 2})`)]
            .map(name => ({ name }));

        const frei = findFreeName(vorhanden, 'Kopie von A');

        expect(vorhanden.some(v => v.name === frei)).toBe(false);
    });
});
