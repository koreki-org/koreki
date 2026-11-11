import { markdownZuDocx } from './markdown-zu-docx';

/**
 * Die Word-Fassung der Datenschutz-Unterlagen für Schulen.
 *
 * Quelle ist allein `docs/user-guides/datenschutz-paket-schulen.md`. Die Word-
 * Datei unter `public/downloads/` wird mit `npm run docs:datenschutz-word`
 * daraus erzeugt; `tests/unit/datenschutz-word-aktuell.test.ts` schlägt fehl,
 * sobald beide auseinanderlaufen.
 */

export { DATENSCHUTZ_QUELLE, DATENSCHUTZ_WORD, DATENSCHUTZ_WORD_URL } from './datenschutz-pfade';

/** Der Abschnitt ab hier ist für die Pflege im Repo, nicht für Schulen. */
const NUR_FUER_DIE_PFLEGE = /^## Quellen\b/m;

export function datenschutzFuerWord(md: string): { inhalt: string; titel: string; datum: string } {
    const text = md.replace(/\r\n/g, '\n');
    const kopf = /^---\n([\s\S]*?)\n---\n/.exec(text);
    const feld = (name: string) => kopf ? new RegExp(`^${name}:\\s*"?([^"\\n]*)"?`, 'm').exec(kopf[1])?.[1] : undefined;

    let inhalt = kopf ? text.slice(kopf[0].length) : text;
    const schnitt = NUR_FUER_DIE_PFLEGE.exec(inhalt);
    if (schnitt) inhalt = inhalt.slice(0, schnitt.index);

    return {
        inhalt: inhalt.trim() + '\n',
        titel: feld('title') ?? 'Datenschutz für Schulen',
        datum: feld('last_updated') ?? feld('date') ?? '2026-01-01',
    };
}

export async function erzeugeDatenschutzWord(md: string): Promise<Uint8Array> {
    const { inhalt, titel, datum } = datenschutzFuerWord(md);
    return markdownZuDocx(inhalt, { titel, datum });
}
