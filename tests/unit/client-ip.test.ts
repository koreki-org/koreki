import type { NextApiRequest } from 'next';

// `security.ts` zieht beim Laden die Logto-Konfiguration mit, die im Test
// nicht aufloest. Geprueft wird hier eine reine Funktion ohne jede
// Abhaengigkeit — deshalb reicht es, den Ladeweg freizuraeumen.
jest.mock('../../src/lib/logto', () => ({ logtoClient: {}, logtoConfig: {} }));
jest.mock('../../src/lib/prisma', () => ({ __esModule: true, default: {} }));

import { getClientIp } from '../../src/lib/security';

/**
 * Die IP des Aufrufers ist nicht frei wählbar (Layer 1)
 * 🌐🛡️
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. `getClientIp` las das LINKESTE Glied von
 * `X-Forwarded-For` — genau das, welches der Aufrufer selbst mitschicken kann.
 * Ein Reverse Proxy hängt seine Beobachtung hinten an, statt die Kette zu
 * ersetzen. Wer also selbst `X-Forwarded-For: 1.2.3.4` setzt, bekommt die
 * Kette `1.2.3.4, <echte IP>` — und gelesen wurde die frei erfundene.
 *
 * Zwei Dinge hängen daran:
 *
 *   - Die Flut-Sperre VOR der Authentifizierung. Mit wechselnden
 *     Fantasie-Werten zählt jede Anfrage auf ein eigenes Konto; die erste
 *     Verteidigungslinie zählt dann nichts mehr. Für anonyme Anfragen ist die
 *     IP zudem die Zähleinheit des eigentlichen Limits.
 *   - Das Feld `ip` im PrivacyLog, unter anderem am AVV-Zustimmungs-Eintrag.
 *     Eine frei gewählte IP in einem Nachweis, auf den sich im Ernstfall
 *     jemand beruft, ist schlimmer als gar keine.
 *
 * Richtig ist das RECHTE Glied: Das hat unser eigener Proxy angehängt.
 */

const anfrage = (headers: Record<string, string | string[]>, socketIp = '10.0.0.9'): NextApiRequest =>
    ({ headers, socket: { remoteAddress: socketIp } }) as unknown as NextApiRequest;

describe('getClientIp', () => {
    /** DER BEFUND. */
    it('nimmt nicht die vom Aufrufer erfundene IP', () => {
        const ip = getClientIp(anfrage({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }));

        expect(ip).toBe('203.0.113.7');
        expect(ip).not.toBe('1.2.3.4');
    });

    /** Mehrere Fantasie-Glieder aendern daran nichts. */
    it('haelt auch bei einer langen erfundenen Kette', () => {
        const ip = getClientIp(anfrage({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 203.0.113.7' }));

        expect(ip).toBe('203.0.113.7');
    });

    /**
     * Ersetzt der Proxy die Kette, statt sie zu erweitern, steht nur ein Wert
     * darin — dann sind linkes und rechtes Glied dasselbe. Der uebliche Fall
     * verhaelt sich also unveraendert.
     */
    it('liefert bei einem einzelnen Eintrag denselben Wert wie zuvor', () => {
        expect(getClientIp(anfrage({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7');
    });

    it('raeumt Leerzeichen weg', () => {
        expect(getClientIp(anfrage({ 'x-forwarded-for': '1.2.3.4 ,  203.0.113.7  ' }))).toBe('203.0.113.7');
    });

    /** Mehrfach gesetzter Header: Node reicht ihn als Feld durch. */
    it('behandelt einen mehrfach gesetzten Header gleich', () => {
        expect(getClientIp(anfrage({ 'x-forwarded-for': ['1.2.3.4', '203.0.113.7'] }))).toBe('203.0.113.7');
    });

    it('faellt ohne Header auf die Verbindung zurueck', () => {
        expect(getClientIp(anfrage({}))).toBe('10.0.0.9');
    });

    /** Ein leerer oder unsinniger Header darf keinen leeren Schluessel liefern. */
    it('liefert nie eine leere Zeichenkette', () => {
        expect(getClientIp(anfrage({ 'x-forwarded-for': '' }))).toBe('0.0.0.0');
        expect(getClientIp(anfrage({ 'x-forwarded-for': ' , , ' }))).toBe('0.0.0.0');
    });
});
