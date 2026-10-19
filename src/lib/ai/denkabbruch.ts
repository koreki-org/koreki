/**
 * Denkabbruch: Das Modell beendet seine Antwort mitten im Denken.
 * 💭✂️
 *
 * BEFUND (19.10.2026). `Qwen3.8-27B-NVFP4` ueber Mittwald liefert sporadisch eine
 * 200er-Antwort mit leerem `content`, aber tausenden Tokens Denktext — mal mit
 * `finish_reason: stop` (der Denktext endet mitten im Satz), mal mit `length`
 * (das Modell dreht sich im Kreis, bis der Platz voll ist). Getroffen hat es
 * Bewertung und Rechenweg-Extraktion gleichermassen, in verschiedenen Faechern.
 *
 * URSACHE. Ein bekannter Modellfehler: Qwen 3.8 waehlt gelegentlich das
 * Ende-Zeichen `<|im_end|>`, waehrend es noch denkt, und der Server beendet
 * die Antwort (vLLM #55420, QwenLM/Qwen3.8 #216 — dort ~1000 gemessene Aufrufe).
 * Einen Fix gibt es weder im Modell noch in vLLM. Abtastwerte senken nur die
 * Rate: Qwens Empfehlung (Temperatur 1.0, `frequency_penalty` 0.3) machte es bei
 * unseren JSON-Antworten sogar schlimmer, `reasoning_effort: high` half nicht.
 *
 * LOESUNG. Qwens eigener Zwei-Schritt aus der Denkbudget-Dokumentation
 * (QwenLM/Qwen3, docs/getting_started/thinking_budget.md): Der Denktext wird als
 * Beginn der Antwort zurueckgegeben, mit dem dort vorgegebenen Satz und
 * `</think>` abgeschlossen, und das Modell schreibt NUR noch die Antwort. Es wird
 * nicht neu gedacht und nicht neu gewuerfelt — die Bewertung beruht auf genau
 * dem Denken, das schon stattgefunden hat. Darum ist das KEIN
 * Wiederholungsversuch im Sinne der Entscheidung vom 07.09.2026 (siehe
 * `openai-provider.ts`): Keine Aufgabe kommt unter einer anderen Konfiguration
 * zustande als die daneben. Gemessen an allen fuenf Ausfaellen vom 19.10.2026:
 * fuenf vollstaendige, gueltige JSON-Antworten in je wenigen Sekunden.
 *
 * Die Fortsetzung wird nur protokolliert, nicht in der Oberflaeche markiert
 * (Entscheidung vom 19.10.2026): Die Bewertung ist inhaltlich vollwertig.
 */
import type { ChatAnfrage, ChatNachricht, TokenVerbrauch } from './chat-types';
import { alsText } from './chat-types';

/**
 * Verbrauch beider Aufrufe zusammen. Die Fortsetzung kostet beim Anbieter echte
 * Tokens; ein Bericht, der nur den ersten Aufruf zaehlt, waere geschoent.
 */
export function addiereVerbrauch(a: TokenVerbrauch | undefined, b: TokenVerbrauch | undefined): TokenVerbrauch | undefined {
    if (!a) return b;
    if (!b) return a;
    const summe = (x?: number, y?: number) => (x ?? 0) + (y ?? 0);
    return {
        prompt_tokens: summe(a.prompt_tokens, b.prompt_tokens),
        completion_tokens: summe(a.completion_tokens, b.completion_tokens),
        total_tokens: summe(a.total_tokens, b.total_tokens)
    };
}

/** Der Uebergangssatz aus Qwens Denkbudget-Dokumentation, woertlich. */
export const DENKABSCHLUSS_SATZ =
    'Considering the limited time by the user, I have to give the solution based on the thinking directly now.';

/** Denktext einer Antwort — vLLM nennt das Feld je nach Fassung verschieden. */
export function denktextAus(message: ChatNachricht | undefined): string {
    return (message?.reasoning_content ?? message?.reasoning ?? '').trim();
}

/**
 * Ist das ein Denkabbruch? Nur dann, wenn gedacht werden sollte, kein sichtbarer
 * Inhalt kam und Denktext vorliegt. `content_filter` und andere Gruende bleiben
 * Fehler — dort gibt es nichts fortzusetzen.
 */
export function istDenkabbruch(
    message: ChatNachricht | undefined,
    abbruchgrund: string | undefined,
    denkt: boolean
): boolean {
    if (!denkt) return false;
    if (abbruchgrund !== 'stop' && abbruchgrund !== 'length') return false;
    if ((alsText(message?.content ?? null) ?? '').trim() !== '') return false;
    return denktextAus(message) !== '';
}

/**
 * Schneidet am letzten vollstaendigen Satz ab. Ein `stop`-Abbruch endet oft mitten
 * im Wort; ohne diesen Schnitt stuende der Uebergangssatz an einem halben Gedanken.
 */
export function bisZumLetztenSatz(denktext: string): string {
    const ende = Math.max(
        denktext.lastIndexOf('.'),
        denktext.lastIndexOf('!'),
        denktext.lastIndexOf('?'),
        denktext.lastIndexOf('\n')
    );
    return ende > 0 ? denktext.slice(0, ende + 1) : denktext;
}

/**
 * Die Fortsetzungs-Anfrage: dieselbe Anfrage, ergaenzt um den abgeschlossenen
 * Denktext als Beginn der Antwort. `continue_final_message` laesst das Modell
 * dort weiterschreiben, statt eine neue Antwort zu beginnen; vLLM verlangt dazu
 * `add_generation_prompt: false`.
 */
export function baueFortsetzung(anfrage: ChatAnfrage, denktext: string): ChatAnfrage {
    const abgeschlossen = `<think>\n${bisZumLetztenSatz(denktext)}\n\n${DENKABSCHLUSS_SATZ}\n</think>\n\n`;
    return {
        ...anfrage,
        messages: [...anfrage.messages, { role: 'assistant', content: abgeschlossen }],
        add_generation_prompt: false,
        continue_final_message: true
    };
}

/**
 * Die Antwort der Fortsetzung. Zuerst das Antwortfeld; ist es leer, das Denkfeld.
 *
 * Warum das Denkfeld: Mittwalds vLLM sortiert eine fortgesetzte Nachricht
 * vollstaendig als Denktext ein, weil das `</think>` in der Anfrage stand und
 * nicht in der Ausgabe (gemessen 19.10.2026; behoben in vLLM PR #38749, falls
 * Mittwald ihn einspielt). In der Fortsetzung wird aber nicht mehr gedacht —
 * was dort steht, IST die Antwort. Die Reihenfolge haelt beide Fassungen aus.
 */
export function antwortAusFortsetzung(message: ChatNachricht | undefined): string {
    const inhalt = (alsText(message?.content ?? null) ?? '').trim();
    return inhalt !== '' ? inhalt : denktextAus(message);
}
