import { escapeInnerQuotes, repairJsonString } from '../../../../src/lib/ai/llm-json';

/** Repariert und parst — so wird die Kette benutzt. */
const parseRepaired = (raw: string) => JSON.parse(repairJsonString(raw));

describe('Ollama JSON Repair (Layer 1)', () => {
    describe('Regression: Zitat mit Doppelpunkt im Fließtext', () => {
        // Realer Fehlerfall: Das Modell liefert unmaskierte Anführungszeichen um "Falle".
        // Vor dem Fix wurde das schließende Anführungszeichen wegen des folgenden ":"
        // als Schlüsselende gelesen — JSON.parse brach mit
        // "Expected ',' or '}' after property value" ab.
        const payload = `{
  "tasks": [
    {
      "name": "Aufgabe 2b",
      "maxPoints": 2,
      "content": "Die Eaton 5PX 2200i ist die klassische "Falle": Ihre Wirkleistung würde ausreichen.",
      "suggestGraph": false
    }
  ]
}`;

        it('parses without throwing', () => {
            expect(() => parseRepaired(payload)).not.toThrow();
        });

        it('keeps the quoted word inside the content value', () => {
            const parsed = parseRepaired(payload);

            expect(parsed.tasks).toHaveLength(1);
            expect(parsed.tasks[0].content).toContain('"Falle":');
            expect(parsed.tasks[0].content).toContain('Ihre Wirkleistung würde ausreichen.');
        });

        it('does not damage the surrounding fields', () => {
            const parsed = parseRepaired(payload);

            expect(parsed.tasks[0].name).toBe('Aufgabe 2b');
            expect(parsed.tasks[0].maxPoints).toBe(2);
            expect(parsed.tasks[0].suggestGraph).toBe(false);
        });
    });

    describe('Struktur bleibt unangetastet', () => {
        it('leaves valid JSON byte-identical', () => {
            const valid = '{"tasks":[{"name":"Aufgabe 1","maxPoints":6,"content":"Ein Satz.","suggestGraph":true}]}';

            expect(escapeInnerQuotes(valid)).toBe(valid);
            expect(parseRepaired(valid)).toEqual(JSON.parse(valid));
        });

        it('keeps already escaped quotes intact', () => {
            const raw = '{"content":"er sagte \\"hallo\\" und ging"}';

            expect(parseRepaired(raw).content).toBe('er sagte "hallo" und ging');
        });

        it('handles string arrays where every element is a value', () => {
            const raw = '{"tags":["eins","zwei","drei"]}';

            expect(parseRepaired(raw).tags).toEqual(['eins', 'zwei', 'drei']);
        });

        it('still ends key strings at the colon', () => {
            const raw = '{"name":"Aufgabe 1","maxPoints":6}';

            expect(parseRepaired(raw)).toEqual({ name: 'Aufgabe 1', maxPoints: 6 });
        });
    });

    describe('Weitere Modellfehler', () => {
        it('repairs unescaped quotes followed by ordinary text', () => {
            const raw = '{"content":"das Prinzip "Striping" verteilt die Daten"}';

            expect(parseRepaired(raw).content).toBe('das Prinzip "Striping" verteilt die Daten');
        });

        it('repairs a missing comma between a value and the next key', () => {
            const raw = '{"name":"Aufgabe 1" "maxPoints":6}';

            expect(parseRepaired(raw)).toEqual({ name: 'Aufgabe 1', maxPoints: 6 });
        });

        it('doubles backslashes that are not valid JSON escapes', () => {
            // \O ist in JSON keine gültige Escape-Sequenz und wird daher verdoppelt.
            const raw = '{"content":"Pfad C:\\Ordner\\Datei"}';

            expect(parseRepaired(raw).content).toBe('Pfad C:\\Ordner\\Datei');
        });

        it('escapes real newlines inside a value', () => {
            const raw = '{"content":"Zeile eins\nZeile zwei"}';

            expect(parseRepaired(raw).content).toBe('Zeile eins\nZeile zwei');
        });

        it('handles a quoted word with colon inside a nested array of objects', () => {
            const raw = '{"tasks":[{"content":"Typ "Online": null ms Umschaltzeit"},{"content":"zweite Aufgabe"}]}';
            const parsed = parseRepaired(raw);

            expect(parsed.tasks).toHaveLength(2);
            expect(parsed.tasks[0].content).toContain('"Online":');
            expect(parsed.tasks[1].content).toBe('zweite Aufgabe');
        });
    });

    describe('Einfach maskiertes LaTeX', () => {
        // \t ist in JSON ein Tabulator, \f ein Seitenvorschub. Schreibt das Modell LaTeX
        // nur einfach maskiert, zerstörte JSON.parse den Befehl bisher stillschweigend.
        it('rescues commands that start with a JSON escape letter', () => {
            const raw = '{"content":"$$1.550\\text{ W} \\times 1,25 = 1.937,5\\text{ W}$$"}';

            expect(parseRepaired(raw).content).toContain('\\text{ W}');
            expect(parseRepaired(raw).content).toContain('\\times');
            expect(parseRepaired(raw).content).not.toContain('\t');
        });

        it('rescues a fraction that would otherwise become a form feed', () => {
            const raw = '{"content":"$$\\frac{768.000.000}{1.048.576} = 732,42$$"}';

            expect(parseRepaired(raw).content).toContain('\\frac{768.000.000}');
            expect(parseRepaired(raw).content).not.toContain('\f');
        });

        it('covers the other colliding leading letters', () => {
            const raw = '{"content":"\\beta \\nabla \\rightarrow \\bar{x}"}';
            const content = parseRepaired(raw).content;

            expect(content).toBe('\\beta \\nabla \\rightarrow \\bar{x}');
        });

        it('leaves already double-escaped LaTeX untouched', () => {
            const raw = '{"content":"$$1.550\\\\text{ W}$$"}';

            expect(parseRepaired(raw).content).toBe('$$1.550\\text{ W}$$');
        });

        it('still treats genuine control characters as control characters', () => {
            // \t vor beliebigem Text bleibt ein Tabulator — nur bekannte LaTeX-Befehle
            // werden gerettet, nicht jede Buchstabenfolge.
            const raw = '{"content":"Spalte1\\tSpalte2\\nZeile2"}';
            const content = parseRepaired(raw).content;

            expect(content).toContain('\t');
            expect(content).toContain('\n');
            expect(content).not.toContain('\\t');
        });

        it('does not rescue a look-alike that is not a known command', () => {
            const raw = '{"content":"\\telefon"}';

            expect(parseRepaired(raw).content).toContain('\t');
        });
    });

    describe('Bekannte Grenzen', () => {
        it('documents that a quote followed by a comma stays ambiguous', () => {
            // Lokaler Lookahead kann hier nicht zwischen Stringende und Fließtext
            // unterscheiden. Der Fall bleibt kaputt — bewusst festgehalten, damit eine
            // spätere Änderung sichtbar wird.
            const raw = '{"content":"er sagte "hallo", dann ging er"}';

            expect(() => parseRepaired(raw)).toThrow();
        });
    });
});
