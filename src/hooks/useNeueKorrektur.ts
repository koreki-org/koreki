import { askChoice } from '@/lib/confirm-dialog';
import { meldeFehler } from '@/lib/notify';
import { wartetAufLauf } from '@/lib/laufender-vorgang';
import { toErrorMessage } from '@/lib/error-message';
import { useWechsleAnsicht } from '@/hooks/useFokusArbeit';
import type { BatchFile, Task } from '@/types';

interface NeueKorrekturOptionen {
    /** Liegt etwas, das verloren gehen kann (Arbeiten oder Musterloesung)? */
    hatArbeit: boolean;
    /** Speichert die Sitzung; `false`, wenn die Lehrkraft das Speichern abbricht. */
    speichern: () => Promise<boolean>;
    setBatchFiles: (files: BatchFile[]) => void;
    setTasksLayout: (tasks: Task[]) => void;
    setModelSolution: (text: string) => void;
    setModelSolutionContext: (text: string) => void;
    /** Was nach dem Verwerfen sonst noch zurueckgesetzt wird. */
    nachDemVerwerfen?: () => void;
}

/**
 * „Neue Korrektur“ — verhaelt sich wie „Neu“ in Word (21.11.2026).
 *
 * Ist nichts geladen, oeffnet sich die Einrichtung. Liegt schon etwas, fragt
 * Koreki wie Word beim Schliessen: Speichern, Nicht speichern, Abbrechen.
 *
 * Vorher (17.–21.11.2026) oeffnete der Knopf nur die Einrichtung und verwarf
 * nichts; verworfen wurde ueber „Neu beginnen“ in der Einrichtung. Andreas
 * erwartete beim Klick einen Neuanfang mit Rueckfrage — ein Knopf, der anders
 * heisst, als er handelt, ist fuer Lehrkraefte nicht zu durchschauen. Die
 * Einrichtung einer laufenden Korrektur hat seitdem einen eigenen Eintrag in
 * der Seitenleiste.
 *
 * Anders als in Word bleibt das alte Dokument nicht in einem zweiten Fenster
 * offen: Schuelerdaten leben nur im Arbeitsspeicher, es gibt kein Rueckgaengig
 * (Waechter: session-replacement-governance). Deshalb ist die Rueckfrage
 * Pflicht, und „Speichern“ verwirft nur, wenn wirklich gespeichert wurde.
 */
export function useNeueKorrektur(o: NeueKorrekturOptionen) {
    const wechsle = useWechsleAnsicht();

    return async () => {
        if (o.hatArbeit) {
            // Mitten in einem Lauf weder fragen noch verwerfen — s. laufenderVorgang.
            if (wartetAufLauf()) return;
            const wahl = await askChoice({
                title: 'Aktuelle Korrektur schließen?',
                message: 'Nicht gespeicherte Ergebnisse gehen verloren.\nÜber „Öffnen“ lädst du eine gespeicherte Korrektur später wieder.',
                bestaetigen: 'Speichern …',
                zweiteWahl: 'Nicht speichern'
            });
            if (wahl === 'abgebrochen') return;
            if (wahl === 'bestaetigt') {
                let gespeichert = false;
                try {
                    gespeichert = await o.speichern();
                } catch (err) {
                    meldeFehler(`Speichern fehlgeschlagen: ${toErrorMessage(err)}`);
                }
                if (!gespeichert) return;
            }
            o.setBatchFiles([]);
            o.setModelSolution('');
            o.setModelSolutionContext('');
            o.setTasksLayout([]);
            o.nachDemVerwerfen?.();
        }
        wechsle('einrichtung');
    };
}
