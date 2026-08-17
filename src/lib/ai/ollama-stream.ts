/**
 * Die Antwort von Ollama zusammensetzen.
 * 📥
 *
 * Ollama streamt zeilenweise JSON: ein Objekt je Zeile, der Text steckt in
 * `message.content`. Erst alle Zeilen zusammen ergeben die Antwort.
 *
 * Zwei Dinge machen das fehleranfaellig:
 *
 * 1. Ein Datenpaket endet selten auf einer Zeilengrenze. Die letzte, halbe
 *    Zeile muss aufgehoben und vorne an das naechste Paket geklebt werden —
 *    sonst faellt sie als unlesbar durch, und im Bewertungstext fehlt
 *    mittendrin ein Stueck, ohne dass irgendwo ein Fehler auftaucht.
 * 2. Der Antwortkoerper sieht im Browser anders aus als in Node. Unterschieden
 *    wird an `getReader`, weil nur der Web-Stream ihn hat.
 *
 * WARUM DIESE DATEI EXISTIERT
 * ---------------------------
 * Beide Zweige standen in `ollama-logic.ts` untereinander — mit derselben
 * Zeilen-Schleife, zweimal ausgeschrieben. Der Duplikat-Waechter sieht das
 * nicht: er vergleicht ueber Dateigrenzen, nicht innerhalb einer Datei.
 *
 * Und sie waren bereits auseinandergelaufen: nur der Web-Zweig hob ueberhaupt
 * eine halbe Zeile auf. Der Node-Zweig zerlegte jedes Paket fuer sich und warf
 * weg, was ueber die Paketgrenze reichte — nicht nur am Ende, sondern an JEDER
 * Grenze. Serverseitig fehlte damit potenziell mitten im Bewertungstext ein
 * Stueck, und weil das Ergebnis gueltiges JSON blieb, fiel es nirgends auf.
 */

/** Der Lesezugriff eines Web-Streams — im Node-Zweig gibt es ihn nicht. */
type WebStreamKoerper = { getReader: () => ReadableStreamDefaultReader<Uint8Array> };

/**
 * Zieht `message.content` aus einer Sammlung von JSON-Zeilen.
 *
 * Unlesbare Zeilen werden still uebergangen: Ollama mischt Statusobjekte ohne
 * `message` in den Strom, und eine abgeschnittene Zeile ist normal — die
 * gehoert dem naechsten Durchlauf.
 */
function sammleAusZeilen(zeilen: string[]): string {
    let text = '';
    for (const zeile of zeilen) {
        const sauber = zeile.trim();
        if (!sauber) continue;
        try {
            const geparst = JSON.parse(sauber);
            if (geparst.message?.content) {
                text += geparst.message.content;
            }
        } catch {
            // Kein vollstaendiges JSON-Objekt — nichts beizutragen.
        }
    }
    return text;
}

/**
 * Liest den gestreamten Antwortkoerper vollstaendig aus.
 *
 * @param koerper Der Rumpf der `fetch`-Antwort, in welcher Form auch immer.
 */
export async function leseOllamaStream(koerper: unknown): Promise<string> {
    if (!koerper) return '';

    let text = '';
    let rest = '';

    const verarbeite = (stueck: string): void => {
        const zeilen = (rest + stueck).split('\n');
        // Die letzte Zeile ist moeglicherweise unvollstaendig — aufheben.
        rest = zeilen.pop() || '';
        text += sammleAusZeilen(zeilen);
    };

    if (typeof (koerper as { getReader?: unknown }).getReader === 'function') {
        const reader = (koerper as WebStreamKoerper).getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            verarbeite(decoder.decode(value, { stream: true }));
        }
    } else {
        for await (const stueck of koerper as AsyncIterable<{ toString(): string }>) {
            verarbeite(stueck.toString());
        }
    }

    // Was nach dem letzten Zeilenumbruch stehen blieb, ist jetzt vollstaendig.
    text += sammleAusZeilen([rest]);
    return text;
}
