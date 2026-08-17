import {
    parseLlmJson,
    stripThinkingBlocks,
    extractJsonCandidate,
    repairTruncatedJson,
    LlmJsonParseError
} from '../../../../src/lib/ai/llm-json';

/**
 * Gemeinsame JSON-Entnahme aus Modell-Antworten (Layer 1)
 * 🧩
 *
 * Diese Datei bewacht die Zusammenlegung zweier vorher getrennter
 * Implementierungen (ollama-logic und openai-provider). Der Punkt der
 * Zusammenlegung war NICHT weniger Code, sondern dass beide Anbieter dieselben
 * Faehigkeiten bekommen: jede Kopie konnte etwas, das der anderen fehlte.
 *
 * Die Faelle unten sind deshalb nach Herkunft sortiert — wer eine Zeile
 * loescht, sieht daran, welchem Anbieter er die Faehigkeit wieder wegnimmt.
 */
describe('parseLlmJson', () => {
    it('liest sauberes JSON unveraendert', () => {
        expect(parseLlmJson('{"tasks": []}')).toEqual({ tasks: [] });
    });

    it('liest ein Feld auf oberster Ebene', () => {
        expect(parseLlmJson('[{"name": "A"}]')).toEqual([{ name: 'A' }]);
    });

    it('holt JSON aus einem Markdown-Block', () => {
        const antwort = 'Hier das Ergebnis:\n```json\n{"punkte": 3}\n```\nViel Erfolg!';
        expect(parseLlmJson(antwort)).toEqual({ punkte: 3 });
    });

    /**
     * DER FALL, DER VORHER SCHEITERTE.
     *
     * ollama-logic entfernte `<thought>` und `<reasoning>`, aber nicht
     * `<think>` — die Schreibweise von Qwen3, also genau dem Modell, das ueber
     * den lokalen Pfad laeuft. Enthaelt der Denkblock selbst eine geschweifte
     * Klammer, greift die gierige Extraktion mitten hinein und beide
     * Parse-Versuche schlagen fehl. Ergebnis fuer den Lehrer: die Korrektur
     * bricht mit "JSON-Parse fehlgeschlagen" ab.
     */
    it('ueberspringt einen <think>-Block, der selbst Klammern enthaelt', () => {
        const antwort = [
            '<think>',
            'Der Schueler nennt {"name": "Aufgabe 1"} als Beispiel.',
            'Also: 2 von 3 Punkten.',
            '</think>',
            '{"tasks": [{"name": "Aufgabe 1", "pointsObtained": 2}]}'
        ].join('\n');

        expect(parseLlmJson(antwort)).toEqual({
            tasks: [{ name: 'Aufgabe 1', pointsObtained: 2 }]
        });
    });

    it.each([
        ['<think>', '<think>Ueberlege {a:1}</think>'],
        ['<thought>', '<thought>Ueberlege {a:1}</thought>'],
        ['<reasoning>', '<reasoning>Ueberlege {a:1}</reasoning>'],
        ['<chain_of_thought>', '<chain_of_thought>Ueberlege {a:1}</chain_of_thought>'],
        ['<channel>', '<channel>Ueberlege {a:1}</channel>'],
        ['<annotation>', '<annotation>Ueberlege {a:1}</annotation>'],
        ['[thought]', '[thought]Ueberlege {a:1}[/thought]'],
        ['[think]', '[think]Ueberlege {a:1}[/think]']
    ])('entfernt den Denkblock in der Schreibweise %s', (_name, block) => {
        expect(parseLlmJson(block + '\n{"ok": true}')).toEqual({ ok: true });
    });

    /**
     * Reisst das Token-Budget mitten im Denkblock, fehlt das schliessende Tag.
     * Ohne die `|$`-Alternative bliebe der halbe Block stehen.
     */
    it('entfernt einen abgebrochenen Denkblock ohne schliessendes Tag', () => {
        expect(stripThinkingBlocks('<think>Ich ueberlege noch')).toBe('');
    });

    // --- Faehigkeiten, die vorher nur ollama-logic hatte ---------------------

    it('maskiert ein unmaskiertes Anfuehrungszeichen im Fliesstext', () => {
        const roh = '{"feedback": "Der Schueler nennt die klassische "Falle": zu frueh gerundet."}';
        const gelesen = parseLlmJson<{ feedback: string }>(roh);
        expect(gelesen.feedback).toContain('Falle');
    });

    /**
     * `\text` ist fuer JSON.parse ein Tabulator gefolgt von "ext". Ohne die
     * Rettung ist die Formel in der Musterloesung danach unlesbar.
     */
    it('rettet einfach maskierte LaTeX-Befehle', () => {
        const roh = '{"formel": "\\text{Umfang} = 2\\pi r"}';
        const gelesen = parseLlmJson<{ formel: string }>(roh);
        expect(gelesen.formel).toContain('text{Umfang}');
    });

    // --- Faehigkeit, die vorher nur openai-provider hatte --------------------

    /**
     * Bei einer abgeschnittenen Antwort ist das angefangene Feld verloren, der
     * Rest aber nicht. Fuer eine Korrektur ist das der Unterschied zwischen
     * "zwei von drei Aufgaben bewertet" und "gar nichts".
     */
    it('schliesst eine mitten im Satz abgeschnittene Antwort', () => {
        const roh = '{"tasks": [{"name": "A", "pointsObtained": 2}, {"name": "B", "pointsObt';
        const gelesen = parseLlmJson<{ tasks: { name: string }[] }>(roh);
        expect(gelesen.tasks[0]).toEqual({ name: 'A', pointsObtained: 2 });
    });

    it('entfernt ein Komma vor der schliessenden Klammer', () => {
        expect(parseLlmJson('{"a": 1, "b": 2,}')).toEqual({ a: 1, b: 2 });
    });

    // --- Fehlerfall ----------------------------------------------------------

    it('wirft LlmJsonParseError mit Anfang, Ende und Laenge der Antwort', () => {
        const muell = 'Ich kann diese Aufgabe leider nicht bewerten.';
        expect(() => parseLlmJson(muell)).toThrow(LlmJsonParseError);
        try {
            parseLlmJson(muell);
        } catch (e) {
            const fehler = e as LlmJsonParseError;
            expect(fehler.message).toContain('Länge: ' + muell.length);
            // Die Rohantwort haengt am Fehler, damit der Aufrufer sie
            // diagnostizieren kann, ohne sie irgendwo hinschreiben zu muessen.
            expect(fehler.rawResponse).toBe(muell);
        }
    });
});

