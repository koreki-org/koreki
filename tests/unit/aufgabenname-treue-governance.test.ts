/**
 * Waechter: Keine Korrektur-Vorlage erlaubt es, einen Aufgabennamen zu kuerzen.
 *
 * ANLASS (02.09.2026). Beim Aufbau der Genauigkeitsmessung fiel ein Fall auf, in dem
 * qwen3.6 eine Arbeit fachlich vollstaendig richtig bewertete — "Die Antworten sind
 * vollstaendig korrekt", overallMatchPercentage 100 — und die Lehrkraft trotzdem
 * 0 von 4 Punkten angezeigt bekam. Das Modell hatte den Aufgabennamen
 * "a) Zwei Ursachen" auf "a)" verkuerzt. `mapLayoutTask` sucht ueber den Namen,
 * `mapMissingTask` findet auch case-insensitiv nichts und vergibt 0 Punkte mit dem
 * Text "Vom System nicht erkannt oder von der KI uebersprungen".
 *
 * Die Ursache stand im Prompt selbst, und zwar als WIDERSPRUCH zwischen zwei
 * aufeinanderfolgenden Zeilen desselben Blocks:
 *
 *   - Der "name" im JSON entspricht exakt dem Namen aus der Aufgabenliste (...)
 *   - Verzichte auf Zusaetze (Beispiel: Nutze "Aufgabe 1" statt "Aufgabe 1 (3 P)").
 *
 * Gemeint war die Punkteangabe. Gelesen wurde: alles, was hinter der Kennung steht,
 * ist ein Zusatz. Das Modell befolgte die konkretere der beiden Zeilen.
 *
 * DIE REGEL. `prompt-engineering` §2 fuehrt die Struktur-Treue (Aufgabennamen,
 * Max-Points) als Layer 1 — unveraenderlich. Eine Vorlage darf dem Modell daher
 * nicht nahelegen, einen Namen zu VERKUERZEN. Sie darf ihm sehr wohl verbieten,
 * etwas HINZUZUFUEGEN; das ist die Regel, die urspruenglich gemeint war. Wer eine
 * Weglass-Anweisung schreibt, muss dazusagen, was weggelassen werden soll.
 *
 * WARUM EIN QUELLTEXT-TEST. Ob ein Modell einen Namen kuerzt, haengt vom Modell ab
 * und ist nicht reproduzierbar pruefbar — dieser Fall trat bei einem Modell auf und
 * bei einem anderen nicht. Pruefbar ist dagegen, ob die Vorlage die Kuerzung
 * ueberhaupt nahelegt. Genau das war hier der Fehler, und genau das kann wiederkommen,
 * wenn jemand die Zeile beim naechsten Mal wieder verknappt.
 *
 * NICHT GEDECKT. Der Test sagt nichts darueber, ob ein Modell sich an die Vorlage
 * haelt, und nichts ueber den Umgang mit einem Namens-Mismatch in
 * `correction-mapping.ts`. Dort bleibt es dabei, dass eine nicht zuordenbare Aufgabe
 * 0 Punkte bekommt — sichtbar gemacht ueber `mappingError` und confidence 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const PROMPT_WURZEL = path.join(process.cwd(), 'src', 'prompts');

/** Alle Vorlagen, die dem Modell das Antwortformat der Korrektur vorgeben. */
function korrekturVorlagen(): string[] {
    const gefunden: string[] = [];
    const gehe = (verzeichnis: string): void => {
        for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
            const voll = path.join(verzeichnis, eintrag.name);
            if (eintrag.isDirectory()) gehe(voll);
            else if (eintrag.name.endsWith('.md') && voll.includes(`${path.sep}correction${path.sep}`)) {
                gefunden.push(voll);
            }
        }
    };
    gehe(PROMPT_WURZEL);
    return gefunden;
}

/**
 * Eine Weglass-Anweisung, die nicht sagt, WAS wegzulassen ist.
 *
 * "Verzichte auf Zusaetze." allein trifft auch den beschreibenden Teil des Namens.
 * "Verzichte auf Zusaetze wie die Punkteangabe." benennt den Gegenstand und ist in
 * Ordnung. Gesucht wird deshalb nach der Anweisung OHNE einen benennenden Nachsatz
 * in derselben Zeile.
 */
const WEGLASS_ANWEISUNG = /(verzichte auf|lasse? weg|keine)\s+(zus[äa]tze|erg[äa]nzungen|beiw[eo]rk)/i;
const BENENNT_GEGENSTAND = /(punkt|max|klammer|angabe|die nicht|welche nicht)/i;

/** Eine Anweisung, die das Kuerzen eines Namens ausdruecklich verlangt. */
const KUERZUNGS_ANWEISUNG = /(k[üu]rze|verk[üu]rze|reduziere)\b[^.\n]*\bname/i;

describe('Aufgabenname-Treue in den Korrektur-Vorlagen', () => {
    const vorlagen = korrekturVorlagen();

    it('findet ueberhaupt Vorlagen', () => {
        expect(vorlagen.length).toBeGreaterThan(0);
    });

    it.each(vorlagen)('%s legt keine Kuerzung des Aufgabennamens nahe', (datei) => {
        const zeilen = fs.readFileSync(datei, 'utf-8').split('\n');

        for (let nr = 0; nr < zeilen.length; nr++) {
            const zeile = zeilen[nr];
            if (KUERZUNGS_ANWEISUNG.test(zeile)) {
                throw new Error(
                    `${path.relative(process.cwd(), datei)}:${nr + 1} verlangt, einen Namen zu kuerzen:\n` +
                    `  ${zeile.trim()}\n` +
                    'Struktur-Treue ist Layer 1 (prompt-engineering §2). Der Name wird vollstaendig uebernommen.'
                );
            }
            if (WEGLASS_ANWEISUNG.test(zeile) && !BENENNT_GEGENSTAND.test(zeile)) {
                throw new Error(
                    `${path.relative(process.cwd(), datei)}:${nr + 1} verbietet Zusaetze, ohne zu sagen welche:\n` +
                    `  ${zeile.trim()}\n` +
                    'Ohne benannten Gegenstand liest ein Modell auch den beschreibenden Teil des ' +
                    'Aufgabennamens als Zusatz und kuerzt ihn weg — dann findet die Zuordnung in ' +
                    'correction-mapping.ts die Aufgabe nicht mehr und vergibt 0 Punkte.'
                );
            }
        }
    });

    it('die Vorgabe-Vorlage verlangt den Namen ausdruecklich vollstaendig', () => {
        const datei = path.join(PROMPT_WURZEL, 'core', 'default', 'correction', 'system.md');
        const text = fs.readFileSync(datei, 'utf-8');
        expect(text).toMatch(/VOLLST[ÄA]NDIG/);
    });
});
