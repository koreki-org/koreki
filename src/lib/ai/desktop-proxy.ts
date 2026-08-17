/**
 * Anbieter-Aufrufe ueber den Desktop-Proxy.
 * 🖥️
 *
 * Im Desktop-Betrieb (Tauri) gibt es keinen Koreki-Server, und der Browser im
 * Fenster darf aus Sicherheitsgruenden nicht direkt zu fremden Hosts. Die
 * Anfrage laeuft deshalb durch einen Rust-Befehl.
 *
 * Zwei Dinge stehen hier, weil sie sonst mehrfach dastuenden:
 *
 * - Das Abbruch-Rennen. Ein Rust-Aufruf kennt kein `AbortSignal`; damit der
 *   Stopp-Knopf trotzdem wirkt, laeuft er gegen ein Versprechen, das beim
 *   Abbruch ablehnt. Diese Konstruktion stand VIERMAL im Repo (Mistral-Chat,
 *   Mistral-OCR, OpenAI, Ollama).
 * - Der Aufruf selbst, fuer die beiden HTTP-artigen Anbieter.
 */

/** Der Abbruch, wie ihn `fetch` auch meldet — damit Aufrufer nur einen Fall kennen. */
const abbruchFehler = () => new DOMException('The user aborted a request.', 'AbortError');

/**
 * Wartet auf ein Versprechen, das den Abbruch nicht selbst kennt.
 *
 * Der Zuhoerer wird mit `once` registriert. Ohne das sammeln sich bei einem
 * Stapel von fuenfzig Arbeiten fuenfzig Zuhoerer auf demselben Signal an — sie
 * werden nie wieder entfernt, weil das Signal den ganzen Lauf ueberlebt.
 */
export async function warteMitAbbruch<T>(versprechen: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return versprechen;
    if (signal.aborted) throw abbruchFehler();

    return Promise.race([
        versprechen,
        new Promise<T>((_, reject) => {
            signal.addEventListener('abort', () => reject(abbruchFehler()), { once: true });
        })
    ]);
}

export interface DesktopProxyRequest {
    url: string;
    apiKey: string;
    body: unknown;
    signal?: AbortSignal;
    /**
     * Steht in der Fehlermeldung, wenn der Proxy scheitert. Ohne diesen Zusatz
     * ist an der Meldung nicht erkennbar, welcher Aufruf gescheitert ist.
     */
    kontext: string;
}

/**
 * Schickt eine Anfrage ueber den Rust-Proxy und gibt die geparste Antwort zurueck.
 */
export async function ueberDesktopProxy<T>(anfrage: DesktopProxyRequest): Promise<T> {
    const { url, apiKey, body, signal, kontext } = anfrage;

    try {
        // Dynamischer Import: im SaaS-Build gibt es kein Tauri, und ein fester
        // Import wuerde den Bundler daran scheitern lassen.
        const { invoke } = await import('@tauri-apps/api/core');

        const antwort = await warteMitAbbruch(
            invoke<string>('execute_ai_proxy_command', {
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            }),
            signal
        );

        return JSON.parse(antwort) as T;
    } catch (e) {
        // Der Abbruch ist kein Proxy-Fehler: er ist gewollt und muss den
        // Aufrufer unveraendert erreichen, damit er ihn von einem echten
        // Fehlschlag unterscheiden kann.
        if (e instanceof Error && e.name === 'AbortError') throw e;
        throw new Error(`${kontext}: ${e}`);
    }
}
