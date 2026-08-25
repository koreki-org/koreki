/**
 * Das Chat-Format der OpenAI-kompatiblen Anbieter.
 * 💬
 *
 * Mistral und jeder Dienst hinter `/v1/chat/completions` sprechen dieselbe
 * Sprache. Beide Anbieter-Dateien hatten dafuer bisher `any` an denselben
 * Stellen — Nachrichten, Anfragekoerper, Antwort, Verbrauch.
 *
 * Bewusst NICHT vollstaendig: Hier steht nur, was Koreki tatsaechlich sendet
 * und liest. Ein vollstaendiges Abbild der Anbieter-API waere Pflegeaufwand
 * ohne Gegenwert, und die Anbieter erweitern ihre Felder ohnehin laufend —
 * dafuer gibt es die Index-Signatur am Koerper.
 */

/** Ein Textbaustein in einer mehrteiligen Nachricht. */
export interface TextBlock {
    type: 'text';
    text: string;
}

/** Ein Bild in einer mehrteiligen Nachricht (Bilderkennung). */
export interface BildBlock {
    type: 'image_url';
    image_url: { url: string };
}

export type InhaltsBlock = TextBlock | BildBlock;

/**
 * Ein Werkzeugaufruf des Modells.
 *
 * `arguments` ist ein JSON-String, kein Objekt — so schreibt es die API vor.
 */
export interface WerkzeugAufruf {
    id: string;
    type?: 'function';
    function: { name: string; arguments: string };
}

/**
 * Eine Nachricht im Gespraech.
 *
 * `content` kann eine Zeichenkette ODER eine Liste von Bausteinen sein:
 * Bilderkennung schickt Text und Bild gemeinsam, und die Denkmodelle von
 * Mistral antworten ebenfalls in Bausteinen.
 */
export interface ChatNachricht {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | InhaltsBlock[] | null;
    /** Entwuerfe, die das Modell zur Pruefung vorgelegt hat. */
    tool_calls?: WerkzeugAufruf[];
    /** Bezug einer `tool`-Antwort auf den Aufruf. */
    tool_call_id?: string;
    name?: string;
}

/** Vorgabe eines Antwortformats (JSON-Objekt oder Schema). */
export type AntwortFormat =
    | { type: 'json_object' }
    | { type: 'json_schema'; json_schema: { name: string; strict?: boolean; schema: unknown } };

/**
 * Der Anfragekoerper.
 *
 * Die Index-Signatur ist Absicht: Anbieter unterscheiden sich in Randfeldern
 * (`presence_penalty`, `think`, ...), und die sollen ohne Typaenderung
 * gesetzt werden koennen.
 */
export interface ChatAnfrage {
    model: string;
    messages: ChatNachricht[];
    response_format?: AntwortFormat;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    tools?: unknown[];
    tool_choice?: string;
    /** Fester Startwert. Mistral nennt ihn `random_seed`, die OpenAI-Schnittstelle `seed`. */
    random_seed?: number;
    seed?: number;
    [key: string]: unknown;
}

/** Token-Verbrauch, Grundlage der Abrechnung. */
export interface TokenVerbrauch {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
}

export interface ChatAntwort {
    choices?: { message?: ChatNachricht; finish_reason?: string }[];
    usage?: TokenVerbrauch;
    [key: string]: unknown;
}

/** Antwort des dedizierten OCR-Endpunkts (/v1/ocr), nur Mistral. */
export interface OcrAntwort {
    pages?: { markdown?: string }[];
    usage?: TokenVerbrauch;
}

/**
 * Den Text aus einer Antwort holen, gleich in welcher Form sie kommt.
 *
 * Denkmodelle antworten in Bausteinen statt mit einer Zeichenkette. Mistral
 * hat das behandelt, der OpenAI-Zweig nicht — dort landete die Liste
 * unbemerkt in einem Feld, das eine Zeichenkette erwartet, weil der Typ `any`
 * war. Beide gehen jetzt hier durch.
 */
export function alsText(content: ChatNachricht['content']): string | null {
    if (content === null || content === undefined) return null;
    if (typeof content === 'string') return content;

    return content
        .filter((block): block is TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('');
}
