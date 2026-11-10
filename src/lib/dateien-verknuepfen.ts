/**
 * Ordnet nachgereichte Dateien den Arbeiten einer importierten Sitzung zu.
 *
 * Der `.koreki`-Export laesst die Dateien bewusst weg (s. `exportSessionToJson`):
 * Text, Bilderkennung und Bewertung reisen mit, die PDFs nicht. Wer die Sitzung
 * wieder oeffnet, reicht die Originale nach — und die muessen zur RICHTIGEN
 * Arbeit finden, denn danach steht die Vorschau neben der Bewertung.
 *
 * Erkannt wird am Dateinamen, und zwar GLEICH, nicht „kommt darin vor".
 * Bis zum 10.11.2026 genuegte das Vorkommen: `Schueler1` steckt auch in
 * `Schueler10.pdf`, und welche Datei zuerst in der Auswahl lag, entschied
 * wortlos, wessen Arbeit neben wessen Bewertung stand. Arbeiten aus einem
 * aufgeteilten Sammel-PDF hatten oft gar keinen Namen — der leere Name kam in
 * JEDER Datei vor.
 *
 * Zwei Arten von Arbeiten:
 * - Einzeldatei: verglichen wird `originalName`, der beim Hochladen aus dem
 *   Dateinamen ohne Endung entsteht.
 * - Teil eines Sammel-PDFs: verglichen wird der Name des Sammel-PDFs
 *   (`splitInfo.sourceFileName`). `originalName` traegt dort den Schuelernamen
 *   und passt zu keiner Datei. Alle Teile bekommen dieselbe Datei; welche Seiten
 *   zu wem gehoeren, steht weiter in `pageRange`.
 */

interface Verknuepfbar {
    files?: File[];
    originalName?: string;
    splitInfo?: { sourceFileName?: string };
}

export interface Verknuepfung<T> {
    /** Der ganze Bestand, verknuepfte Eintraege mit ihrer Datei. Gleiche Reihenfolge. */
    liste: T[];
    /** Wie viele Arbeiten eine Datei bekommen haben. */
    verknuepft: number;
    /** Dateien, die zu keiner Arbeit passten — in der Reihenfolge der Auswahl. */
    uebrig: File[];
}

/**
 * Gross/klein egal, Leerraum aussen egal, Umlaute egal in welcher Unicode-Form:
 * macOS liefert Dateinamen zerlegt (NFD), Windows zusammengesetzt (NFC).
 */
const vergleichsform = (name: string): string => name.normalize('NFC').trim().toLowerCase();

/** Dieselbe Regel wie beim Hochladen, wo `originalName` entsteht. */
const ohneEndung = (dateiname: string): string => dateiname.replace(/\.[^/.]+$/, '');

const gesuchterName = (eintrag: Verknuepfbar): string => {
    const name = eintrag.splitInfo?.sourceFileName ?? (eintrag.splitInfo ? '' : eintrag.originalName ?? '');
    return vergleichsform(name);
};

export function verknuepfeDateien<T extends Verknuepfbar>(bestand: T[], dateien: File[]): Verknuepfung<T> {
    const nachName = new Map<string, File>();
    for (const datei of dateien) {
        const k = vergleichsform(ohneEndung(datei.name));
        // Zwei Dateien mit gleichem Namen: die erste gilt, die zweite bleibt uebrig.
        if (k !== '' && !nachName.has(k)) nachName.set(k, datei);
    }

    const genutzt = new Set<File>();
    let verknuepft = 0;
    const liste = bestand.map(eintrag => {
        if (eintrag.files && eintrag.files.length > 0) return eintrag;
        const k = gesuchterName(eintrag);
        // Ohne Namen keine Zuordnung — lieber ohne Vorschau als mit fremder.
        const datei = k === '' ? undefined : nachName.get(k);
        if (!datei) return eintrag;
        genutzt.add(datei);
        verknuepft++;
        return { ...eintrag, files: [datei] };
    });

    return { liste, verknuepft, uebrig: dateien.filter(d => !genutzt.has(d)) };
}

/**
 * Was die Lehrkraft danach liest. Bis zum 10.11.2026 blieb eine unpassende
 * Datei wortlos liegen — und wer statt „Dateien verknüpfen" hochlud, bekam
 * jede Arbeit ein zweites Mal.
 *
 * - `verknuepfen`: Die Auswahl war nur zum Zuordnen da; was nicht passte, wird
 *   genannt.
 * - `hochladen`: Was nicht passte, ist eine neue Arbeit und braucht keine
 *   Meldung — wohl aber, dass einige Dateien KEINE neue Arbeit wurden.
 */
export function meldeVerknuepfung(v: Verknuepfung<unknown>, weg: 'verknuepfen' | 'hochladen'): string {
    const zugeordnet = `${v.verknuepft} Arbeit(en) haben ihre fehlende Datei bekommen.`;
    if (weg === 'hochladen' || v.uebrig.length === 0) return zugeordnet;
    return (v.verknuepft > 0 ? zugeordnet + '\n\n' : '') +
        `${v.uebrig.length} Datei(en) passten zu keiner Arbeit:\n\n` +
        v.uebrig.map(f => f.name).join('\n') +
        '\n\nZugeordnet wird über den Dateinamen. Er muss so heißen wie beim ersten Hochladen ' +
        '(bei einem aufgeteilten Sammel-PDF: wie das Sammel-PDF).';
}
