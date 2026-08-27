/**
 * Werte woertlich in eine Prompt-Vorlage einsetzen.
 * 🔤🛡️
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026.
 *
 * `String.replace` behandelt den ERSATZTEXT als Muster: `$&`, `` $` ``, `$'`
 * und `$$` haben dort Sonderbedeutung. Wer Schuelertext, Musterloesung oder
 * die Anweisungen der Lehrkraft direkt als Ersatztext uebergibt, gibt diesen
 * Inhalten damit Kontrolle ueber den Aufbau des Prompts. Nachgestellt:
 *
 *   $$E = mc^2$$   ->  $E = mc^2$
 *       LaTeX-Formelblock wird still zu Inline-Mathematik. Das Modell sieht
 *       eine andere Schreibweise, als der Schueler notiert hat — ein Verstoss
 *       gegen den Fidelity Guard, noch bevor das Modell ueberhaupt liest.
 *
 *   $&             ->  {{studentText}}
 *       Der Platzhalter selbst steht wieder da, als haette niemand ersetzt.
 *
 *   $`             ->  alles VOR der Einsetzstelle noch einmal
 *       Der halbe Prompt wird in die Schuelerantwort hineinkopiert.
 *
 *   $'             ->  alles NACH der Einsetzstelle noch einmal
 *       Das ist der ernste Fall: In den Prompt-Vorlagen folgt auf die
 *       Einsetzstelle das schliessende `</task_to_evaluate>`. Ein Schueler,
 *       der `$'` schreibt, laesst dieses Endetag MITTEN IN seiner eigenen
 *       Antwort erscheinen — gewoehnlicher Schuelertext erzeugt
 *       Struktur-Markup des Prompts. Genau die Prompt-Injection, die der
 *       `prompt-engineering`-Skill (§6) strukturell ausschliessen soll.
 *
 * Eine Ersetzungs-FUNKTION kennt diese Sonderbedeutung nicht: Ihr Rueckgabewert
 * wird woertlich eingesetzt. Mehr ist an der Reparatur nicht dran — aber sie
 * muss an JEDER Einsetzstelle stehen, und das ist der Grund, warum es diese
 * Datei gibt statt eines `() =>` an einunddreissig Stellen. Der Waechter dazu
 * steht in `tests/unit/prompt-placeholder-governance.test.ts`.
 *
 * @module prompt-placeholder
 */

/**
 * Setzt `wert` fuer jedes Vorkommen von `platzhalter` ein.
 *
 * ALLE Vorkommen, nicht nur das erste: Ein zurueckgebliebener Platzhalter
 * (`{{studentText}}` im Klartext) waere ohnehin ein Fehler in der Vorlage.
 * Elf der bisherigen Aufrufe ersetzten nur das erste Vorkommen, neun alle —
 * dieselbe Aufgabe, zwei Verhaltensweisen.
 */
export function setzeEin(vorlage: string, platzhalter: string, wert: string): string {
    return vorlage.split(platzhalter).join(wert);
}

/**
 * Die Marken, mit denen der Prompt Fremdtext einfasst.
 *
 * Sie stehen hier und nicht in prompt-builder.ts, damit `entschaerfeMarken` und
 * die Einfassung nicht auseinanderlaufen koennen.
 */
const EINFASSUNGSMARKEN = /<\/?\s*(task_to_evaluate|grading_memory)\s*>/gi;

/**
 * Nimmt Fremdtext die Faehigkeit, die Einfassung des Prompts zu schliessen.
 *
 * GEFUNDEN AM 27.08.2026 durch eine Sonde (`npm run test:injection`): Eine
 * Schuelerantwort, die `</task_to_evaluate>` gefolgt von einer gefaelschten
 * `SYSTEM:`-Zeile enthielt, hob die Bewertung reproduzierbar von 2 auf 4 von 4
 * Punkten. Der Text brach aus seiner Einfassung aus und wurde vom Modell als
 * Anweisung gelesen.
 *
 * `setzeEin` half dagegen nicht und sollte es auch nie: Es schuetzt davor, dass
 * die Sonderzeichen von `String.replace` den ERSATZVORGANG steuern. Hier steuert
 * der Text den PROMPTAUFBAU, nachdem er heil eingesetzt wurde. Zwei
 * verschiedene Luecken, zwei verschiedene Riegel.
 *
 * Die Marke wird sichtbar ersetzt statt still geloescht: So bleibt im
 * Bewertungstext erkennbar, dass jemand es versucht hat.
 */
export function entschaerfeMarken(text: string): string {
    return text.replace(EINFASSUNGSMARKEN, '[Steuerzeichen entfernt]');
}
