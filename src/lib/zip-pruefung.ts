/**
 * „Abgaben pruefen" — die Lehrkraft entscheidet, was aus einem ZIP uebernommen wird.
 * 🗂️
 *
 * ANLASS (15.11.2026). Bis dahin nahm Koreki nach eigenen Regeln und schrieb das
 * Weggelassene in eine lange Meldung, die sich nach acht Sekunden selbst schloss.
 * Andreas: „pro Schüler übersichtlicher … ggfs. sogar abwählbar". Das Fenster
 * loest zugleich zwei Schwaechen der Automatik: Ordner einer ANDEREN Pruefung im
 * selben Abgabeordner und Vorlagen bei nur einem Pruefling (da fehlt der Vergleich).
 *
 * Aufbau wie `confirm-dialog.ts`: Der Upload wartet auf ein Versprechen, ein einmal
 * eingehaengtes Fenster (`ZipPruefHost`) beantwortet es. So wartet der Upload an
 * genau dieser Stelle — eine Typ-Abfrage fuer einzelne PDFs im selben Upload kommt
 * erst danach, die Fenster stapeln sich nicht (`koreki-design-system` §1.2).
 */
import { create } from 'zustand';
import { buendleAuswahl, leseZipAbgaben, standardAuswahl } from './zip-abgaben';
import type { ZipArbeit, ZipAuswahl, ZipBefund, ZipDatei, ZipPruefling } from './zip-abgaben';
import { meldeErfolg, meldeHinweis } from './notify';

interface ZipPruefStore {
    befund: ZipBefund | null;
    antwort: ((auswahl: ZipAuswahl | null) => void) | null;
    frage: (befund: ZipBefund) => Promise<ZipAuswahl | null>;
    beantworte: (auswahl: ZipAuswahl | null) => void;
}

export const useZipPruefStore = create<ZipPruefStore>((set, get) => ({
    befund: null,
    antwort: null,
    // Eine offene Pruefung wird abgebrochen, nicht verdraengt — sonst wartete ihr Upload ewig.
    frage: (befund) => new Promise((resolve) => {
        get().antwort?.(null);
        set({ befund, antwort: resolve });
    }),
    beantworte: (auswahl) => {
        get().antwort?.(auswahl);
        set({ befund: null, antwort: null });
    }
}));

/** Zeigt das Fenster und wartet; `null` heisst abgebrochen. */
export const pruefeZipAbgaben = (befund: ZipBefund): Promise<ZipAuswahl | null> =>
    useZipPruefStore.getState().frage(befund);

// ─── Fuer das Fenster: Ordner und Haken ─────────────────────────────────────

const ordnerVon = (pfad: string): string => pfad.includes('/') ? pfad.slice(0, pfad.lastIndexOf('/')) : '';

export interface OrdnerGruppe {
    /** Voller Ordnerpfad im Pruefling — Schluessel fuer den Ordner-Haken. */
    ordner: string;
    /** Ohne den Teil, den alle Ordner dieses Prueflings gemeinsam haben. */
    anzeige: string;
    dateien: ZipDatei[];
}

/** Die Dateien eines Prueflings nach Ordner, gemeinsamer Anfang (`transfer/sca/`) weggekuerzt. */
export function ordnerGruppen(p: ZipPruefling): OrdnerGruppe[] {
    const gruppen = new Map<string, ZipDatei[]>();
    p.dateien.forEach(d => gruppen.set(ordnerVon(d.pfad), [...(gruppen.get(ordnerVon(d.pfad)) ?? []), d]));
    const namen = Array.from(gruppen.keys());
    const teile = namen.map(n => n.split('/').filter(Boolean));
    let gemeinsam = 0;
    while (namen.length > 1 && teile.every(t => t.length > gemeinsam && t[gemeinsam] === teile[0][gemeinsam])) gemeinsam++;
    return namen.map((ordner, i) => ({
        ordner,
        anzeige: teile[i].slice(gemeinsam).join('/') || ordner || 'Hauptordner',
        dateien: gruppen.get(ordner)!
    }));
}

const istWaehlbar = (d: ZipDatei): boolean => d.art !== 'unlesbar';

/** Eine Datei eines Prueflings an- oder abwaehlen. */
export function setzeDatei(auswahl: ZipAuswahl, name: string, pfad: string, an: boolean): ZipAuswahl {
    const rest = (auswahl[name] ?? []).filter(x => x !== pfad);
    return { ...auswahl, [name]: an ? [...rest, pfad] : rest };
}

/**
 * Einen Ordner an- oder abwaehlen — bei ALLEN Pruefligen, die ihn haben. Die
 * Abgaben einer Klasse sind gleich aufgebaut; einen fremden Ordner 25-mal
 * abzuwaehlen waere die Arbeit, die das Fenster ersparen soll.
 */
export function setzeOrdner(befund: ZipBefund, auswahl: ZipAuswahl, ordner: string, an: boolean): ZipAuswahl {
    const neu = { ...auswahl };
    befund.prueflinge.forEach(p => {
        const betroffen = p.dateien.filter(d => istWaehlbar(d) && ordnerVon(d.pfad) === ordner).map(d => d.pfad);
        if (betroffen.length === 0) return;
        const rest = (neu[p.name] ?? []).filter(x => !betroffen.includes(x));
        neu[p.name] = an ? [...rest, ...betroffen] : rest;
    });
    return neu;
}

/** Stand eines Ordner-Hakens: alle, keine oder ein Teil der waehlbaren Dateien angehakt. */
export function ordnerStand(gruppe: OrdnerGruppe, gewaehlt: string[]): 'alle' | 'keine' | 'teil' {
    const waehlbar = gruppe.dateien.filter(istWaehlbar);
    const an = waehlbar.filter(d => gewaehlt.includes(d.pfad)).length;
    return an === 0 ? 'keine' : an === waehlbar.length ? 'alle' : 'teil';
}

/** Wie viele Prueflinge mindestens eine Datei behalten. */
export const zahlUebernommen = (auswahl: ZipAuswahl): number =>
    Object.values(auswahl).filter(pfade => pfade.length > 0).length;

// ─── Der ganze Weg fuer den Upload ──────────────────────────────────────────

/**
 * Liest die ZIPs, laesst pruefen und buendelt. `undefined`, wenn abgebrochen.
 * Gemeldet wird nur, was die Lehrkraft nicht schon im Fenster gesehen hat.
 */
export async function uebernimmZip(zips: File[]): Promise<ZipArbeit[] | undefined> {
    const befund = await leseZipAbgaben(zips);
    const auswahl = await pruefeZipAbgaben(befund);
    if (!auswahl) return undefined;
    const { arbeiten, nichtZuOeffnen } = await buendleAuswahl(befund, auswahl);
    if (nichtZuOeffnen.length > 0) {
        meldeHinweis(`${arbeiten.length} Prüfling(e) übernommen. Diese Dateien ließen sich nicht öffnen und fehlen:\n\n${nichtZuOeffnen.join('\n')}`, { bleibt: true });
    } else {
        meldeErfolg(`${arbeiten.length} Prüfling(e) übernommen.`);
    }
    return arbeiten;
}
