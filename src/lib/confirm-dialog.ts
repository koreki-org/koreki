import { overwriteQuestion, overwriteTitle } from '@/lib/services/profile-naming';
import { create } from 'zustand';

/**
 * Rueckfragen, die auf eine Antwort warten.
 *
 * `window.confirm` war bequem, weil es den Ablauf anhielt und die Antwort
 * unmittelbar zurueckgab. Der Preis war hoch: der Kasten sieht aus wie eine
 * Meldung des Betriebssystems, traegt keine Warnfarbe, laesst sich weder
 * gestalten noch uebersetzen, und bei einer unwiderruflichen Loeschung sieht er
 * genauso aus wie bei einer belanglosen Rueckfrage.
 *
 * Damit die Aufrufstellen ihre knappe Form behalten
 * (`if (!(await ...)) return;`), fuehrt dieser Speicher die Antwort als
 * Versprechen: `askConfirmation` legt die Frage ab und loest erst auf, wenn der
 * Nutzer geantwortet hat.
 */
export interface ConfirmationRequest {
    title: string;
    message: string;
    /** Beschriftung des Hauptknopfs; ohne Angabe „Bestätigen“. */
    bestaetigen?: string;
    /**
     * Eine dritte Antwort zwischen Abbrechen und Bestaetigen — nur ueber
     * `askChoice`. Vorbild ist Word beim Schliessen: Speichern, Nicht
     * speichern, Abbrechen (21.11.2026, „Neue Korrektur“).
     */
    zweiteWahl?: string;
}

/** Die Antwort auf eine Rueckfrage. `zweite` gibt es nur bei `askChoice`. */
export type Wahl = 'bestaetigt' | 'zweite' | 'abgebrochen';

interface ConfirmStore {
    request: ConfirmationRequest | null;
    /** Loest das laufende Versprechen auf; null, solange nichts gefragt wird. */
    pendingAnswer: ((wahl: Wahl) => void) | null;
    ask: (request: ConfirmationRequest) => Promise<Wahl>;
    /** `true`/`false` fuer Bestaetigen/Abbrechen, `'zweite'` fuer die dritte Antwort. */
    answer: (antwort: boolean | 'zweite') => void;
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
    request: null,
    pendingAnswer: null,

    ask: (request) => new Promise<Wahl>((resolve) => {
        // Eine noch offene Frage wird verneint, nicht verdraengt: sonst wartet
        // ihr Aufrufer fuer immer auf eine Antwort, die nie mehr kommt, und der
        // angefangene Vorgang bleibt auf halbem Weg stehen.
        get().pendingAnswer?.('abgebrochen');
        set({ request, pendingAnswer: resolve });
    }),

    answer: (antwort) => {
        const wahl: Wahl = antwort === 'zweite' ? 'zweite' : antwort ? 'bestaetigt' : 'abgebrochen';
        get().pendingAnswer?.(wahl);
        set({ request: null, pendingAnswer: null });
    }
}));

/**
 * Fragt nach, ohne dass die Aufrufstelle eine Komponente sein muss.
 *
 * Das ist der Grund fuer einen Speicher statt eines React-Kontexts: die
 * Rueckfragen stehen in Hooks und in `lib/`, nicht in der Darstellung.
 */
export const askConfirmation = async (request: ConfirmationRequest): Promise<boolean> =>
    (await useConfirmStore.getState().ask(request)) === 'bestaetigt';

/**
 * Rueckfrage mit drei Antworten: Bestaetigen, die zweite Wahl, Abbrechen.
 * Escape und Klick neben den Dialog zaehlen als Abbrechen — nie als eine der
 * beiden Handlungen.
 */
export const askChoice = (request: ConfirmationRequest & { zweiteWahl: string }): Promise<Wahl> =>
    useConfirmStore.getState().ask(request);

/**
 * Die Rueckfrage vor dem Ueberschreiben eines gleichnamigen Eintrags.
 *
 * Sie steht hier und nicht in `profile-naming.ts`, wo ihr Wortlaut liegt:
 * `profile-naming` wird auch von den API-Routen benutzt, und ein
 * Client-Speicher hat im Server-Bundle nichts verloren.
 *
 * Alle vier Profil-Familien fragen hierueber — das ist der Sinn der Sache.
 * Vier eigene Formulierungen fuer dieselbe Lage sind fuer die Lehrkraft vier
 * verschiedene Fehler.
 */
export const confirmOverwrite = (label: string, name: string): Promise<boolean> =>
    askConfirmation({ title: overwriteTitle(label), message: overwriteQuestion(label, name) });
