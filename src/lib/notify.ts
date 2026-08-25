import { create } from 'zustand';

/**
 * Meldungen an die Lehrkraft
 * 🔔
 *
 * WARUM ES DIESE DATEI GIBT
 * -------------------------
 * Koreki fragte in seinem eigenen Dialog und antwortete im Browser-Kasten. Ein
 * `alert('Profil erfolgreich gespeichert!')` haelt den Ablauf an und verlangt
 * einen Klick auf OK — es bestraft die Lehrkraft dafuer, dass etwas geklappt
 * hat. Beim zehnten gespeicherten Profil ist dieser Klick reine Reibung.
 *
 * Der Ersatz ist bewusst KEIN Modal: Eine Erfolgsmeldung darf nichts
 * blockieren. Sie erscheint am Rand und geht von selbst wieder.
 *
 * DREI TONLAGEN, NICHT ZWEI
 * -------------------------
 * `hinweis` steht zwischen Erfolg und Fehler. „Bitte gib einen Namen ein" ist
 * kein Fehler, sondern eine offene Aufgabe — rot signalisiert der Lehrkraft,
 * etwas sei kaputt. Dieselbe Unterscheidung trifft das Onboarding beim
 * AVV-Hinweis bereits.
 */

export type MeldungsArt = 'erfolg' | 'hinweis' | 'fehler';

export interface Meldung {
    id: number;
    art: MeldungsArt;
    text: string;
}

/**
 * Wie lange eine Meldung steht, in Millisekunden.
 *
 * Fehler bleiben, bis sie weggeklickt werden: Sie enthalten oft, was zu tun
 * ist, und manche sind mehrere Zeilen lang. Eine Fehlermeldung, die sich selbst
 * schliesst, bevor sie gelesen ist, ist schlimmer als keine — der Nutzer weiss
 * dann, dass etwas war, aber nicht was.
 */
export const STANDZEIT: Record<MeldungsArt, number | null> = {
    erfolg: 4000,
    hinweis: 8000,
    fehler: null
};

/** Schluessel fuer die Meldung, die ein Neuladen ueberleben soll. */
const UEBERLEBT_NEULADEN = 'koreki:meldung-nach-neuladen';

interface NotifyStore {
    meldungen: Meldung[];
    melde: (art: MeldungsArt, text: string) => void;
    verwirf: (id: number) => void;
    leere: () => void;
}

let naechsteId = 1;

export const useNotifyStore = create<NotifyStore>((set) => ({
    meldungen: [],

    melde: (art, text) => set((stand) => ({
        // Dieselbe Meldung nicht doppelt stapeln: Wer zweimal auf einen
        // gesperrten Knopf drueckt, soll nicht zwei gleiche Zettel bekommen.
        meldungen: stand.meldungen.some(m => m.art === art && m.text === text)
            ? stand.meldungen
            : [...stand.meldungen, { id: naechsteId++, art, text }]
    })),

    verwirf: (id) => set((stand) => ({
        meldungen: stand.meldungen.filter(m => m.id !== id)
    })),

    leere: () => set({ meldungen: [] })
}));

/** Aus Hooks und `lib/` aufrufbar, ohne dass die Stelle eine Komponente sein muss. */
const melde = (art: MeldungsArt, text: string): void => useNotifyStore.getState().melde(art, text);

export const meldeErfolg = (text: string): void => melde('erfolg', text);
export const meldeHinweis = (text: string): void => melde('hinweis', text);
export const meldeFehler = (text: string): void => melde('fehler', text);

/**
 * Eine Meldung, die ein Neuladen der Seite ueberleben soll.
 *
 * Gebraucht an genau einer Stelle: Nach dem Beitritt zu einem Institut laedt
 * Koreki neu, um den neuen Arbeitsbereich zu uebernehmen. Ein gewoehnlicher
 * Toast waere in dem Moment mit der Seite verschwunden — die Lehrkraft haette
 * nie erfahren, dass es geklappt hat. Frueher trug `alert` das, weil es den
 * Ablauf anhielt, bis jemand OK drueckte.
 */
export const meldeNachNeuladen = (art: MeldungsArt, text: string): void => {
    try {
        window.sessionStorage.setItem(UEBERLEBT_NEULADEN, JSON.stringify({ art, text }));
    } catch {
        // Privater Modus oder volle Ablage: Dann eben sofort, das ist besser
        // als gar nichts.
        melde(art, text);
    }
};

/** Holt eine hinterlegte Meldung ab und raeumt sie weg. */
export const holeMeldungNachNeuladen = (): Meldung | null => {
    try {
        const roh = window.sessionStorage.getItem(UEBERLEBT_NEULADEN);
        if (!roh) return null;

        window.sessionStorage.removeItem(UEBERLEBT_NEULADEN);
        const gelesen = JSON.parse(roh) as { art?: string; text?: string };

        if (!gelesen?.text || !gelesen?.art) return null;
        if (gelesen.art !== 'erfolg' && gelesen.art !== 'hinweis' && gelesen.art !== 'fehler') return null;

        return { id: naechsteId++, art: gelesen.art, text: gelesen.text };
    } catch {
        return null;
    }
};
