import { useState, useCallback } from 'react';

/**
 * Ein Zustand, dessen Änderungen sich Schritt für Schritt zurücknehmen lassen.
 *
 * `aendere` merkt sich den Stand davor, `ersetze` nicht — damit Laden und Umrechnen
 * keinen Rückgängig-Schritt erzeugen, den niemand ausgelöst hat. Stand und Verlauf
 * liegen in EINEM State, damit ein doppelt ausgeführter Updater (StrictMode) keinen
 * Schritt doppelt ablegt.
 *
 * ANLASS (25.10.2026). Seit ein Schwärzungsbalken standardmäßig auf jedes Blatt
 * gelegt wird, entfernte „Rückgängig“ nur die Kopie auf dem sichtbaren Blatt; die
 * übrigen blieben unsichtbar stehen. Ein Schritt ist deshalb der ganze Stand,
 * nicht der letzte Balken der aktuellen Seite.
 */
export const useMitRueckgaengig = <T,>(anfang: T) => {
    const [{ stand, verlauf }, setZustand] = useState<{ stand: T; verlauf: T[] }>({ stand: anfang, verlauf: [] });

    const aendere = useCallback((neu: (vorher: T) => T) => {
        setZustand(z => {
            const naechster = neu(z.stand);
            return naechster === z.stand ? z : { stand: naechster, verlauf: [...z.verlauf, z.stand] };
        });
    }, []);

    const ersetze = useCallback((neu: T) => setZustand({ stand: neu, verlauf: [] }), []);

    const rueckgaengig = useCallback(() => {
        setZustand(z => z.verlauf.length === 0 ? z : { stand: z.verlauf[z.verlauf.length - 1], verlauf: z.verlauf.slice(0, -1) });
    }, []);

    return { stand, aendere, ersetze, rueckgaengig, kannRueckgaengig: verlauf.length > 0 };
};
