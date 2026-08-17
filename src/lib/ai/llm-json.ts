/**
 * JSON aus einer Modell-Antwort lesen.
 * 🧩
 *
 * Sprachmodelle liefern selten sauberes JSON. Sie packen es in einen
 * Markdown-Block, stellen einen Denkblock voran, lassen ein Anfuehrungszeichen
 * im Fliesstext unmaskiert oder brechen mitten im Satz ab.
 *
 * WARUM DIESE DATEI EXISTIERT
 * ---------------------------
 * Es gab zwei unabhaengige Implementierungen davon — eine in `ollama-logic`,
 * eine in `openai-provider`. Beide korrekt, beide gepflegt, und beide mit
 * Faehigkeiten, die der jeweils anderen fehlten:
 *
 * - `ollama-logic` entfernte nur `<thought>` und `<reasoning>`. Qwen3 schreibt
 *   aber `<think>`. Enthaelt dieser Denkblock selbst eine geschweifte Klammer —
 *   und beim Nachdenken ueber JSON tut er das —, greift die gierige Extraktion
 *   daneben und die ganze Korrektur scheitert. Genau der Fall, fuer den der
 *   lokale Pfad gedacht ist.
 * - `openai-provider` kannte weder `escapeInnerQuotes` noch die
 *   LaTeX-Rettung: unmaskierte Anfuehrungszeichen und einfach maskierte
 *   Formeln fielen dort durch.
 * - Die Reparatur abgeschnittener Antworten gab es nur bei `openai-provider`.
 *
 * Zwei Kopien derselben Aufgabe laufen auseinander, sobald jemand nur eine
 * anfasst. Hier steht die Vereinigung beider — jeder Anbieter kann ab jetzt
 * alles, was vorher nur einer konnte.
 *
 * Die Reparaturen sind nach Eingriffstiefe geordnet und werden nur so weit
 * angewendet, wie noetig: valides JSON wird nie angefasst.
 */

/**
 * Denkbloecke entfernen.
 *
 * Jedes Modell hat seine eigene Schreibweise. Das `(<\/tag>|$)` faengt den Fall
 * ab, dass die Antwort mitten im Denkblock abbricht — dann fehlt das
 * schliessende Tag, und ohne die Alternative bliebe der ganze Rest stehen.
 */
export function stripThinkingBlocks(raw: string): string {
    return raw
        .replace(/<think>[\s\S]*?(<\/think>|$)/gi, '')
        .replace(/<thought>[\s\S]*?(<\/thought>|$)/gi, '')
        .replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '')
        .replace(/<chain_of_thought>[\s\S]*?(<\/chain_of_thought>|$)/gi, '')
        .replace(/<channel>[\s\S]*?(<\/channel>|$)/gi, '')
        .replace(/<annotation>[\s\S]*?(<\/annotation>|$)/gi, '')
        .replace(/\[thought\][\s\S]*?(\[\/thought\]|$)/gi, '')
        .replace(/\[think\][\s\S]*?(\[\/think\]|$)/gi, '')
        .trim();
}

/**
 * Den JSON-Teil aus der Antwort herausschneiden.
 *
 * Erst der Markdown-Block, falls vorhanden — er ist die zuverlaessigste
 * Markierung. Sonst gierig von der ersten oeffnenden bis zur letzten
 * schliessenden Klammer. Ob Objekt oder Feld entschieden wird, haengt daran,
 * was zuerst kommt.
 */
export function extractJsonCandidate(text: string): string {
    const markdown = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const body = markdown && markdown[1] ? markdown[1].trim() : text.trim();

    const firstCurly = body.indexOf('{');
    const firstSquare = body.indexOf('[');
    const istFeld = firstSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly);

    const treffer = istFeld ? body.match(/\[[\s\S]*\]/) : body.match(/\{[\s\S]*\}/);
    return treffer ? treffer[0].trim() : body;
}

