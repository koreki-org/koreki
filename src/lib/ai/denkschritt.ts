import { denkschrittAktiv } from './temperature-guidance';
import type { AIAction } from './prompt-dispatch';

/**
 * Denkt das Modell bei dieser Aktion laut mit? 💭
 *
 * Die Frage wurde bis zum 07.09.2026 in jeder Anbieter-Familie einzeln beantwortet —
 * und nur bei Ollama vollstaendig. Der OpenAI-kompatible Weg fuehrte dieselbe Leiter
 * als Kommentar und sendete das Ergebnis an keiner Stelle an den Anbieter. Bei
 * Qwen 3.6 ueber Mittwald heisst das: Der Denkschritt lief IMMER, auch bei der
 * Bilderkennung, wo die Datei ausdruecklich das Gegenteil behauptete.
 *
 * Gemessen an einer echten Schuelerseite (2304x3264) gegen `Qwen3.6-35B-A3B-FP8`:
 *
 * | Bilderkennung                | Dauer je Seite | Denktext | Ergebnis |
 * |------------------------------|----------------|----------|----------|
 * | Denkschritt offen (Zustand)  | 60,6 / 112,5 s | ~46.000 Zeichen | `content` LEER, `finish_reason: length` |
 * | Denkschritt aus              | 0,8 / 0,9 s    | 0        | Text vollstaendig |
 *
 * Das war kein Geschwindigkeitsproblem, sondern ein Ausfall: Das Modell verbrauchte
 * die gesamte Antwortlaenge mit Abwaegen und lieferte keinen Text.
 *
 * Diese Datei ist ab sofort die EINE Stelle, die die Frage beantwortet. Ollama und
 * der OpenAI-kompatible Weg lesen dieselbe Leiter; nur das FELD unterscheidet sich,
 * weil die Schnittstellen verschieden gebaut sind (siehe `denkschritt-feld.md`-
 * Abschnitt in docs/technical/ai-provider-infrastructure.md).
 */

/**
 * Aktionen, die ein JSON-Geruest erzeugen.
 *
 * Sie denken nicht laut: der Denktext landete sonst in genau dem JSON, das sie
 * erzeugen sollen. Dieselbe Liste bestimmt bei Ollama die Temperatur-Behandlung.
 */
export const STRUKTUR_AKTIONEN: AIAction[] = [
    'clean-and-analyze',
    'clean-and-map',
    'variable-extraction',
    'generate-graph',
    'refine-graph',
    'generate-calc-trace',
    'calc-trace-extraction'
];

/**
 * Die Leiter. Reihenfolge ist bedeutungstragend — `calc-trace-extraction` steht in
 * `STRUKTUR_AKTIONEN` und muss trotzdem denken, also wird sie vorher abgefangen.
 *
 * 1. `vision` — nie. Siehe die Messung im Kopf dieser Datei. Mittwald schreibt
 *    dasselbe in die eigene Modell-Dokumentation: "Always disable thinking mode for
 *    vision tasks - thinking adds latency without improving image understanding."
 *
 * 2. `anonymize` — nie. Das Schwaerzen ersetzt Namen, es waegt nichts ab; ein
 *    Denkschritt kostet dort nur Zeit. Entscheidung vom 07.09.2026. Bei Ollama folgte
 *    die Aktion bisher dem Profil — das war keine Absicht, sondern die Restmenge der
 *    Leiter.
 *
 * 3. `calc-trace-extraction` — immer, unabhaengig vom Profil. Gemessen am 04.09.2026:
 *    Ohne Denkschritt erschliesst das Modell die gemeinte Rechnung mitten in der
 *    Ausgabe und traegt den Wert der Formel ein statt den des Schuelers (notiert war
 *    "x = 9", eingetragen die 6). Fuenf andere Gegenmassnahmen blieben wirkungslos.
 *    Die Extraktion braucht den Denkschritt nicht, weil die Lehrkraft ihn
 *    eingeschaltet hat, sondern weil sie ohne ihn falsch abschreibt.
 *
 * 4. uebrige Struktur-Aktionen — nie, siehe `STRUKTUR_AKTIONEN`.
 *
 * 5. alles andere (`correction`, `second-opinion`, `student-simulator`) — was im
 *    KI-Intelligenz-Modal steht. Ungesetzt heisst AN, siehe `denkschrittAktiv`.
 */
export function denktBeiAktion(action: AIAction, enableThinking?: boolean | null): boolean {
    if (action === 'vision') return false;
    if (action === 'anonymize') return false;
    if (action === 'calc-trace-extraction') return true;
    if (STRUKTUR_AKTIONEN.includes(action)) return false;
    return denkschrittAktiv(enableThinking);
}
