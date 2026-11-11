/**
 * Wo die Datenschutz-Unterlagen für Schulen liegen. Eigene Datei, damit die
 * Webseite den Download-Pfad kennt, ohne den Word-Erzeuger (und JSZip) in ihr
 * Bündel zu ziehen.
 */
export const DATENSCHUTZ_QUELLE = 'docs/user-guides/datenschutz-paket-schulen.md';
export const DATENSCHUTZ_WORD = 'public/downloads/koreki-datenschutz-schulen.docx';
/** Öffentlicher Pfad der Word-Datei auf der Webseite. */
export const DATENSCHUTZ_WORD_URL = '/downloads/koreki-datenschutz-schulen.docx';
