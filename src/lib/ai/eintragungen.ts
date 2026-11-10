/**
 * Zeichenaufgaben: Regeln nur dann in den Prompt, wenn eine Zeichnung da ist.
 *
 * Die Bilderkennung beschreibt jede Eintragung in einer Grafik (Linie, Kurve,
 * Balken, Kreuz …) als Zeile "[EINTRAGUNG: …]" — siehe `vision/system.md`.
 * Zuordnung und Korrektur brauchen dafuer eigene Regeln. Die stehen NICHT fest
 * in deren Prompts, sondern werden hier angehaengt, wenn der Text eine solche
 * Zeile enthaelt. Eine Arbeit ohne Zeichnung bekommt so exakt denselben Prompt
 * wie vor dem 10.11.2026 — die Regeln koennen die Bewertung gewoehnlicher
 * Textaufgaben nicht veraendern.
 *
 * Fehlt die Zeile, weil die Bilderkennung eine Zeichnung uebersehen hat, fehlt
 * auch die Regel. Das kostet nichts: Ohne Zeile gibt es nichts zu bewerten.
 */
import zuordnungsRegel from '../../prompts/core/default/eintragungen/zuordnung.md';
import korrekturRegel from '../../prompts/core/default/eintragungen/korrektur.md';

/** Woran eine Zeichnung im Text zu erkennen ist. */
export const EINTRAGUNG_MARKE = '[EINTRAGUNG';

export function enthaeltEintragung(text: string | null | undefined): boolean {
    return (text ?? '').includes(EINTRAGUNG_MARKE);
}

/** Haengt die Regel der jeweiligen Phase an — nur wenn der Text eine Zeichnung enthaelt. */
export function mitZeichenRegel(system: string, text: string | null | undefined, phase: 'zuordnung' | 'korrektur'): string {
    if (!enthaeltEintragung(text)) return system;
    return `${system}\n\n${phase === 'zuordnung' ? zuordnungsRegel : korrekturRegel}`;
}
