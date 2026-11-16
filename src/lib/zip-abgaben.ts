/**
 * Schuelerabgaben aus ZIP-Dateien lesen — ein Ordner (oder ein inneres ZIP) je Pruefling.
 * 🗂️
 *
 * ANLASS (13.11.2026). Die IHK-Zwischenpruefung „Einrichten eines IT-gestuetzten
 * Arbeitsplatzes" gibt je Pruefling einen Ordner ab: mehrere PDFs (eins je Aufgabe),
 * dazu die Vorlagen, mit denen gearbeitet wurde, und Dateien anderer Formate.
 * Koreki nahm bis dahin eine Datei als einen Pruefling — aus einer Abgabe wurden
 * sieben „Schueler".
 *
 * Wer gilt als Pruefling?
 * - Mehrere ZIPs auf einmal: jedes ZIP ist ein Pruefling (so liefern viele
 *   Pruefungsumgebungen die Abgaben aus).
 * - Ein ZIP: jeder Ordner und jedes innere ZIP auf oberster Ebene ist ein
 *   Pruefling. Ein einzelner umschliessender Ordner („Winter 2026/") wird
 *   uebersprungen. Liegt darin nur EIN Ordner, ist das ZIP selbst ein Pruefling.
 *
 * Was zaehlt zur Abgabe? Das entscheidet die Lehrkraft im Fenster „Abgaben
 * pruefen" (15.11.2026; vorher eine lange Meldung, die sich selbst schloss).
 * Vorgeschlagen ist:
 * - VORLAGEN abgewaehlt: Eine Datei, die bei ALLEN Pruefligen inhaltsgleich
 *   vorkommt, hat niemand selbst geschrieben — es sind die bereitgestellten
 *   Dateien. Erst ab zwei Pruefligen erkennbar.
 * - Lesbar sind PDF, Bilder, Text und Quelltext. Alles andere (Word, Excel, ODS …)
 *   ist nicht waehlbar.
 */
import JSZip from 'jszip';
import { istBildDatei, istCodeDatei, istPdfDatei, istTextDatei, istZipDatei } from './upload-dateiarten';
import { buendleAbgabe } from './abgabe-buendeln';
import { neueArbeit } from './logic';
import type { BatchFile } from '../types';

/** Was eine Datei in einer Abgabe ist — daraus folgt, ob sie anfangs angehakt ist. */
export type ZipDateiArt = 'abgabe' | 'vorlage' | 'unlesbar';

export interface ZipDatei {
    /** Pfad innerhalb des Prueflings. */
    pfad: string;
    art: ZipDateiArt;
    datei: File;
}

export interface ZipPruefling {
    name: string;
    /** Alle Dateien, sortiert nach Pfad — auch Vorlagen und Unlesbares, damit man sie sieht. */
    dateien: ZipDatei[];
}

export interface ZipBefund {
    /** Wie die Quelle heisst: „Abgaben.zip" oder „3 ZIP-Dateien". */
    quelle: string;
    prueflinge: ZipPruefling[];
    /** Dateien, die keinem Pruefling gehoeren (oberste Ebene des ZIPs). */
    ausserhalb: string[];
    /** Pruefling stand zweimal im ZIP (z. B. als Ordner und als ZIP) — der erste gilt. */
    doppelt: string[];
}

/** Je Pruefling die Pfade, die uebernommen werden. */
export type ZipAuswahl = Record<string, string[]>;

interface Eintrag {
    /** Pfad innerhalb des Prueflings. */
    pfad: string;
    daten: Uint8Array;
}

/** Was Betriebssysteme beim Packen mit hineinlegen. */
const BEIWERK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)/i;

const dateiname = (pfad: string): string => pfad.split('/').pop() ?? pfad;
const ohneZip = (name: string): string => name.replace(/\.zip$/i, '');
const nachPfad = (a: { pfad: string }, b: { pfad: string }) =>
    a.pfad.localeCompare(b.pfad, 'de', { numeric: true });

async function leseEintraege(daten: ArrayBuffer | Uint8Array): Promise<Eintrag[]> {
    const zip = await JSZip.loadAsync(daten);
    const eintraege: Eintrag[] = [];
    for (const datei of Object.values(zip.files)) {
        if (datei.dir || BEIWERK.test(datei.name)) continue;
        eintraege.push({ pfad: datei.name, daten: await datei.async('uint8array') });
    }
    return eintraege;
}

