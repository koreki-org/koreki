import { toErrorMessage, isAbortError, isRateLimitError, toErrorCode } from '../../src/lib/error-message';

/**
 * Fehlerdeutung (Layer 1)
 * 🧾
 *
 * Die vier Helfer ersetzen 62 `catch (err: any)` im Repo. Ein `any` dort hat
 * die Pruefung fuer den ganzen Block abgeschaltet — die Helfer nehmen `unknown`
 * und muessen deshalb mit allem umgehen, was in JavaScript geworfen werden
 * kann. Genau das prueft diese Datei.
 */
describe('toErrorMessage', () => {
    it('nimmt die Meldung eines Error', () => {
        expect(toErrorMessage(new Error('Kaputt'))).toBe('Kaputt');
    });

    it('nimmt einen geworfenen String unveraendert', () => {
        expect(toErrorMessage('Kaputt')).toBe('Kaputt');
    });

    it('findet die Meldung in einem fremden Objekt ohne Error-Ableitung', () => {
        // Ueber Prozessgrenzen serialisierte Fehler verlieren ihren Prototyp.
        expect(toErrorMessage({ message: 'Vom Tauri-Backend' })).toBe('Vom Tauri-Backend');
    });

    it('faellt bei undefined und null auf den Rueckfalltext zurueck', () => {
        expect(toErrorMessage(undefined, 'Standard')).toBe('Standard');
        expect(toErrorMessage(null, 'Standard')).toBe('Standard');
    });

    it('faellt bei einem Error ohne Meldung auf den Rueckfalltext zurueck', () => {
        expect(toErrorMessage(new Error(''), 'Standard')).toBe('Standard');
    });

    /**
     * Der Grund fuer diesen Fall: `String({})` ergibt "[object Object]". Genau
     * dieser Text stand vorher im Fehlerbanner, wenn eine Bibliothek ein nacktes
     * Objekt geworfen hat.
     */
    it('zeigt statt "[object Object]" den Rueckfalltext', () => {
        expect(toErrorMessage({ status: 500 }, 'Standard')).toBe('Standard');
    });

    it('behaelt aussagekraeftige Nicht-Objekte', () => {
        expect(toErrorMessage(404)).toBe('404');
    });

    it('hat einen Rueckfalltext, ohne dass der Aufrufer einen angibt', () => {
        expect(toErrorMessage(undefined)).toBe('Unbekannter Fehler');
    });
});

describe('isAbortError', () => {
    it('erkennt den Abbruch eines AbortController', () => {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        expect(isAbortError(err)).toBe(true);
    });

    /**
     * Je nach Umgebung kommt eine DOMException statt eines Error. Geprueft wird
     * deshalb der `name`, nicht der Typ.
     */
    it('erkennt den Abbruch auch ohne Error-Ableitung', () => {
        expect(isAbortError({ name: 'AbortError' })).toBe(true);
    });

    it('haelt einen echten Fehlschlag auseinander', () => {
        expect(isAbortError(new Error('Netzwerk weg'))).toBe(false);
        expect(isAbortError(null)).toBe(false);
        expect(isAbortError('AbortError')).toBe(false);
    });
});

describe('isRateLimitError', () => {
    it.each([
        ['HTTP-Status', 'Request failed with status 429'],
        ['englischer Klartext', 'You have exceeded your rate limit'],
        ['deutscher Klartext', 'Der Dienst ist derzeit überlastet'],
        ['Grossschreibung', 'RATE LIMIT exceeded']
    ])('erkennt Ueberlastung am %s', (_name, message) => {
        expect(isRateLimitError(new Error(message))).toBe(true);
    });

    /**
     * Der Unterschied ist fuer den Lehrer wesentlich: bei Ueberlastung hilft
     * Warten, bei einem Konfigurationsfehler nicht.
     */
    it('meldet keinen Rueckfall bei anderen Fehlern', () => {
        expect(isRateLimitError(new Error('API-Key fehlt'))).toBe(false);
        expect(isRateLimitError(new Error('Status 500'))).toBe(false);
        expect(isRateLimitError(undefined)).toBe(false);
    });
});

describe('toErrorCode', () => {
    it('liest den Prisma-Code fuer verletzte Eindeutigkeit', () => {
        expect(toErrorCode({ code: 'P2002' })).toBe('P2002');
    });

    it('liest den Logto-Code fuer die abgelaufene Sitzung', () => {
        expect(toErrorCode({ code: 'sign_in_session.not_found' })).toBe('sign_in_session.not_found');
    });

    it('liefert undefined, wo kein Code steht', () => {
        expect(toErrorCode(new Error('Kaputt'))).toBeUndefined();
        expect(toErrorCode(null)).toBeUndefined();
        // Ein nicht-textlicher Code wuerde beim Vergleich mit 'P2002' ohnehin
        // scheitern — hier faellt er sichtbar aus, statt still zu vergleichen.
        expect(toErrorCode({ code: 42 })).toBeUndefined();
    });
});
