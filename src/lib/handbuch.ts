import { openExternal } from './os-utils';

/**
 * Verweise aus der App ins Handbuch unter https://hilfe.koreki.org.
 *
 * Das Handbuch liegt im selben Repository (`handbuch/`). Jede Stelle unten
 * zeigt auf eine Seite und, wo nötig, auf eine feste Sprungmarke
 * (`## Überschrift {#marke}`) — nie auf eine aus dem Überschriftentext
 * erzeugte. Sonst bricht der Link still, sobald jemand eine Überschrift
 * umformuliert. Dass jede Seite und jede Marke existiert, prüft
 * `tests/unit/handbuch-links.test.ts`.
 */
export const HANDBUCH_URL = 'https://hilfe.koreki.org';

export const HANDBUCH_STELLEN = {
    start: '/',
    musterloesung: '/korrigieren/ablauf#musterloesung',
    schuelerarbeiten: '/korrigieren/ablauf#schuelerarbeiten',
    korrigieren: '/korrigieren/ablauf#korrigieren',
    pruefen: '/korrigieren/vorschlaege-pruefen',
    namen: '/datenschutz/namen',
} as const;

export type HandbuchStelle = keyof typeof HANDBUCH_STELLEN;

/** Wohin „Problem melden“ führt: ein neues Ticket auf GitHub. */
export const PROBLEM_MELDEN_URL = 'https://github.com/koreki-org/koreki/issues/new';

export function handbuchAdresse(stelle: HandbuchStelle): string {
    return HANDBUCH_URL + HANDBUCH_STELLEN[stelle];
}

/**
 * Öffnet das Handbuch im Browser des Systems, nie im Koreki-Fenster.
 *
 * Schülerdaten leben nur im Arbeitsspeicher (`architectural-vision` §2) — ein
 * Seitenwechsel im Fenster der Desktop-App würde die laufende Korrektur
 * verwerfen. `openExternal` reicht die Adresse dort an den System-Browser
 * weiter und öffnet im Browser einen neuen Tab.
 */
export function oeffneHandbuch(stelle: HandbuchStelle = 'start'): Promise<void> {
    return openExternal(handbuchAdresse(stelle));
}