/** Inhaltsschluessel: Groesse und FNV-1a. Gleich heisst hier: Byte fuer Byte dieselbe Datei. */
function inhaltsschluessel(daten: Uint8Array): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < daten.length; i++) {
        h ^= daten[i];
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return `${daten.length}:${h.toString(16)}`;
}

function mimeTyp(name: string): string {
    const klein = name.toLowerCase();
    if (klein.endsWith('.pdf')) return 'application/pdf';
    if (klein.endsWith('.png')) return 'image/png';
    if (klein.endsWith('.jpg') || klein.endsWith('.jpeg')) return 'image/jpeg';
    // Nur Text und Quelltext sind Text. Alles andere bekaeme sonst `text/plain` und
    // gaelte als lesbar — eine .ods kaeme als Zeichensalat bei der KI an.
    const textEndung = /\.(txt|md)$/.test(klein) || istCodeDatei({ name, type: '' });
    return textEndung ? 'text/plain' : 'application/octet-stream';
}

const istLesbar = (name: string): boolean => {
    const kennung = { name, type: mimeTyp(name) };
    return istPdfDatei(kennung) || istBildDatei(kennung) || istTextDatei(kennung) || istCodeDatei(kennung);
};

/** Ein ZIP aus mehreren Pruefligen in Prueflinge zerlegen. */
async function zerlegeSammelZip(eintraege: Eintrag[], zipName: string, befund: Pick<ZipBefund, 'ausserhalb' | 'doppelt'>): Promise<Map<string, Eintrag[]>> {
    let liste = eintraege;
    const oberste = new Set(liste.map(e => e.pfad.split('/')[0]));
    let huelle: string | undefined;
    if (oberste.size === 1 && liste.every(e => e.pfad.includes('/'))) {
        huelle = Array.from(oberste)[0];
        liste = liste.map(e => ({ ...e, pfad: e.pfad.slice(huelle!.length + 1) }));
    }

    const prueflinge = new Map<string, Eintrag[]>();
    const nimm = (name: string, neu: Eintrag[]) => {
        const schluessel = name.trim().toLowerCase();
        const vorhanden = Array.from(prueflinge.keys()).find(k => k.trim().toLowerCase() === schluessel);
        if (vorhanden) befund.doppelt.push(name);
        else prueflinge.set(name, neu);
    };

    const ordner = new Map<string, Eintrag[]>();
    for (const e of liste) {
        const [erster, ...rest] = e.pfad.split('/');
        if (rest.length > 0) {
            ordner.set(erster, [...(ordner.get(erster) ?? []), { ...e, pfad: rest.join('/') }]);
        } else if (istZipDatei({ name: erster, type: '' })) {
            nimm(ohneZip(erster), await leseEintraege(e.daten));
        } else {
            befund.ausserhalb.push(e.pfad);
        }
    }

    // Nur ein Ordner in der Huelle und nichts daneben: Das ZIP ist EIN Pruefling.
    // Ohne Huelle gibt es diesen Fall nicht: Laege alles in einem Ordner, waere er die Huelle.
    if (huelle && ordner.size === 1 && prueflinge.size === 0 && befund.ausserhalb.length === 0) {
        return new Map([[huelle || ohneZip(zipName), liste]]);
    }
    ordner.forEach((inhalt, name) => nimm(name, inhalt));
    return prueflinge;
}

/** Inhaltsschluessel, die bei ALLEN Pruefligen vorkommen — die bereitgestellten Dateien. */
function vorlagenSchluessel(prueflinge: Map<string, Eintrag[]>): Set<string> {
    if (prueflinge.size < 2) return new Set();
    const zaehler = new Map<string, number>();
    prueflinge.forEach(eintraege => {
        Array.from(new Set(eintraege.map(e => inhaltsschluessel(e.daten))))
            .forEach(s => zaehler.set(s, (zaehler.get(s) ?? 0) + 1));
    });
    return new Set(Array.from(zaehler.entries()).filter(([, n]) => n === prueflinge.size).map(([s]) => s));
}

/**
 * Liest ZIP-Dateien als Schuelerabgaben — noch ohne etwas wegzulassen. Was
 * uebernommen wird, entscheidet die Lehrkraft im Fenster „Abgaben pruefen"
 * (`zip-pruefung.ts`); `standardAuswahl` ist der Vorschlag.
 */
