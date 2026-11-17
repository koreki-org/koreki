import { promises as fs } from 'fs';
import path from 'path';
import { LlmJsonParseError } from './llm-json';
import { logger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Legt die Rohantwort ab, wenn eine KI-Antwort nicht als JSON lesbar war.
 *
 * Nur zur Fehlersuche und nur, wenn `KOREKI_ROHANTWORT_DIR` gesetzt ist —
 * sonst tut die Funktion nichts. Die Fehlermeldung selbst zeigt bloss Anfang
 * und Ende der Antwort; die kaputte Stelle liegt fast immer dazwischen.
 *
 * DATENSCHUTZ: Die Antwort enthaelt Feedback zu Schuelerarbeiten und kann
 * daraus zitieren. Deshalb ist der Mitschnitt aus, solange niemand ihn
 * ausdruecklich einschaltet, und landet in einem Ordner, den die Lehrkraft
 * selbst waehlt — nie im Projekt, nie im Protokoll.
 *
 * ANLASS (16.11.2026): Bei qwen3.8 scheiterten acht Korrekturen einer Klasse
 * mit derselben Meldung („Expected property name or '}'", stets Spalte 7).
 * Ohne die Rohantwort war nicht zu sehen, was das Modell dort schrieb.
 */
export async function legeRohantwortAb(error: unknown, endpunkt: string): Promise<void> {
    const ordner = process.env.KOREKI_ROHANTWORT_DIR;
    if (!ordner || !(error instanceof LlmJsonParseError)) return;

    const zeit = new Date().toISOString().replace(/[:.]/g, '-');
    const datei = path.join(ordner, `${zeit}-${endpunkt}.txt`);
    try {
        await fs.mkdir(ordner, { recursive: true });
        await fs.writeFile(datei, error.rawResponse, 'utf8');
        logger.info('Rohantwort abgelegt', { datei, laenge: error.rawResponse.length });
    } catch (e) {
        logger.warn('Rohantwort konnte nicht abgelegt werden', { message: toErrorMessage(e) });
    }
}
