import type { EquivalenceGroup } from './types';
import { logger } from '../logger';

/**
 * Äquivalenzgruppen aus der Modell-Antwort prüfen.
 * 🛡️
 *
 * Eine Gruppe sagt: „diese Präfixe sind gleichwertig". Der `GraphRunner`
 * probiert daraufhin JEDE Zuordnung durch und behält die beste für die
 * Schülerin — wer seine Subnetze anders benannt hat, soll nicht dafür bestraft
 * werden.
 *
 * Herausgezogen aus `graph-generator.ts`: ein geschlossenes Teilgebiet, das der
 * Erzeuger nur BENUTZT. Kein Zersägen — die Prompt-Erstellung und das Parsen
 * bleiben dort am Stück.
 */

/**
 * Wie viele Vertauschungen der Abgleich höchstens durchspielt.
 *
 * `GraphRunner` probiert JEDE Zuordnung der Präfixe durch und behält die beste
 * für die Schülerin — das ist der Sinn der Gruppen: wer seine Subnetze anders
 * benannt hat, soll nicht dafür bestraft werden. Der Aufwand wächst dabei
 * fakultativ, und für jede Zuordnung läuft eine vollständige Bewertung.
 *
 * Gemessen: 8 Präfixe (40 320 Zuordnungen) brauchen knapp eine Sekunde, 10
 * bereits über eine Minute. Im PURE- und Desktop-Betrieb läuft das im Browser
 * der Lehrkraft — dort ist das kein langsamer Vorgang mehr, sondern ein
 * eingefrorenes Fenster. Und ein Einfrieren fängt kein `catch` ab.
 *
 * 5040 entspricht sieben Präfixen je Gruppe.
 */
const MAX_ZUORDNUNGEN = 5040;

const fakultaet = (n: number): number => (n <= 1 ? 1 : n * fakultaet(n - 1));

/**
 * Prüft die Äquivalenzgruppen aus der Modell-Antwort.
 *
 * Sie wurden bis zum 18.08.2026 ungeprüft übernommen. Zwei Folgen:
 *
 * 1. Eine Gruppe ohne `prefixes` liess die Bewertung mit einem TypeError
 *    abstürzen. Der Aufrufer fängt ihn zwar, die Aufgabe verlor dabei aber
 *    still ihre Graph-Bewertung.
 * 2. Eine zu grosse Gruppe fror die Oberfläche ein — dagegen hilft kein
 *    Auffangen.
 *
 * Modell-Ausgaben sind Eingaben, keine Zusicherungen.
 */
export function pruefeAequivalenzgruppen(roh: unknown): EquivalenceGroup[] | undefined {
  if (!Array.isArray(roh)) return undefined;

  const brauchbare: EquivalenceGroup[] = [];

  for (const gruppe of roh) {
    if (!gruppe || typeof gruppe !== 'object') continue;

    const prefixes = (gruppe as { prefixes?: unknown }).prefixes;
    if (!Array.isArray(prefixes)) {
      logger.warn('Äquivalenzgruppe ohne Präfix-Liste verworfen', { gruppe: JSON.stringify(gruppe).slice(0, 120) });
      continue;
    }

    const sauber = Array.from(new Set(
      prefixes.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    ));

    // Eine Gruppe aus einem einzigen Präfix hat nur eine Zuordnung — sie
    // beschreibt keine Gleichwertigkeit und kostet trotzdem einen Durchlauf.
    if (sauber.length < 2) continue;

    if (fakultaet(sauber.length) > MAX_ZUORDNUNGEN) {
      logger.warn('Äquivalenzgruppe zu gross — verworfen, statt die Oberfläche einzufrieren', {
        anzahlPraefixe: sauber.length,
        grenze: MAX_ZUORDNUNGEN
      });
      continue;
    }

    brauchbare.push({ id: String((gruppe as { id?: unknown }).id ?? `gruppe-${brauchbare.length + 1}`), prefixes: sauber });
  }

  // Auch das PRODUKT über alle Gruppen wächst multiplikativ. Zwei Gruppen zu je
  // sechs Präfixen sind einzeln harmlos und zusammen über eine halbe Million
  // Zuordnungen.
  let gesamt = 1;
  const behalten: EquivalenceGroup[] = [];
  for (const gruppe of brauchbare) {
    const naechste = gesamt * fakultaet(gruppe.prefixes.length);
    if (naechste > MAX_ZUORDNUNGEN) {
      logger.warn('Äquivalenzgruppe verworfen: zusammen mit den vorherigen zu viele Zuordnungen', {
        gruppe: gruppe.id,
        waere: naechste,
        grenze: MAX_ZUORDNUNGEN
      });
      continue;
    }
    gesamt = naechste;
    behalten.push(gruppe);
  }

  return behalten.length > 0 ? behalten : undefined;
}