export async function leseZipAbgaben(zips: File[]): Promise<ZipBefund> {
    const quelle = zips.length === 1 ? zips[0].name : `${zips.length} ZIP-Dateien`;
    const befund: ZipBefund = { quelle, prueflinge: [], ausserhalb: [], doppelt: [] };

    let prueflinge = new Map<string, Eintrag[]>();
    if (zips.length === 1) {
        prueflinge = await zerlegeSammelZip(await leseEintraege(await zips[0].arrayBuffer()), zips[0].name, befund);
    } else {
        for (const zip of zips) {
            const name = ohneZip(zip.name);
            if (prueflinge.has(name)) befund.doppelt.push(name);
            else prueflinge.set(name, await leseEintraege(await zip.arrayBuffer()));
        }
    }

    const vorlagen = vorlagenSchluessel(prueflinge);
    const art = (e: Eintrag): ZipDateiArt =>
        !istLesbar(e.pfad) ? 'unlesbar' : vorlagen.has(inhaltsschluessel(e.daten)) ? 'vorlage' : 'abgabe';

    prueflinge.forEach((eintraege, name) => befund.prueflinge.push({
        name,
        dateien: eintraege.slice().sort(nachPfad).map(e => ({
            pfad: e.pfad,
            art: art(e),
            datei: new File([new Uint8Array(e.daten)], dateiname(e.pfad), { type: mimeTyp(e.pfad) })
        }))
    }));
    befund.prueflinge.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
    return befund;
}

/** Der Vorschlag: angehakt ist, was nach eigener Abgabe aussieht. */
export function standardAuswahl(befund: ZipBefund): ZipAuswahl {
    return Object.fromEntries(befund.prueflinge.map(p =>
        [p.name, p.dateien.filter(d => d.art === 'abgabe').map(d => d.pfad)]));
}

/** Eine gebuendelte Abgabe, bereit als Arbeit im Stapel. */
export interface ZipArbeit {
    name: string;
    datei: File;
    textBeilagen?: string;
}

/**
 * Buendelt je Pruefling die ausgewaehlten Dateien zu einer Arbeit. Prueflinge
 * ohne Auswahl fallen weg; was sich nicht oeffnen liess, steht in `nichtZuOeffnen`.
 */
export async function buendleAuswahl(befund: ZipBefund, auswahl: ZipAuswahl): Promise<{ arbeiten: ZipArbeit[]; nichtZuOeffnen: string[] }> {
    const arbeiten: ZipArbeit[] = [];
    const nichtZuOeffnen: string[] = [];
    for (const p of befund.prueflinge) {
        const gewaehlt = new Set(auswahl[p.name] ?? []);
        // Unlesbares nie — auch wenn es jemand in die Auswahl schreibt.
        const dateien = p.dateien.filter(d => gewaehlt.has(d.pfad) && d.art !== 'unlesbar').map(d => d.datei);
        if (dateien.length === 0) continue;
        const buendel = await buendleAbgabe(p.name, dateien);
        nichtZuOeffnen.push(...(buendel?.unlesbar ?? []).map(d => `${p.name}: ${d}`));
        if (buendel) arbeiten.push({ name: p.name, datei: buendel.datei, textBeilagen: buendel.textBeilagen });
    }
    return { arbeiten, nichtZuOeffnen };
}

/**
 * Eine gebuendelte Abgabe als Arbeit im Stapel — immer als Scan, ohne Rueckfrage.
 *
 * Die Frage „Digitaler Text oder Scan?" ergibt hier keinen Sinn (15.11.2026):
 * Text und Quelltext gehen ohnehin woertlich mit (`textBeilagen`), es geht nur
 * um das zusammengefuegte PDF. Und dort verlöre „Digital" still jede Seite ohne
 * Textebene — Fotos, Screenshots, Scans — und wuerfelte Tabellen durcheinander.
 * Umstellen laesst es sich wie jede Arbeit am Abzeichen.
 */
export function alsZipArbeit(arbeit: ZipArbeit): BatchFile {
    return { ...neueArbeit(arbeit.datei, 0, arbeit.name, arbeit.textBeilagen), documentType: 'scanned', estimatedCredits: 2 };
}
