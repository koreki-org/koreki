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

/**
 * Fuer den Dateidialog der Schuelerarbeiten: dazu Moodle-Export, gespeicherte
 * Sitzung und ZIP mit einem Ordner je Pruefling (`zip-abgaben.ts`).
 */
export const SCHUELERARBEIT_ENDUNGEN = [MUSTERLOESUNG_ENDUNGEN, '.xlsx', '.csv', '.koreki', '.zip'].join(',');

export const istZipDatei = (datei: DateiKennung): boolean =>
    datei.type === 'application/zip' || datei.type === 'application/x-zip-compressed' || endetAuf(datei.name, ['.zip']);

/**
 * Quelltext, wie ihn Pruefungen im IT-Bereich abgeben lassen. Nur INNERHALB
 * eines ZIPs angenommen und dort als Text gelesen, Einrueckung inklusive —
 * durch die Bilderkennung ginge sie verloren. Einzeln hochgeladen bleibt es
 * bei den Formaten oben.
 */
const CODE_SPRACHEN: Readonly<Record<string, string>> = {
    '.py': 'python', '.java': 'java', '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.hpp': 'cpp',
    '.cs': 'csharp', '.js': 'javascript', '.ts': 'typescript', '.php': 'php', '.sql': 'sql',
    '.html': 'html', '.css': 'css', '.sh': 'bash', '.ps1': 'powershell', '.bat': 'bat',
    '.kt': 'kotlin', '.swift': 'swift', '.go': 'go', '.rb': 'ruby', '.vb': 'vbnet',
    '.json': 'json', '.xml': 'xml', '.yaml': 'yaml', '.yml': 'yaml', '.ini': 'ini',
    '.cfg': 'ini', '.conf': 'ini', '.log': 'text', '.csv': 'csv'
};

/** Abgeleitet, nicht daneben gepflegt: Endung und Sprache koennen nicht auseinanderlaufen. */
const CODE_ENDUNGEN = Object.keys(CODE_SPRACHEN);

export const istCodeDatei = (datei: DateiKennung): boolean => endetAuf(datei.name, CODE_ENDUNGEN);

/**
 * Sprache fuer den Codeblock (` ```python `), `null` bei Nicht-Quelltext.
 *
 * Die Angabe steuert heute nur die Kennzeichnung im Markdown. Sie ist trotzdem
 * schon da, weil eine spaetere Syntax-Faerbung sie genau so braucht — und weil
 * sie der KI sagt, welche Sprache sie vor sich hat, statt es sie raten zu lassen.
 */
export const codeSprache = (name: string): string | null => {
    const klein = name.toLowerCase();
    const endung = CODE_ENDUNGEN.find(e => klein.endsWith(e));
    return endung ? CODE_SPRACHEN[endung] : null;
};

/** Fuer Beschriftungen: „Text (.txt, .md)". */
export const TEXT_ENDUNGEN_ANZEIGE = TEXT_ENDUNGEN.join(', ');
