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
}

interface ConfirmStore {
    request: ConfirmationRequest | null;
    /** Loest das laufende Versprechen auf; null, solange nichts gefragt wird. */
    pendingAnswer: ((confirmed: boolean) => void) | null;
    ask: (request: ConfirmationRequest) => Promise<boolean>;
    answer: (confirmed: boolean) => void;
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
    request: null,
    pendingAnswer: null,

    ask: (request) => new Promise<boolean>((resolve) => {
        // Eine noch offene Frage wird verneint, nicht verdraengt: sonst wartet
        // ihr Aufrufer fuer immer auf eine Antwort, die nie mehr kommt, und der
        // angefangene Vorgang bleibt auf halbem Weg stehen.
        get().pendingAnswer?.(false);
        set({ request, pendingAnswer: resolve });
    }),

    answer: (confirmed) => {
        get().pendingAnswer?.(confirmed);
        set({ request: null, pendingAnswer: null });
    }
}));

/**
 * Fragt nach, ohne dass die Aufrufstelle eine Komponente sein muss.
 *
 * Das ist der Grund fuer einen Speicher statt eines React-Kontexts: die
 * Rueckfragen stehen in Hooks und in `lib/`, nicht in der Darstellung.
 */
export const askConfirmation = (request: ConfirmationRequest): Promise<boolean> =>
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
