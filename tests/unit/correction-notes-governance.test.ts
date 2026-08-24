/**
 * Waechter: Jeder Ausgang der Aufgaben-Zuordnung gibt die Notizen des Modells weiter.
 *
 * ANLASS (24.08.2026). Die Korrektur-KI schreibt zu jeder Aufgabe eine Begruendung in
 * `correctionNotes`, BEVOR sie die Punkte setzt — der Denkschritt, den
 * `prompt-engineering` §8 als Pflichtfeld fuehrt. Gemessen wurden 899 bis 4221 Zeichen,
 * auch ohne zusaetzliche Anweisung. Von den sieben `return`-Objekten in
 * `correction-mapping.ts` trug genau EINES das Feld weiter. Bei jeder Textaufgabe war
 * die Begruendung damit weg, bevor sie irgendwo ankam: Die Lehrkraft sah nur eine
 * Punktzahl ohne Herleitung, und die Fehlersuche musste sie aus dem Feedback-Text
 * rueckwaerts erschliessen.
 *
 * WARUM EIN QUELLTEXT-TEST UND KEIN VERHALTENS-TEST. Sieben Fixtures durchzuspielen
 * fangen den ACHTEN Ausgang nicht — und genau das war der Fehler: nicht eine falsche
 * Funktion, sondern eine Verzweigung INNERHALB einer Funktion, die ausscherte. Der
 * Idempotenz-Zweig von `mapCalcTraceTask` verwarf das Feld, der Zweig zwei Bildschirme
 * weiter unten reichte es durch. Deshalb pruefen wir hier die Vollstaendigkeit der
 * Ausgaenge, nicht das Ergebnis einer Auswahl. Bauart wie `profile-family-symmetry`:
 * Vollstaendigkeit erzwingen, keinen Zaehlerstand einfrieren.
 *
 * DIE REGEL. Jeder Ausgang gibt die Notizen des Modells unveraendert weiter, sofern
 * eine KI-Aufgabe vorlag. Kein Ausgang erfindet, kuerzt oder ueberschreibt sie.
 * Ausnahmen brauchen eine `// ARCH:`-Zeile mit Begruendung im Objekt selbst.
 *
 * NICHT GEDECKT. Dass die Notizen ANGEZEIGT werden, prueft dieser Test nicht — nur,
 * dass sie ankommen. Und er sagt nichts ueber ihren Inhalt: Der Verlust des Feldes war
 * NICHT die Ursache der Nachsicht bei duennen Antworten, er passiert, nachdem die
 * Punkte feststehen.
 */
import * as fs from 'fs';
import * as path from 'path';

const QUELLE = path.join(__dirname, '../../src/lib/ai/correction-mapping.ts');
const quelltext = fs.readFileSync(QUELLE, 'utf-8');

/**
 * `mapLayoutTask` waehlt nur den Zweig aus und baut selbst kein Ergebnis —
 * es hat nichts durchzureichen.
 */
const KEIN_EIGENER_AUSGANG = ['mapLayoutTask'];

/**
 * Die Zuordnungs-Funktionen, die dieser Test abdeckt. Wer eine neue ergaenzt und
 * diese Liste nicht anfasst, bekommt einen roten Test statt einer stillen Luecke.
 */
const ERWARTETE_FUNKTIONEN = [
    'mapCalcTraceTask',
    'mapGraphTask',
    'mapModelTask',
    'mapMissingTask'
];

