import { useBatchStore } from '@/hooks/store/useBatchStore';
import { meldeHinweis } from '@/lib/notify';

/**
 * Sperre fuer Aenderungen, die die Arbeiten-Liste VERSCHIEBEN, solange ein Lauf laeuft.
 * 🔒
 *
 * ANLASS (16.11.2026). Bilderkennung, Korrektur und Vorschau-Aufbau merken sich
 * beim Start die Liste und schreiben jedes Ergebnis spaeter nach ZEILENNUMMER
 * zurueck (`next[i] = { ...next[i], … }`). Wurde waehrend der Bilderkennung eine
 * Zeile geloescht, rueckten alle folgenden eine Nummer auf — ab da landete jeder
 * erkannte Text eine Zeile zu tief, also unter dem Namen des naechsten Schuelers.
 * Das letzte Ergebnis traf eine Zeile, die es nicht mehr gab, und legte eine neue
 * ohne Namen und ohne Datei an. Nichts davon war sichtbar: keine Meldung, kein
 * Fehler — 15 von 27 Arbeiten trugen fremden Text, und die naechste Aktion waere
 * die Bewertung gewesen.
 *
 * Gesperrt wird, was Zeilen entfernt oder einfuegt: Loeschen und Aufteilen.
 * Anhaengen (Upload) verschiebt nichts und bleibt erlaubt.
 *
 * Die Knoepfe in der Liste sind waehrend eines Laufs ebenfalls aus — diese
 * Pruefung ist die zweite Linie fuer jeden Weg, der an den Knoepfen vorbeifuehrt.
 */
export const LAUF_SPERRE_HINWEIS =
    'Solange ein Lauf läuft, lassen sich Arbeiten weder löschen noch aufteilen. Warte, bis er fertig ist, oder brich ihn ab.';

/** `true`, wenn gerade ein Lauf die Liste nach Zeilennummer beschreibt — dann mit Hinweis. */
export function listeWaehrendLaufGesperrt(): boolean {
    if (!useBatchStore.getState().isLoadingBatch) return false;
    meldeHinweis(LAUF_SPERRE_HINWEIS);
    return true;
}
