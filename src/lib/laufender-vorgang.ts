import { useBatchStore } from '@/hooks/store/useBatchStore';
import { meldeHinweis } from '@/lib/notify';

/**
 * Laeuft gerade etwas, das in die geladene Korrektur schreibt? Dann der Satz
 * fuer die Lehrkraft, sonst `null`.
 *
 * ANLASS (21.11.2026). „Neue Korrektur“ fragt seitdem Speichern / Nicht
 * speichern / Abbrechen. Mitten in einer Bilderkennung haette „Nicht
 * speichern“ die Sitzung geleert, waehrend der Lauf weiterlief — und der
 * schreibt seine Ergebnisse per Platznummer zurueck, also in die frische,
 * leere Korrektur. Dasselbe galt schon vorher fuer „Öffnen“ und „Demo“.
 *
 * Bewusst KEIN automatisches Abbrechen mit anschliessendem Verwerfen: Ein
 * abgebrochener Aufruf kann noch Antworten nachliefern, und dann waere man beim
 * selben Fehler. Die Lehrkraft haelt den Lauf selbst an oder wartet — beides
 * ist eindeutig.
 *
 * Ein Upload braucht keinen Riegel: Er liest den Bestand erst nach seinem
 * letzten `await` und haengt an (useBatchActions, 3b). Wer waehrend des
 * Einlesens neu beginnt, findet die neuen Arbeiten in der neuen Korrektur —
 * nicht die verworfenen alten.
 *
 * Wer die geladene Korrektur ERSETZT, fragt hier zuerst (Waechter:
 * session-replacement-governance).
 */
export function laufenderVorgang(): string | null {
    const s = useBatchStore.getState();
    if (s.isLoadingBatch) {
        return 'Gerade läuft eine Bilderkennung oder Korrektur. Warte, bis sie fertig ist, oder brich sie unter „Alle Arbeiten“ ab.';
    }
    if (s.isLoadingModel) {
        return 'Gerade wird die Musterlösung analysiert. Warte, bis das fertig ist, oder brich die Analyse ab.';
    }
    return null;
}

/** Laeuft etwas, sagt es das der Lehrkraft und gibt `true` zurueck — der Aufrufer bricht dann ab. */
export function wartetAufLauf(): boolean {
    const laeuft = laufenderVorgang();
    if (laeuft) meldeHinweis(laeuft);
    return laeuft !== null;
}

