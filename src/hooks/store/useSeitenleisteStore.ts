import { create } from 'zustand';

/**
 * Ob die Seitenleiste offen ist.
 *
 * Ein eigener Speicher, weil zwei Stellen ihn lesen: die Leiste selbst und
 * `AppLayout`, das den Inhalt um ihre Breite einrueckt. Gemerkt wird der Wert im
 * Browser — reine Bequemlichkeit: Fehlt der Speicher (privates Fenster,
 * gesperrte Daten), startet die Leiste eben zugeklappt.
 */
const SCHLUESSEL = 'koreki_seitenleiste_offen';

interface SeitenleisteStore {
    offen: boolean;
    setOffen: (offen: boolean) => void;
    /** Einmal nach dem Laden — auf dem Server gibt es keinen Browser-Speicher. */
    ladeGemerkt: () => void;
    /**
     * Unter `md` liegt die Leiste als Schublade UEBER dem Inhalt (18.11.2026).
     * Ein eigener Wert, nicht gemerkt: Eine Schublade, die beim naechsten Start
     * schon offen ueber der Arbeit liegt, verdeckt genau das, was man sehen will.
     */
    mobilOffen: boolean;
    setMobilOffen: (offen: boolean) => void;
}

export const useSeitenleisteStore = create<SeitenleisteStore>((set) => ({
    offen: false,
    mobilOffen: false,
    setMobilOffen: (mobilOffen) => set({ mobilOffen }),
    setOffen: (offen) => {
        set({ offen });
        try {
            localStorage.setItem(SCHLUESSEL, offen ? '1' : '0');
        } catch {
            // Nicht merkbar — die Leiste funktioniert trotzdem.
        }
    },
    ladeGemerkt: () => {
        try {
            set({ offen: localStorage.getItem(SCHLUESSEL) === '1' });
        } catch {
            // Kein Speicher: zugeklappt bleiben.
        }
    }
}));
