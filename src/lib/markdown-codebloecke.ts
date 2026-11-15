/**
 * Codebloecke in Markdown — erzeugen und vor der Vorverarbeitung schuetzen.
 * 🧱
 *
 * ANLASS (15.11.2026). Quelltext aus einer ZIP-Abgabe reiste seit dem 13.11.
 * woertlich und mit Einrueckung zur KI — die Anzeige machte ihn trotzdem
 * unkenntlich. Er stand als Fliesstext im Markdown, und Markdown deutete ihn.
 * Gemessen mit demselben Renderer, den die App benutzt:
 *
 *   # Berechnet den Rabatt      → grosse Ueberschrift
 *   def __init__(self, name):   → „def init(...)", „init" fett, Unterstriche weg
 *       if rabatt > 0:          → jede Einrueckung weg
 *   $summe = $a + $b;   (PHP)   → als Formel gesetzt, die $ verschwinden
 *
 * Bei Python ist das mehr als unschoen: Die Einrueckung IST die
 * Programmstruktur. Ohne sie sieht man nicht, welche Zeile im `if` steht —
 * die Lehrkraft las ein anderes Programm als das, das die KI bewertet hatte.
 *
 * ZWEI HAELFTEN, beide noetig:
 *  1. `alsCodeblock` setzt Quelltext beim Buendeln zwischen Zaeune. Damit
 *     weiss Markdown, dass hier nichts zu deuten ist — `#`, `__`, `$` bleiben
 *     Zeichen.
 *  2. `ausserhalbVonCode` haelt die EIGENE Vorverarbeitung der Anzeige davon
 *     fern. Die arbeitet zeilenweise und kennt keine Zaeune: Sie haette aus
 *     `if (a || b || c)` (vier Striche) eine zerquetschte Tabelle gebaut und aus
 *     jedem Listenzugriff `liste[i]` ein rotes Korrekturzeichen „i".
 */

/** Oeffnender Zaun nach CommonMark: bis zu drei Leerzeichen, dann ``` oder ~~~ (oder laenger). */
const OEFFNET = /^ {0,3}(`{3,}|~{3,})/;

/** Schliessender Zaun: dasselbe Zeichen, mindestens so lang, danach nur Leerraum. */
const schliesst = (zeile: string, zaun: string): boolean => {
    const treffer = zeile.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    return !!treffer && treffer[1][0] === zaun[0] && treffer[1].length >= zaun.length;
};

/**
 * Wendet `bearbeite` nur auf die Abschnitte AUSSERHALB von Codebloecken an;
 * Codebloecke kommen zeichengleich zurueck, samt Zaeunen.
 *
 * Ein nicht geschlossener Zaun schuetzt den Rest des Textes — so liest ihn auch
 * Markdown selbst. Lieber ein Rest ohne Aufbereitung als Code, der zerlegt wird.
 */
export function ausserhalbVonCode(text: string, bearbeite: (prosa: string) => string): string {
    const teile: string[] = [];
    let prosa: string[] = [];
    let code: string[] = [];
    let zaun: string | null = null;

    const prosaAbgeben = () => {
        if (prosa.length > 0) teile.push(bearbeite(prosa.join('\n')));
        prosa = [];
    };

    for (const zeile of text.split('\n')) {
        if (zaun === null) {
            const treffer = zeile.match(OEFFNET);
            if (!treffer) { prosa.push(zeile); continue; }
            prosaAbgeben();
            zaun = treffer[1];
            code = [zeile];
            continue;
        }
        code.push(zeile);
        if (schliesst(zeile, zaun)) {
            teile.push(code.join('\n'));
            code = [];
            zaun = null;
        }
    }

    prosaAbgeben();
    if (zaun !== null) teile.push(code.join('\n'));
    return teile.join('\n');
}

/**
 * Setzt Quelltext zwischen Zaeune, mit Sprachangabe.
 *
 * Der Zaun ist immer laenger als die laengste Backtick-Folge im Code selbst.
 * Sonst beendete ein Schueler, der Markdown in einem Python-String schreibt
 * (`"```"`), den Block mitten im eigenen Programm.
 */
export function alsCodeblock(inhalt: string, sprache: string): string {
    const laengsteFolge = Math.max(0, ...(inhalt.match(/`+/g) ?? []).map(f => f.length));
    const zaun = '`'.repeat(Math.max(3, laengsteFolge + 1));
    return `${zaun}${sprache}\n${inhalt.replace(/\n+$/, '')}\n${zaun}`;
}
