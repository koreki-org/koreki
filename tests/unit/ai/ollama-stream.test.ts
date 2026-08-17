import { leseOllamaStream } from '../../../src/lib/ai/ollama-stream';

/**
 * Antwort von Ollama zusammensetzen (Layer 1)
 * 📥
 *
 * Ollama streamt zeilenweise JSON. Ein Datenpaket endet aber selten auf einer
 * Zeilengrenze — die halbe Zeile am Ende muss aufgehoben und vorne an das
 * naechste Paket geklebt werden.
 *
 * REGRESSION, 17.08.2026. Der Node-Zweig (serverseitig: Community und SaaS) tat
 * das nicht. Er zerlegte jedes Paket fuer sich und warf weg, was ueber die
 * Grenze reichte — an JEDER Grenze, nicht nur am Ende. Im Bewertungstext fehlte
 * damit potenziell mitten im Satz ein Stueck, und weil das Ergebnis gueltiges
 * JSON blieb, fiel es nirgends auf.
 *
 * Ursache war eine Kopie: Web- und Node-Zweig standen untereinander, mit
 * derselben Schleife zweimal ausgeschrieben. Nur eine der beiden Fassungen
 * wurde je nachgebessert. Der Duplikat-Waechter konnte das nicht sehen — er
 * vergleicht ueber Dateigrenzen, nicht innerhalb einer Datei.
 */

/** Ollama-Zeile, wie sie tatsaechlich ueber die Leitung geht. */
const zeile = (text: string) => JSON.stringify({ message: { content: text } }) + '\n';

/** Node-Rumpf: liefert Zeichenketten-Pakete. */
const alsNodeStream = (pakete: string[]) => ({
    async *[Symbol.asyncIterator]() {
        for (const p of pakete) yield { toString: () => p };
    }
});

/** Web-Rumpf: liefert Bytes ueber einen Reader. */
const alsWebStream = (pakete: string[]) => {
    const encoder = new TextEncoder();
    let i = 0;
    return {
        getReader: () => ({
            read: async () =>
                i < pakete.length
                    ? { done: false, value: encoder.encode(pakete[i++]) }
                    : { done: true, value: undefined }
        })
    };
};

describe.each([
    ['Node-Stream', alsNodeStream],
    ['Web-Stream', alsWebStream]
])('leseOllamaStream (%s)', (_name, alsStream) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lese = (pakete: string[]) => leseOllamaStream(alsStream(pakete) as any);

    it('setzt saubere Zeilen zusammen', async () => {
        expect(await lese([zeile('Hallo '), zeile('Welt')])).toBe('Hallo Welt');
    });

    /**
     * DER FALL, DER SERVERSEITIG VERLOREN GING. Die Zeile ist ueber zwei Pakete
     * verteilt — genau das passiert bei laengeren Antworten unter Last.
     */
    it('haelt eine Zeile zusammen, die ueber eine Paketgrenze reicht', async () => {
        const komplett = zeile('vollstaendiger Satz');
        const schnitt = Math.floor(komplett.length / 2);
        expect(await lese([komplett.slice(0, schnitt), komplett.slice(schnitt)]))
            .toBe('vollstaendiger Satz');
    });

    it('haelt auch eine ueber drei Pakete verteilte Zeile zusammen', async () => {
        const k = zeile('drei Teile');
        const d = Math.floor(k.length / 3);
        expect(await lese([k.slice(0, d), k.slice(d, 2 * d), k.slice(2 * d)])).toBe('drei Teile');
    });

    /** Ohne abschliessenden Zeilenumbruch darf das letzte Stueck nicht wegfallen. */
    it('wertet die letzte Zeile ohne Zeilenumbruch aus', async () => {
        const ohneUmbruch = zeile('Schluss').trimEnd();
        expect(await lese([ohneUmbruch])).toBe('Schluss');
    });

    /** Ollama mischt Statusobjekte ohne `message` in den Strom. */
    it('uebergeht Zeilen ohne Inhalt', async () => {
        const gemischt = [
            zeile('A'),
            JSON.stringify({ done: false, model: 'llama3' }) + '\n',
            '\n',
            zeile('B')
        ];
        expect(await lese(gemischt)).toBe('AB');
    });

    it('uebergeht unlesbare Zeilen, statt abzubrechen', async () => {
        expect(await lese([zeile('A'), 'kein JSON\n', zeile('B')])).toBe('AB');
    });

    it('liefert bei leerem Strom eine leere Zeichenkette', async () => {
        expect(await lese([])).toBe('');
    });
});

it('liefert ohne Antwortkoerper eine leere Zeichenkette', async () => {
    expect(await leseOllamaStream(null)).toBe('');
    expect(await leseOllamaStream(undefined)).toBe('');
});
