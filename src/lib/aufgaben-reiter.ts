/**
 * Welcher Aufgaben-Reiter ist offen, nachdem sich etwas geaendert hat?
 *
 * ANLASS (26.11.2026). Es gibt EINEN Reiter-Zustand fuer alle Arbeiten. Beim
 * Blaettern zur naechsten Arbeit blieb er stehen — wer schuelerweise prueft,
 * stieg beim naechsten Schueler mitten in Aufgabe 3 ein. Wer aufgabenweise
 * prueft, will genau das. Deshalb: Standard ist der erste Reiter, und die
 * Stecknadel („Aufgabe beim Blättern behalten“) haelt den Reiter fest.
 */
export interface ReiterLage {
    aktiv: string;
    namen: string[];
    /** Eine andere Arbeit ist offen als beim letzten Mal. */
    arbeitGewechselt: boolean;
    /** Stecknadel an: Reiter beim Blaettern behalten. */
    behalten: boolean;
}

export function reiterNachWechsel({ aktiv, namen, arbeitGewechselt, behalten }: ReiterLage): string {
    if (namen.length === 0) return aktiv;
    // Den Reiter gibt es nicht (mehr) — z. B. nach einer neuen Aufgabenstruktur.
    if (!namen.includes(aktiv)) return namen[0];
    return arbeitGewechselt && !behalten ? namen[0] : aktiv;
}
