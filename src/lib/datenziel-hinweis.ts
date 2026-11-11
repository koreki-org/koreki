import { DEFAULT_OPENAI_COMPATIBLE_BASE_URL } from './ai/constants';
import type { AppSettings } from '../types';

/**
 * Der Satz, den die Lehrkraft vor dem Senden bestätigt: wohin die Arbeiten gehen.
 *
 * Er muss den Empfänger so genau nennen, wie die Einstellung ihn kennt. Bis zum
 * 11.11.2026 hieß es für jeden OpenAI-kompatiblen Anbieter nur „innerhalb der
 * Europäischen Union“ — auch für Mittwald, den voreingestellten Anbieter dieser
 * Familie, den Schulen über ihren eigenen Vertrag nutzen.
 *
 * Eine leere Adresse heißt: der Server nimmt seinen Vorgabewert, und der ist
 * Mittwald (`resolveOpenAiConnection`). Nur eine Server-Variable
 * `OPENAI_API_BASE` könnte das ändern; die kennt der Client nicht. Deshalb
 * fällt eine fremde Adresse auf den allgemeinen Satz zurück, statt einen
 * Empfänger zu nennen, der nicht stimmt.
 */

const VORSPANN = 'Ich bestätige, dass ich die oben hochgeladenen Dokumente anonymisiert habe.';

function istMittwald(openaiUrl: string | undefined): boolean {
    const adresse = openaiUrl?.trim() || DEFAULT_OPENAI_COMPATIBLE_BASE_URL;
    try {
        const host = new URL(adresse).hostname;
        return host === 'mittwald.de' || host.endsWith('.mittwald.de');
    } catch {
        return false;
    }
}

export function datenzielBestaetigung(settings?: Pick<AppSettings, 'provider' | 'openaiUrl'>): string {
    if (settings?.provider === 'ollama') {
        return `${VORSPANN} Da Sie eine lokale KI-Instanz (Ollama) nutzen, verbleiben Ihre Daten vollständig innerhalb Ihrer Infrastruktur.`;
    }
    if (settings?.provider === 'mistral') {
        return `${VORSPANN} Mir ist bekannt, dass die Daten zur Verarbeitung an die europäische KI-Schnittstelle von Mistral AI (Paris, Frankreich) übertragen werden.`;
    }
    if (settings?.provider === 'openai-compatible' && istMittwald(settings.openaiUrl)) {
        return `${VORSPANN} Mir ist bekannt, dass die Daten zur Verarbeitung an die KI-Schnittstelle der Mittwald CM Service GmbH & Co. KG (Espelkamp, Deutschland) übertragen werden.`;
    }
    return `${VORSPANN} Mir ist bekannt, dass die Daten an eine KI-Schnittstelle innerhalb der Europäischen Union übertragen werden.`;
}