describe('extractJsonCandidate', () => {
    it('bevorzugt den Markdown-Block vor dem umgebenden Fliesstext', () => {
        const text = 'Vorwort {nicht das hier}\n```json\n{"richtig": true}\n```';
        expect(extractJsonCandidate(text)).toBe('{"richtig": true}');
    });

    it('erkennt ein Feld, wenn die eckige Klammer zuerst kommt', () => {
        expect(extractJsonCandidate('Antwort: [1, 2, 3] Ende')).toBe('[1, 2, 3]');
    });
});

describe('repairTruncatedJson', () => {
    it('schliesst offene Klammern in der richtigen Reihenfolge', () => {
        expect(repairTruncatedJson('{"a": [1, 2')).toBe('{"a": [1, 2]}');
    });

    it('laesst vollstaendiges JSON unveraendert', () => {
        const vollstaendig = '{"a": [1, 2]}';
        expect(repairTruncatedJson(vollstaendig)).toBe(vollstaendig);
    });

    /**
     * Der teuerste Fehler in dieser Datei, deshalb ein eigener Fall.
     *
     * Die gierige Entnahme schneidet bei der letzten schliessenden Klammer ab.
     * Danach steht oft ein VOLLSTAENDIGES Feld am Ende und es fehlen nur die
     * Klammern. Wer das Verwerfen des angefangenen Feldes bedingungslos
     * ausfuehrt, loescht dieses vollstaendige Feld — heraus kommt gueltiges
     * JSON mit einer fehlenden Bewertung. Der Parser meldet nichts, der Lehrer
     * sieht eine Aufgabe ohne Punkte und sucht den Fehler bei sich.
     */
    it('verwirft kein vollstaendiges Feld, wenn nur Klammern fehlen', () => {
        const nurKlammernFehlen = '{"tasks": [{"name": "A", "pointsObtained": 2}';
        expect(repairTruncatedJson(nurKlammernFehlen))
            .toBe('{"tasks": [{"name": "A", "pointsObtained": 2}]}');
    });

    it('verwirft das angefangene Feld, wenn der Text im String endet', () => {
        expect(repairTruncatedJson('{"a": 1, "b": "unfertig'))
            .toBe('{"a": 1}');
    });
});
