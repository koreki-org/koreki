import type { AppSettings } from '../../types';
import { isLocalInstance } from '../env-context';

/**
 * Wann eine Anfrage im PURE-Modus ein Guthaben kostet.
 * 💳
 *
 * Zwei Bedingungen, die zusammengehoeren:
 *
 * - `isLocalInstance()` — Desktop und Community rechnen gar nicht ab. Der
 *   Aufruf ginge dort ins Leere und produzierte nur Netzwerk-/CSP-Fehler.
 * - `provider !== 'ollama'` — laeuft das Modell auf der Maschine der
 *   Lehrkraft, entsteht uns kein Aufwand. Dafuer Guthaben zu buchen, waere
 *   eine Abrechnung fuer eine Leistung, die wir nicht erbracht haben.
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026: Die Regel stand an zwei Aufrufstellen — mit
 * ZWEI VERSCHIEDENEN Bedingungen. Der `ai-orchestrator` nahm Ollama aus, der
 * `ocr-orchestrator` nicht. Wer im PURE-Modus ein lokales Ollama betrieb,
 * zahlte fuer OCR-Seiten und fuer Korrekturen nicht. Der Kommentar an der
 * ersten Stelle nannte "OLLAMA MODE" ausdruecklich als abrechnungsfrei — die
 * zweite Stelle hatte davon nie erfahren.
 *
 * Deshalb steht die Bedingung jetzt EINMAL hier statt zweimal dort. Ein
 * Waechter waere die schwaechere Loesung: Was nur an einer Stelle existiert,
 * kann nicht auseinanderlaufen.
 *
 * @module billing-gate
 */
export function istAbrechenbar(settings: Pick<AppSettings, 'provider'> | undefined | null): boolean {
    return !isLocalInstance() && settings?.provider !== 'ollama';
}
