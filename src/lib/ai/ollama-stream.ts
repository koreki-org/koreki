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
 *
 * DER ABSCHLUSS IST PFLICHT (19.10.2026)
 * --------------------------------------
 * Ollama schliesst jede Antwort mit einer Zeile `"done": true` ab — auch wenn die
 * Laengengrenze greift (`done_reason: "length"`). Fehlt sie, hat der Server den
 * Strom mittendrin beendet. Gemessen an `qwen3.8`: Das Modell schrieb im JSON ein
 * gerades `"` nach einem deutschen „, die JSON-Vorgabe (`format: json`) liess
 * danach kein Zeichen mehr zu, und Ollama brach ohne Fehlermeldung ab. Der halbe
 * Text ging als Antwort durch, und die Aufgaben bekamen still 0 Punkte. Ein
 * sichtbarer Fehler ist einer falschen Punktzahl vorzuziehen.
 *
 * NACHTRAG (20.10.2026). Der Abbruch hat mehr als eine Ursache. Bei der
 * Bilderkennung stuerzte der Ollama-Prozess ab, weil der Grafikspeicher fuer ein
 * grosses Foto nicht reichte — dort gibt es gar keine JSON-Vorgabe. Die Meldung
 * nennt deshalb keine Ursache mehr, die sie nicht kennt. Schickt Ollama im Strom
 * selbst eine Fehlerzeile (`"error": …`), wird daraus ein `AIProviderError`: Der
 * Rohtext geht ins Server-Protokoll, die Lehrkraft bekommt die aufbereitete
 * Meldung aus `resolveAiHttpError`.
 */

import { AIProviderError } from './provider-error';

/** Ollama hat den Strom beendet, ohne die Antwort abzuschliessen. */
export class OllamaAbbruchFehler extends Error {
    constructor(zeichen: number) {
        super(
            `Ollama hat die Antwort nach ${zeichen} Zeichen abgebrochen, ohne sie abzuschließen — `
            + 'der KI-Server ist dabei vermutlich abgestürzt oder die Verbindung riss ab. '
            + 'Bitte erneut versuchen; tritt es wiederholt auf, das Server-Protokoll von Ollama prüfen.'
        );
        this.name = 'OllamaAbbruchFehler';
    }
}

/** Der Lesezugriff eines Web-Streams — im Node-Zweig gibt es ihn nicht. */
type WebStreamKoerper = { getReader: () => ReadableStreamDefaultReader<Uint8Array> };

/**
 * Zieht `message.content` aus einer Sammlung von JSON-Zeilen.
 *
 * Unlesbare Zeilen werden still uebergangen: Ollama mischt Statusobjekte ohne
 * `message` in den Strom, und eine abgeschnittene Zeile ist normal — die
 * gehoert dem naechsten Durchlauf.
 */
function sammleAusZeilen(zeilen: string[]): { text: string; abgeschlossen: boolean; fehler?: string } {
    let text = '';
    let abgeschlossen = false;
    let fehler: string | undefined;
    for (const zeile of zeilen) {
        const sauber = zeile.trim();
        if (!sauber) continue;
        try {
            const geparst = JSON.parse(sauber);
            if (geparst.message?.content) {
                text += geparst.message.content;
            }
            if (geparst.done === true) abgeschlossen = true;
            if (typeof geparst.error === 'string') fehler = geparst.error;
        } catch {
            // Kein vollstaendiges JSON-Objekt — nichts beizutragen.
        }
    }
    return { text, abgeschlossen, fehler };
}

/**
 * Liest den gestreamten Antwortkoerper vollstaendig aus.
 *
 * @throws AIProviderError wenn Ollama im Strom eine Fehlerzeile schickt.
 * @throws OllamaAbbruchFehler wenn die Abschlusszeile fehlt.
 * @param koerper Der Rumpf der `fetch`-Antwort, in welcher Form auch immer.
 */
export async function leseOllamaStream(koerper: unknown): Promise<string> {
    if (!koerper) return '';

    let text = '';
    let rest = '';
    let abgeschlossen = false;
    let fehler: string | undefined;

    const uebernimm = (zeilen: string[]): void => {
        const ergebnis = sammleAusZeilen(zeilen);
        text += ergebnis.text;
        abgeschlossen = abgeschlossen || ergebnis.abgeschlossen;
        fehler = ergebnis.fehler ?? fehler;
    };

    const verarbeite = (stueck: string): void => {
        const zeilen = (rest + stueck).split('\n');
        // Die letzte Zeile ist moeglicherweise unvollstaendig — aufheben.
        rest = zeilen.pop() || '';
        uebernimm(zeilen);
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
    uebernimm([rest]);
    if (fehler) throw new AIProviderError('Ollama', 500, fehler);
    if (!abgeschlossen) throw new OllamaAbbruchFehler(text.length);
    return text;
}
