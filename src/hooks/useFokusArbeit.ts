import { useBatchStore } from './store/useBatchStore';
import { useDashboardStore } from './store/useDashboardStore';

/**
 * Welche der drei Ansichten die Flaeche hat (17.11.2026, Vorbild Claude:
 * "Die Seitenleiste waehlt aus, die Flaeche zeigt genau eine Sache").
 *
 * - `einrichtung`: Musterloesung und Schuelerarbeiten laden. Von selbst, solange
 *   eines von beiden fehlt; sonst nur, wenn die Lehrkraft "Neue Korrektur" waehlt.
 * - `alle`: die Arbeiten als Liste — Korrigieren, Export, Haekchen. Nichts klappt
 *   dort auf.
 * - `arbeit`: genau eine Arbeit auf der ganzen Flaeche, in JEDEM Zustand (offen:
 *   erkannten Text pruefen; laeuft: Fortschritt; fertig: Vorschlaege pruefen).
 */
export type Ansicht = 'einrichtung' | 'alle' | 'arbeit';

export function useAnsicht(): Ansicht {
    const hatMusterloesung = useDashboardStore(d => !!d.modelSolution);
    return useBatchStore(s => {
        if (s.aufgeklappteArbeit !== null && s.batchFiles[s.aufgeklappteArbeit]) return 'arbeit';
        return s.einrichtungOffen || s.batchFiles.length === 0 || !hatMusterloesung ? 'einrichtung' : 'alle';
    });
}

/** Die Arbeit, die gerade die Flaeche hat — oder `null`. */
export function useFokusArbeit(): number | null {
    return useBatchStore(s => {
        const i = s.aufgeklappteArbeit;
        return i !== null && s.batchFiles[i] ? i : null;
    });
}

/** Wechselt die Ansicht — die eine Stelle, ueber die Leiste und Knoepfe navigieren. */
export function useWechsleAnsicht() {
    const setArbeit = useBatchStore(s => s.setAufgeklappteArbeit);
    const setEinrichtung = useBatchStore(s => s.setEinrichtungOffen);
    return (ziel: 'einrichtung' | 'alle' | number) => {
        setEinrichtung(ziel === 'einrichtung');
        setArbeit(typeof ziel === 'number' ? ziel : null);
        window.scrollTo({ top: 0 });
    };
}
