/**
 * Welche Dateien Koreki als Musterloesung oder Schuelerarbeit liest.
 * 📄
 *
 * Bis zum 12.11.2026 stand diese Liste an fuenf Stellen von Hand: zweimal im
 * Dateidialog der Musterloesung, einmal bei den Schuelerarbeiten, einmal im
 * Filter beim Ablegen und einmal in der Annahme der Musterloesung. Die Stellen
 * waren nicht deckungsgleich — die Musterloesung nahm beim Ablegen JEDE Datei
 * an und las sie als Text, eine Word-Datei kam so als Zeichensalat bei der KI
 * an. Eine neue Dateiart wird jetzt hier eingetragen und gilt ueberall.
 */

/** Reiner Text. Markdown ist reiner Text mit Gliederung — fuer die KI sogar hilfreich. */
const TEXT_ENDUNGEN = ['.txt', '.md'] as const;
const TEXT_MIME = ['text/plain', 'text/markdown', 'text/x-markdown'];

interface DateiKennung {
    name: string;
    type: string;
}

const endetAuf = (name: string, endungen: readonly string[]) => {
    const klein = name.toLowerCase();
    return endungen.some(e => klein.endsWith(e));
};

/**
 * Reiner Text, der ohne KI ausgelesen wird. Am Namen erkannt, nicht nur am
 * MIME-Typ: Windows meldet fuer `.md` meist einen leeren Typ.
 */
export const istTextDatei = (datei: DateiKennung): boolean =>
    TEXT_MIME.includes(datei.type) || endetAuf(datei.name, TEXT_ENDUNGEN);

export const istPdfDatei = (datei: DateiKennung): boolean =>
    datei.type === 'application/pdf' || endetAuf(datei.name, ['.pdf']);

export const istBildDatei = (datei: DateiKennung): boolean => datei.type.startsWith('image/');

/** Ein einzelnes Dokument, das Koreki lesen kann: PDF, Bild oder reiner Text. */
export const istLesbaresDokument = (datei: DateiKennung): boolean =>
    istPdfDatei(datei) || istBildDatei(datei) || istTextDatei(datei);

/** Fuer den Dateidialog der Musterloesung. */
export const MUSTERLOESUNG_ENDUNGEN = ['.pdf', ...TEXT_ENDUNGEN, '.jpg', '.jpeg', '.png'].join(',');

/** Fuer den Dateidialog der Schuelerarbeiten: dazu Moodle-Export und gespeicherte Sitzung. */
export const SCHUELERARBEIT_ENDUNGEN = [MUSTERLOESUNG_ENDUNGEN, '.xlsx', '.csv', '.koreki'].join(',');

/** Fuer Beschriftungen: „Text (.txt, .md)". */
export const TEXT_ENDUNGEN_ANZEIGE = TEXT_ENDUNGEN.join(', ');
