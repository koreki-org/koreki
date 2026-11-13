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
 * Was zaehlt zur Abgabe?
 * - VORLAGEN: Eine Datei, die bei ALLEN Pruefligen inhaltsgleich vorkommt, hat
 *   niemand selbst geschrieben — es sind die bereitgestellten Dateien. Sie fallen
 *   weg. Erst ab zwei Pruefligen erkennbar; bei einem bleibt alles drin.
 * - Lesbar sind PDF, Bilder, Text und Quelltext. Alles andere (Word, Excel, ODS …)
 *   faellt weg und wird genannt.
 */
import JSZip from 'jszip';
import { istBildDatei, istCodeDatei, istPdfDatei, istTextDatei, istZipDatei } from './upload-dateiarten';
import { buendleAbgabe } from './abgabe-buendeln';

/** Eine Abgabe: der Name des Ordners oder ZIPs und die lesbaren Dateien, sortiert nach Pfad. */
export interface ZipAbgabe {
    name: string;
    dateien: File[];
}

export interface ZipBefund {
    abgaben: ZipAbgabe[];
    /** Bei allen Pruefligen inhaltsgleich — weggelassen (Pfad beim ersten Pruefling). */
    vorlagen: string[];
    /** „Pruefling: Datei" — Dateiart nicht lesbar, weggelassen. */
    ausgelassen: string[];
    /** Prueflinge ohne eine einzige lesbare Datei. */
    ohneAbgabe: string[];
    /** Dateien, die keinem Pruefling gehoeren (oberste Ebene des ZIPs). */
    ausserhalb: string[];
    /** Pruefling stand zweimal im ZIP (z. B. als Ordner und als ZIP) — der erste gilt. */
    doppelt: string[];
}

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
async function zerlegeSammelZip(eintraege: Eintrag[], zipName: string, befund: ZipBefund): Promise<Map<string, Eintrag[]>> {
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

/** Vorlagen erkennen: inhaltsgleich bei allen Pruefligen. */
function entferneVorlagen(prueflinge: Map<string, Eintrag[]>, befund: ZipBefund): void {
    if (prueflinge.size < 2) return;
    const zaehler = new Map<string, number>();
    prueflinge.forEach(eintraege => {
        Array.from(new Set(eintraege.map(e => inhaltsschluessel(e.daten))))
            .forEach(s => zaehler.set(s, (zaehler.get(s) ?? 0) + 1));
    });
    const vorlage = (e: Eintrag) => zaehler.get(inhaltsschluessel(e.daten)) === prueflinge.size;
    const erster = Array.from(prueflinge.values())[0];
    befund.vorlagen.push(...erster.filter(vorlage).sort(nachPfad).map(e => e.pfad));
    prueflinge.forEach((eintraege, name) => prueflinge.set(name, eintraege.filter(e => !vorlage(e))));
}

/**
 * Liest ZIP-Dateien als Schuelerabgaben. Ein ZIP = Sammlung mit einem Ordner je
 * Pruefling; mehrere ZIPs = ein Pruefling je ZIP.
 */
export async function leseZipAbgaben(zips: File[]): Promise<ZipBefund> {
    const befund: ZipBefund = { abgaben: [], vorlagen: [], ausgelassen: [], ohneAbgabe: [], ausserhalb: [], doppelt: [] };

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

    entferneVorlagen(prueflinge, befund);

    for (const [name, eintraege] of Array.from(prueflinge.entries())) {
        const lesbar = eintraege.filter(e => istLesbar(e.pfad)).sort(nachPfad);
        befund.ausgelassen.push(...eintraege.filter(e => !istLesbar(e.pfad)).map(e => `${name}: ${dateiname(e.pfad)}`));
        if (lesbar.length === 0) {
            befund.ohneAbgabe.push(name);
            continue;
        }
        befund.abgaben.push({
            name,
            dateien: lesbar.map(e => new File([new Uint8Array(e.daten)], dateiname(e.pfad), { type: mimeTyp(e.pfad) }))
        });
    }
    befund.abgaben.sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
    return befund;
}

/** Eine gebuendelte Abgabe, bereit als Arbeit im Stapel. */
export interface ZipArbeit {
    name: string;
    datei: File;
    textBeilagen?: string;
}

/** Hoechstens so viele Namen je Liste in der Meldung — der Rest als Zahl. */
const LISTE_MAX = 8;

const liste = (titel: string, eintraege: string[]): string => {
    if (eintraege.length === 0) return '';
    const sichtbar = eintraege.slice(0, LISTE_MAX).join(', ');
    const rest = eintraege.length > LISTE_MAX ? ` und ${eintraege.length - LISTE_MAX} weitere` : '';
    return `\n\n${titel} (${eintraege.length}): ${sichtbar}${rest}`;
};

/**
 * Liest die ZIPs, buendelt jede Abgabe zu einer Datei und sagt, was dabei
 * weggefallen ist. Die Meldung ist Pflicht, nicht Beiwerk: Wer eine Abgabe
 * vermisst, muss sehen, warum.
 */
export async function leseZipArbeiten(zips: File[]): Promise<{ arbeiten: ZipArbeit[]; meldung: string }> {
    const befund = await leseZipAbgaben(zips);
    const arbeiten: ZipArbeit[] = [];
    const nichtZuOeffnen: string[] = [];

    for (const abgabe of befund.abgaben) {
        const buendel = await buendleAbgabe(abgabe.name, abgabe.dateien);
        nichtZuOeffnen.push(...(buendel?.unlesbar ?? []).map(d => `${abgabe.name}: ${d}`));
        if (buendel) arbeiten.push({ name: abgabe.name, datei: buendel.datei, textBeilagen: buendel.textBeilagen });
        else befund.ohneAbgabe.push(abgabe.name);
    }

    const quelle = zips.length === 1 ? `„${zips[0].name}"` : `${zips.length} ZIP-Dateien`;
    const meldung = `${quelle}: ${arbeiten.length} Prüfling(e) übernommen — die Dateien jedes Prüflings sind zu einer Arbeit zusammengefasst.`
        + liste('Weggelassen, weil bei allen Prüflingen gleich (bereitgestellte Dateien)', befund.vorlagen)
        + liste('Weggelassen, weil Koreki das Format nicht lesen kann', befund.ausgelassen)
        + liste('Ließ sich nicht öffnen', nichtZuOeffnen)
        + liste('Ohne lesbare Abgabe, nicht übernommen', befund.ohneAbgabe)
        + liste('Doppelt im ZIP, nur einmal übernommen', befund.doppelt)
        + liste('Liegt in keinem Prüflingsordner, nicht übernommen', befund.ausserhalb);
    return { arbeiten, meldung };
}