/** Alle exportierten `map…Task`-Funktionen, wie sie im Quelltext stehen. */
function findeFunktionsnamen(text: string): string[] {
    const namen: string[] = [];
    const suche = /export function (map\w*Task)\s*\(/g;
    let treffer: RegExpExecArray | null;
    while ((treffer = suche.exec(text)) !== null) {
        if (!KEIN_EIGENER_AUSGANG.includes(treffer[1])) namen.push(treffer[1]);
    }
    return namen;
}

/** Der Rumpf einer Funktion, ueber Klammerzaehlung ab ihrer oeffnenden `{`. */
function lieseFunktionsrumpf(text: string, name: string): string {
    const start = text.indexOf(`export function ${name}`);
    if (start === -1) throw new Error(`Funktion ${name} nicht gefunden.`);
    return lieseBlock(text, text.indexOf('{', start));
}

/** Ein `{…}`-Block ab der angegebenen oeffnenden Klammer, einschliesslich beider Klammern. */
function lieseBlock(text: string, offen: number): string {
    let tiefe = 0;
    for (let i = offen; i < text.length; i++) {
        if (text[i] === '{') tiefe++;
        else if (text[i] === '}') {
            tiefe--;
            if (tiefe === 0) return text.slice(offen, i + 1);
        }
    }
    throw new Error('Unbalancierte Klammern im Quelltext.');
}

/**
 * Traegt das Objekt dieses Feld?
 *
 * Muss die Kurzschreibweise mitzaehlen: `mapModelTask` schreibt `feedback,` statt
 * `feedback: feedback`. Eine erste Fassung dieses Waechters suchte nur nach
 * `feedback:` — sie uebersprang damit ausgerechnet den Ausgang, dessen Verlust
 * der Anlass fuer diesen Test war, und meldete gruen. Aufgefallen bei der
 * Gegenprobe: Zeile entfernt, Test blieb gruen.
 */
function hatFeld(objekt: string, feld: string): boolean {
    return new RegExp(`\\b${feld}\\s*[,:}]`).test(objekt);
}

/**
 * Die Ergebnis-Objekte einer Funktion. Sie sind daran erkennbar, dass sie unter
 * dem Schluessel `task:` stehen — die Form, die `TaskMappingResult` vorschreibt.
 */
function findeErgebnisobjekte(rumpf: string): string[] {
    const objekte: string[] = [];
    const suche = /\btask:\s*\{/g;
    let treffer: RegExpExecArray | null;
    while ((treffer = suche.exec(rumpf)) !== null) {
        const offen = rumpf.indexOf('{', treffer.index);
        objekte.push(lieseBlock(rumpf, offen));
    }
    return objekte;
}

describe('Waechter: Notizen des Modells an jedem Zuordnungs-Ausgang', () => {
    it('deckt alle exportierten Zuordnungs-Funktionen ab', () => {
        const gefunden = findeFunktionsnamen(quelltext).sort();
        expect(gefunden).toEqual([...ERWARTETE_FUNKTIONEN].sort());
    });

    describe.each(ERWARTETE_FUNKTIONEN)('%s', name => {
        it('gibt an JEDEM Ausgang die Notizen weiter — oder begruendet die Ausnahme', () => {
            const rumpf = lieseFunktionsrumpf(quelltext, name);
            const objekte = findeErgebnisobjekte(rumpf);

            expect(objekte.length).toBeGreaterThan(0);

            objekte.forEach((objekt, index) => {
                // Nur Objekte, die tatsaechlich ein bewertetes Ergebnis sind.
                if (!hatFeld(objekt, 'pointsObtained') || !hatFeld(objekt, 'feedback')) return;

                const reichtDurch = hatFeld(objekt, 'correctionNotes');
                const istBegruendet = /\/\/\s*ARCH:/.test(objekt);

                if (!reichtDurch && !istBegruendet) {
                    throw new Error(
                        `${name}, Ausgang ${index + 1}: Das Ergebnis traegt kein "correctionNotes". ` +
                        `Die Notizen des Modells gehen hier verloren. Entweder durchreichen ` +
                        `(correctionNotes: aiTask?.correctionNotes || '') oder die Auslassung ` +
                        `im Objekt mit einer "// ARCH:"-Zeile begruenden.`
                    );
                }
            });
        });
    });

    it('uebersieht kein Ergebnis-Objekt (Form-Kontrolle)', () => {
        // Der Test erkennt Ergebnisse an `task: {`. Aendert jemand diese Form, wuerde
        // die Pruefung oben stillschweigend nichts mehr finden — deshalb hier der
        // Gegencheck: Jedes `pointsObtained:` im Zustaendigkeitsbereich muss in einem
        // erkannten Objekt liegen.
        ERWARTETE_FUNKTIONEN.forEach(name => {
            const rumpf = lieseFunktionsrumpf(quelltext, name);
            const imRumpf = (rumpf.match(/pointsObtained:/g) || []).length;
            const inObjekten = findeErgebnisobjekte(rumpf)
                .reduce((summe, o) => summe + (o.match(/pointsObtained:/g) || []).length, 0);

            expect({ funktion: name, gefunden: inObjekten }).toEqual({ funktion: name, gefunden: imRumpf });
        });
    });
});
