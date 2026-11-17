import { useBatchStore } from './store/useBatchStore';

/**
 * Die Arbeit, die gerade die ganze Flaeche hat — oder `null` fuer den Ueberblick.
 *
 * Seit dem 17.11.2026 zeigt eine aufgeklappte FERTIGE Arbeit keine Zeile im
 * Stapel mehr, sondern die Pruefansicht: nur diese Arbeit, ohne Musterloesung,
 * Upload und Stapel drumherum (Vorbild: eine Unterhaltung bei Claude). Offene
 * Arbeiten klappen weiter im Stapel auf — dort korrigiert man den erkannten
 * Text vor dem Lauf, und der Lauf wird im Stapel gestartet.
 */
export function useFokusArbeit(): number | null {
    return useBatchStore(s => {
        const i = s.aufgeklappteArbeit;
        return i !== null && s.batchFiles[i]?.status === 'done' ? i : null;
    });
}