/**
 * Maskiert Anfuehrungszeichen, die ein Modell innerhalb eines JSON-Strings
 * unmaskiert gelassen hat.
 *
 * Der Scanner unterscheidet dafuer zwischen Schluessel- und Wert-Strings, weil
 * nur so eindeutig ist, welches Anfuehrungszeichen einen String wirklich
 * beendet:
 * - in einem Schluessel beendet ausschliesslich ein folgendes ":" den String
 * - in einem Wert beenden ausschliesslich ",", "}" oder "]" den String
 *
 * Ohne diese Unterscheidung wird ein Zitat im Fliesstext wie
 * `die klassische "Falle":` als Schluesselende gelesen — der String bricht dort
 * ab und der Rest wird zu Syntaxmuell.
 *
 * Bewusste Grenze: Ein Anfuehrungszeichen, dem im Fliesstext ein Komma folgt
 * (`er sagte "hallo", dann ging er`), bleibt mit lokalem Lookahead
 * unentscheidbar und wird weiterhin als Stringende gewertet.
 */
export function escapeInnerQuotes(jsonStr: string): string {
    let result = '';
    let inString = false;
    let stringIsKey = false;
    const containers: string[] = [];
    let lastMeaningful = '';

    const nextNonWhitespaceFrom = (from: number): { char: string; index: number } => {
        let k = from;
        while (k < jsonStr.length) {
            const c = jsonStr[k];
            if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
                return { char: c, index: k };
            }
            k++;
        }
        return { char: '', index: -1 };
    };

    let i = 0;
    while (i < jsonStr.length) {
        const char = jsonStr[i];

        if (char !== '"') {
            result += char;
            if (!inString) {
                if (char === '{' || char === '[') {
                    containers.push(char);
                } else if (char === '}' || char === ']') {
                    containers.pop();
                }
                if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
                    lastMeaningful = char;
                }
            }
            i++;
            continue;
        }

        let backslashes = 0;
        let j = i - 1;
        while (j >= 0 && jsonStr[j] === '\\') {
            backslashes++;
            j--;
        }
        const isEscaped = backslashes % 2 === 1;

        if (!inString) {
            // Ein Schlüssel steht nur direkt hinter "{" oder "," innerhalb eines Objekts.
            inString = true;
            stringIsKey = containers[containers.length - 1] === '{'
                && (lastMeaningful === '{' || lastMeaningful === ',');
            result += char;
            lastMeaningful = char;
            i++;
            continue;
        }

        const { char: nextNonWhitespace, index: nextIdx } = nextNonWhitespaceFrom(i + 1);

        let isStructural = stringIsKey
            ? nextNonWhitespace === ':'
            : nextNonWhitespace === ',' || nextNonWhitespace === '}' || nextNonWhitespace === ']';

        // Fehlendes Komma zwischen Wert und folgendem Schlüssel: "...wert" "key": ...
        let nextKeyMatched = false;
        if (!isStructural && !stringIsKey && nextNonWhitespace === '"') {
            let nextQuoteIdx = -1;
            let m = nextIdx + 1;
            while (m < jsonStr.length) {
                if (jsonStr[m] === '"' && jsonStr[m - 1] !== '\\') {
                    nextQuoteIdx = m;
                    break;
                }
                m++;
            }
            if (nextQuoteIdx !== -1 && nextNonWhitespaceFrom(nextQuoteIdx + 1).char === ':') {
                isStructural = true;
                nextKeyMatched = true;
            }
        }

        if (isStructural) {
            if (isEscaped && result.endsWith('\\')) {
                result = result.slice(0, -1);
            }
            inString = false;
            result += char;
            lastMeaningful = char;
            if (nextKeyMatched) {
                result += ',';
                lastMeaningful = ',';
            }
        } else if (isEscaped) {
            result += char;
        } else {
            result += '\\"';
        }
        i++;
    }
    return result;
}

