/**
 * Welche Modellkonfiguration ist gegen den Referenzsatz gemessen — und welche nicht.
 *
 * ANLASS (05.09.2026). Die Modellwahl liegt beim Betreiber, gemessen ist genau EINE
 * Konfiguration. Wer ein anderes Modell einstellt, betreibt Koreki ausserhalb des
 * gemessenen Bereichs — bisher stand das nur in der technischen Dokumentation
 * (Anhang IV §4.6) und an keiner Stelle dort, wo die Wahl getroffen wird.
 *
 * Es ist mehr als "nicht gemessen": Ein Teil der Schutzmassnahmen wirkt bauartbedingt
 * nur auf dem Ollama-Weg. Die Abtastwerte der Rechenweg-Extraktion werden dort je
 * Aufgabenart berechnet (`ollama-sampling.ts`); bei Mistral und OpenAI-kompatiblen
 * Anbietern stehen sie fest im Quelltext (`grading/calc-trace-extraction.ts`), und der
 * Denkschritt, der die Extraktion messbar verbessert (Risikomanagement R18), wird dort
 * nicht gesendet — bei OpenAI-kompatiblen Anbietern kann er es nicht, weil der uebliche
 * Vermittler bei den noetigen Zusatzfeldern abbricht (`openai-provider.ts`).
 *
 * Deshalb genuegt es NICHT, auf den Modellnamen zu schauen: Dasselbe Qwen 3.6 ueber
 * einen OpenAI-kompatiblen Endpunkt ist eine andere Konfiguration als ueber lokales
 * Ollama. Anbieter UND Modell entscheiden.
 *
 * Bewusst EINE Quelle statt handgesetzter Kennzeichen an jeder Auswahl: Ein zweites,
 * handgepflegtes Kennzeichen laeuft mit der Zeit auseinander — dann traegt ein neu
 * aufgenommenes Modell stillschweigend das Etikett "geprueft".
 */
import type { AppSettings } from '@/types';

/** Das einzige gemessene Modell. Anhang IV §4.6. */
export const GEPRUEFTES_MODELL = 'qwen3.6';

/** Der einzige gemessene Anbieterweg. */
export const GEPRUEFTER_ANBIETER = 'ollama';

export const EXPERIMENTELL_KENNZEICHEN = 'Experimentell';

export const EXPERIMENTELL_BEGRUENDUNG =
    'Diese Kombination ist nicht gegen den Referenzsatz gemessen. Gemessen ist allein Qwen 3.6 über lokales Ollama; dort greifen auch Schutzmaßnahmen, die auf anderen Wegen entfallen. Die Bewertung bleibt nutzbar — prüfen Sie sie nur besonders sorgfältig.';

/** Modellkennung, die fuer den gewaehlten Anbieter tatsaechlich gesendet wird. */
export function aktivesModell(settings: Pick<AppSettings, 'provider' | 'ollamaModel' | 'openaiModel' | 'model'>): string {
    if (settings.provider === 'ollama') return settings.ollamaModel ?? '';
    if (settings.provider === 'openai-compatible') return settings.openaiModel ?? '';
    return settings.model ?? '';
}

/** Wahr nur fuer die eine gemessene Konfiguration: Qwen 3.6 ueber lokales Ollama. */
export function istGepruefteKonfiguration(anbieter: string | undefined, modell: string | undefined): boolean {
    return anbieter === GEPRUEFTER_ANBIETER
        && (modell ?? '').toLowerCase().includes(GEPRUEFTES_MODELL);
}
