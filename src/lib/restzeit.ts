/**
 * Restzeit eines Stapellaufs.
 * ⏱️
 *
 * Geschaetzt wird nur aus dem, was in DIESEM Lauf gemessen wurde: die Dauer
 * der fertigen Blaetter mal die Zahl der offenen. Vor dem ersten fertigen Blatt
 * gibt es deshalb keine Zahl — eine Schaetzung ohne Messung waere geraten, und
 * die Dauer haengt zu stark von Anbieter, Modell und Rechner ab, um sie fest
 * einzubauen.
 *
 * Bewusst ohne Speicher: so verhaelt es sich in Desktop, Community und SaaS
 * gleich. Eine Schaetzung schon vor dem Start braeuchte gespeicherte
 * Erfahrungswerte und je Betriebsart einen eigenen Ablageort (Entscheidung
 * vom 23.10.2026).
 */

export type LaufArt = 'texterkennung' | 'korrektur';

export interface LaufFortschritt {
    art: LaufArt;
    /** Blaetter, die dieser Lauf bearbeiten wird. */
    gesamt: number;
    /** Abgeschlossene Blaetter — erfolgreich oder fehlgeschlagen. */
    fertig: number;
    /** Beginn des Laufs — fuer „laeuft seit“, solange es nichts hochzurechnen gibt. */
    seit: number;
    /** Dauer der erfolgreichen Blaetter. Fehlschlaege fehlen hier: sie brechen
     *  oft sofort ab und wuerden die Schaetzung nach unten ziehen. */
    dauernMs: number[];
}

/**
 * Median statt Mittelwert: Das erste Blatt dauert bei lokalen Modellen oft
 * deutlich laenger, weil das Modell erst geladen wird. Ein Ausreisser soll die
 * Anzeige nicht fuer den ganzen Lauf verfaelschen.
 */
const median = (werte: number[]): number => {
    const sortiert = [...werte].sort((a, b) => a - b);
    const mitte = Math.floor(sortiert.length / 2);
    return sortiert.length % 2 === 1
        ? sortiert[mitte]
        : (sortiert[mitte - 1] + sortiert[mitte]) / 2;
};

/** Geschaetzte Restzeit in ms, oder `null`, solange nichts gemessen ist. */
export function schaetzeRestzeit(dauernMs: number[], offeneBlaetter: number): number | null {
    if (dauernMs.length === 0 || offeneBlaetter <= 0) return null;
    return median(dauernMs) * offeneBlaetter;
}

/** Gerundet, weil die Schaetzung keine Sekundengenauigkeit hat. */
export function formatiereRestzeit(ms: number): string {
    const minuten = Math.round(ms / 60_000);
    if (minuten < 1) return 'noch weniger als 1 Min.';
    if (minuten < 60) return `noch ca. ${minuten} Min.`;
    const stunden = Math.floor(minuten / 60);
    const rest = minuten % 60;
    return rest === 0 ? `noch ca. ${stunden} Std.` : `noch ca. ${stunden} Std. ${rest} Min.`;
}

/**
 * Wo es nichts hochzurechnen gibt — ein einzelner langer Aufruf —, sagt die
 * Anzeige ehrlich, wie lange es schon laeuft, statt eine Restzeit zu raten.
 */
export function formatiereLaufzeit(ms: number): string {
    const sekunden = Math.max(0, Math.floor(ms / 1000));
    const rest = String(sekunden % 60).padStart(2, '0');
    return `läuft seit ${Math.floor(sekunden / 60)}:${rest}`;
}