/**
 * LaTeX-Befehle, deren erster Buchstabe zugleich eine gültige JSON-Escape-Sequenz bildet.
 *
 * `\text` ist aus Sicht von JSON.parse ein Tabulator gefolgt von "ext", `\frac` ein
 * Seitenvorschub gefolgt von "rac". Schreibt ein Modell LaTeX nur einfach maskiert,
 * wird der Befehl beim Parsen still zerstört — die Rechnung in der Musterlösung ist
 * danach unlesbar. Nur Befehle nach \b \f \n \r \t sind betroffen; alle anderen
 * (z. B. `\alpha`) deckt die allgemeine Backslash-Reparatur darunter bereits ab.
 */
const LATEX_COMMANDS_COLLIDING_WITH_JSON_ESCAPES = [
    // \t
    'text', 'textbf', 'textit', 'times', 'theta', 'tau', 'tan', 'tfrac', 'to', 'top', 'triangle',
    // \f
    'frac', 'forall', 'flat', 'frown',
    // \b
    'beta', 'bar', 'binom', 'bmod', 'boxed', 'bullet', 'big', 'bigg',
    // \n
    'nabla', 'neq', 'not', 'nu', 'nrightarrow',
    // \r
    'rightarrow', 'right', 'rho', 'rangle', 'rfloor', 'rceil'
];

const LATEX_ESCAPE_COLLISION_PATTERN = new RegExp(
    `(?<!\\\\)\\\\(?=(?:${LATEX_COMMANDS_COLLIDING_WITH_JSON_ESCAPES.join('|')})(?![a-zA-Z]))`,
    'g'
);

/**
 * Repariert die typischen JSON-Verstöße von Sprachmodellen, bevor JSON.parse greift.
 */
export function repairJsonString(jsonStr: string): string {
    // 1. Unmaskierte Anführungszeichen innerhalb von Strings maskieren
    let repaired = escapeInnerQuotes(jsonStr);
    // 2. Einfach maskierte LaTeX-Befehle retten, bevor JSON sie als Steuerzeichen liest
    repaired = repaired.replace(LATEX_ESCAPE_COLLISION_PATTERN, '\\\\');
    // 3. Unmaskierte Backslashes reparieren (LaTeX, Pfade)
    repaired = repaired.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    // 4. Echte Zeilenumbrüche innerhalb von Strings maskieren
    repaired = repaired.replace(/"((?:[^"\\]|\\[\s\S])*)"/g, (match, p1) => {
        return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
    });
    return repaired;
}

/** Entfernt Kommata, die unmittelbar vor einer schliessenden Klammer stehen. */
export function dropTrailingCommas(jsonStr: string): string {
    return jsonStr.replace(/,\s*([\]\}])/g, '$1').trim();
}

/**
 * Schliesst, was eine abgeschnittene Antwort offen gelassen hat.
 *
 * Reisst das Token-Budget mitten im JSON, fehlen Anfuehrungszeichen und
 * Klammern. Das angefangene Feld ist ohnehin unbrauchbar und wird verworfen;
 * alles davor bleibt erhalten. Fuer eine Korrektur ist das der Unterschied
 * zwischen "acht von zehn Aufgaben bewertet" und "gar nichts".
 */
export function repairTruncatedJson(str: string): string {
    let s = str.trim();

    // Ein angefangenes Feld wird NUR verworfen, wenn der Text tatsaechlich
    // mitten in einem String endet.
    //
    // Diese Bedingung ist der ganze Punkt: die gierige Entnahme oben schneidet
    // bereits bei der letzten schliessenden Klammer ab, sodass haeufig ein
    // vollstaendiges Feld am Ende steht und nur die Klammern fehlen. Ohne die
    // Pruefung wirft die Regel darunter genau dieses vollstaendige Feld weg —
    // das Ergebnis ist gueltiges JSON mit einer fehlenden Bewertung, und
    // niemand merkt es.
    if (analysiereStruktur(s).inString) {
        // Angefangenes Feld mit Doppelpunkt: `..., "punkte": 2`
        s = s.replace(/,\s*"[^"]*"?\s*:\s*"?[^"]*$/, '');
        // Angefangener Schluessel ohne Doppelpunkt: `..., "punk`
        s = s.replace(/,\s*"[^"]*$/, '');
    }
    s = s.replace(/,\s*$/, '');

    const { inString, offen } = analysiereStruktur(s);
    if (inString) s += '"';

    for (let i = offen.length - 1; i >= 0; i--) {
        s += offen[i] === '{' ? '}' : ']';
    }
    return s;
}

/**
 * Zaehlt, was am Ende des Textes noch offen steht.
 *
 * Grundlage sowohl fuer die Frage "ist die Antwort abgeschnitten?" als auch
 * fuer das Schliessen selbst — beides muss zwingend dieselbe Sicht auf den
 * Text haben, sonst repariert die eine Seite, was die andere gar nicht als
 * kaputt erkannt hat.
 */
function analysiereStruktur(jsonStr: string): { inString: boolean; offen: string[] } {
    const offen: string[] = [];
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (char === '"' && !isEscaped) {
            inString = !inString;
        } else if (!inString) {
            if (char === '{' || char === '[') offen.push(char);
            else if (char === '}' || char === ']') offen.pop();
        }
        isEscaped = (char === '\\' && !isEscaped);
    }

    return { inString, offen };
}

/**
 * Bricht die Antwort mittendrin ab?
 *
 * Erkennbar an einem offenen String oder offenen Klammern am Ende. Ein bloss
 * fehlerhaftes JSON (unmaskiertes Anfuehrungszeichen, Schlusskomma) ist
 * dagegen ausbalanciert — die Unterscheidung entscheidet, welche Reparatur
 * ueberhaupt zustaendig ist.
 */
export function wirktAbgeschnitten(jsonStr: string): boolean {
    const { inString, offen } = analysiereStruktur(jsonStr);
    return inString || offen.length > 0;
}

/** Wirft der Aufrufer, wenn keine Stufe zum Ziel gefuehrt hat. */
export class LlmJsonParseError extends Error {
    constructor(message: string, readonly rawResponse: string) {
        super(message);
        this.name = 'LlmJsonParseError';
    }
}

/**
 * Liest JSON aus einer Modell-Antwort.
 *
 * Die Stufen sind nach Eingriffstiefe geordnet und werden nacheinander
 * versucht. Die erste, die durchgeht, gewinnt — valides JSON erreicht die
 * Reparaturen also nie. Das ist wichtig, weil jede Reparatur eine Annahme
 * darueber trifft, was das Modell gemeint hat; je weniger davon noetig ist,
 * desto naeher ist das Ergebnis an der Antwort.
 */
export function parseLlmJson<T = unknown>(raw: string): T {
    const roh = extractJsonCandidate(stripThinkingBlocks(raw));

    // Abgeschnittenes wird ZUERST geschlossen, nicht als letzte Stufe.
    //
    // Andernfalls setzt `repairJsonString` an einem halben Objekt an und kann
    // daraus gueltiges, aber falsches JSON machen: der Parser ist dann
    // zufrieden, waehrend ein Feld still verschwunden ist. Ein stiller
    // Datenverlust in einer Korrektur ist schlimmer als ein Fehlschlag — den
    // sieht der Lehrer wenigstens.
    const kandidat = wirktAbgeschnitten(roh) ? repairTruncatedJson(roh) : roh;

    const stufen: ((s: string) => string)[] = [
        s => s,
        repairJsonString,
        s => repairJsonString(dropTrailingCommas(s))
    ];

    let letzterFehler = '';
    for (const aufbereiten of stufen) {
        try {
            return JSON.parse(aufbereiten(kandidat)) as T;
        } catch (e) {
            letzterFehler = e instanceof Error ? e.message : String(e);
        }
    }

    const anfang = raw.slice(0, 100);
    const ende = raw.slice(-100);
    throw new LlmJsonParseError(
        `JSON-Parse fehlgeschlagen (${letzterFehler}). \n\nAnfang: [${anfang}]\n\nEnde: [${ende}]\n\nLänge: ${raw.length}`,
        raw
    );
}
