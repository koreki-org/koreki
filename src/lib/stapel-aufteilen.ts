/**
 * Ein Sammel-PDF (der ganze Stapel in einem Scan) in einzelne Arbeiten teilen.
 *
 * Zwei getrennte Schritte, beide ohne KI:
 * 1. Schneiden: Wo beginnt eine neue Arbeit? Gespeichert als Liste der
 *    Anfangsseiten. Die erste Seite ist immer ein Anfang.
 * 2. Benennen: Welcher Name gehoert zu welchem Stueck? Gespeichert je
 *    Anfangsseite, damit ein spaeterer Schnitt die uebrigen Namen nicht
 *    verschiebt.
 *
 * Bis zum 25.11.2026 hing beides an EINER Reihenfolge: Der Excel-Import verteilte
 * die Namen von oben nach unten auf die Seiten. Wer korrigieren wollte, musste
 * vorher den Papierstapel in die Reihenfolge der Klassenliste bringen. Jetzt
 * liegt der Stapel, wie er liegt, und die Namen werden am Bildschirm vergeben.
 *
 * Seitenzahlen sind die des Dokuments (1-basiert). Ist die aufzuteilende Arbeit
 * selbst schon ein Teil (`pageRange`), beginnt sie nicht bei 1.
 */

export interface Stueck {
    /** Erste Seite, zugleich der Schluessel fuer den Namen. */
    start: number;
    ende: number;
}

export interface SchuelerName {
    vorname: string;
    nachname: string;
}

/** Was `executeSplit` erwartet — in Seitenreihenfolge. */
export interface Aufteilung {
    firstName?: string;
    lastName?: string;
    pageCount: number;
}

const sortiertEindeutig = (zahlen: number[]): number[] =>
    Array.from(new Set(zahlen)).sort((a, b) => a - b);

/** Anfangsseiten in Stuecke uebersetzen. Ungueltige Anfaenge fallen still heraus. */
export function stueckeAus(anfaenge: number[], erste: number, letzte: number): Stueck[] {
    const gueltig = sortiertEindeutig([erste, ...anfaenge.filter(s => s >= erste && s <= letzte)]);
    return gueltig.map((start, i) => ({
        start,
        ende: i + 1 < gueltig.length ? gueltig[i + 1] - 1 : letzte
    }));
}

/** Jede Arbeit gleich lang. Geht es nicht auf, ist das letzte Stueck kuerzer. */
export function anfaengeJeSeitenzahl(erste: number, letzte: number, jeArbeit: number): number[] {
    const schritt = Math.max(1, Math.floor(jeArbeit));
    const anfaenge: number[] = [];
    for (let s = erste; s <= letzte; s += schritt) anfaenge.push(s);
    return anfaenge;
}

/**
 * Vorschlag aus der Klassenliste: Seiten durch Namen. Geht es nicht glatt auf,
 * wird gerundet — die Stellen, an denen es nicht passt, behebt Enter (der Rest
 * rueckt mit). `glatt` sagt, ob man der Teilung trauen kann.
 */
export function vorschlagJeArbeit(seiten: number, namen: number): { jeArbeit: number; glatt: boolean } | null {
    if (namen < 1 || seiten < 1) return null;
    return { jeArbeit: Math.max(1, Math.round(seiten / namen)), glatt: seiten % namen === 0 };
}

/** Hinter dem letzten Anfang weiter im gleichen Abstand schneiden, solange Seiten da sind. */
export function fuelleAuf(anfaenge: number[], letzte: number, jeArbeit: number | null): number[] {
    if (!jeArbeit || jeArbeit < 1) return anfaenge;
    const ergebnis = sortiertEindeutig(anfaenge);
    for (let s = ergebnis[ergebnis.length - 1] + jeArbeit; s <= letzte; s += jeArbeit) ergebnis.push(s);
    return ergebnis;
}

/**
 * „Hier beginnt eine Arbeit.“ Der NAECHSTE Anfang wandert auf diese Seite, alle
 * spaeteren ruecken um genauso viele Seiten mit.
 *
 * Anlass (25.11.2026): Mit „4 Seiten je Arbeit“ lagen nach EINER Arbeit mit drei
 * Seiten alle folgenden Schnitte eine Seite zu spaet — und jeder musste einzeln
 * umgesetzt werden. Die spaeteren Schnitte hat bis dahin niemand geprueft (man
 * blaettert von vorn nach hinten), sie sind nur aus dem Abstand abgeleitet. Darum
 * ruecken sie mit, statt stehen zu bleiben.
 *
 * Gibt es keinen spaeteren Anfang, wird einfach einer gesetzt. Mit bekanntem
 * Abstand wird das Ende danach wieder aufgefuellt; sonst waere die letzte Arbeit
 * nach einer Verschiebung nach vorn zu lang.
 */
export function setzeAnfang(
    anfaenge: number[], seite: number, erste: number, letzte: number, jeArbeit: number | null
): number[] {
    if (seite <= erste || seite > letzte || anfaenge.includes(seite)) return anfaenge;
    const naechster = sortiertEindeutig(anfaenge).find(s => s > seite);
    if (naechster === undefined) return fuelleAuf([...anfaenge, seite], letzte, jeArbeit);
    const versatz = seite - naechster;
    const verschoben = anfaenge
        .map(s => (s >= naechster ? s + versatz : s))
        .filter(s => s <= letzte);
    return fuelleAuf(sortiertEindeutig([erste, ...verschoben]), letzte, jeArbeit);
}

/**
 * „Hier beginnt keine Arbeit.“ Die Seite gehoert dann zur vorigen; spaetere
 * Anfaenge bleiben stehen. Die erste Seite ist immer ein Anfang.
 */
export function entferneAnfang(anfaenge: number[], seite: number, erste: number): number[] {
    if (seite === erste) return anfaenge;
    return anfaenge.filter(s => s !== seite);
}

/** Die Arbeit, zu der eine Seite gehoert (Index in `stuecke`). */
export function stueckIndex(stuecke: Stueck[], seite: number): number {
    const i = stuecke.findIndex(s => seite >= s.start && seite <= s.ende);
    return i < 0 ? 0 : i;
}

/** Anfang der naechsten Arbeit; auf der letzten bleibt man stehen. */
export function naechsteArbeit(stuecke: Stueck[], seite: number): number {
    const i = stueckIndex(stuecke, seite);
    return i + 1 < stuecke.length ? stuecke[i + 1].start : seite;
}

/** Steht man mitten in einer Arbeit, zuerst an ihren Anfang — sonst zur vorigen. */
export function vorigeArbeit(stuecke: Stueck[], seite: number): number {
    const i = stueckIndex(stuecke, seite);
    if (seite !== stuecke[i]?.start) return stuecke[i]?.start ?? seite;
    return i > 0 ? stuecke[i - 1].start : seite;
}

/** „Meier, Anna“ und „Anna Meier“ — dieselbe Regel fuer Excel-Spalte A und freie Eingabe. */
export function teileNamen(text: string): SchuelerName {
    const t = text.trim().replace(/\s+/g, ' ');
    if (t.includes(',')) {
        const [nachname, ...rest] = t.split(',');
        return { nachname: nachname.trim(), vorname: rest.join(',').trim() };
    }
    const teile = t.split(' ');
    if (teile.length < 2) return { nachname: t, vorname: '' };
    return { vorname: teile[0], nachname: teile.slice(1).join(' ') };
}

/** So steht ein Name in der Auswahl: Nachname zuerst, wie in jeder Klassenliste. */
export function anzeigeName(n: SchuelerName): string {
    return n.vorname ? `${n.nachname}, ${n.vorname}` : n.nachname;
}

const KOPFZEILE_A = new Set(['name', 'schüler', 'schueler', 'nachname', 'lastname', 'last name', 'surname']);
const KOPFZEILE_B = new Set(['vorname', 'firstname', 'first name']);

const zelle = (wert: unknown): string => (wert == null ? '' : String(wert).trim());

/**
 * Klassenliste aus den Zeilen des ersten Tabellenblatts.
 * Spalte A Nachname, Spalte B Vorname; steht alles in A, wird geteilt.
 * Eine Kopfzeile wird erkannt und uebersprungen.
 */
export function leseKlassenliste(zeilen: unknown[][]): SchuelerName[] {
    const namen: SchuelerName[] = [];
    for (const zeile of zeilen) {
        if (!Array.isArray(zeile)) continue;
        const a = zelle(zeile[0]);
        const b = zelle(zeile[1]);
        if (!a) continue;
        if (KOPFZEILE_A.has(a.toLowerCase()) || KOPFZEILE_B.has(b.toLowerCase())) continue;
        namen.push(b ? { nachname: a, vorname: b } : teileNamen(a));
    }
    return namen;
}

const vergleichsform = (s: string): string => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Eingabe in einen Namen uebersetzen. Passt sie zu einem Eintrag der
 * Klassenliste, gilt dessen Schreibweise — sonst wird die Eingabe geteilt.
 */
export function namensAusEingabe(eingabe: string, liste: SchuelerName[]): SchuelerName | null {
    if (!eingabe.trim()) return null;
    const v = vergleichsform(eingabe);
    const treffer = liste.find(n =>
        vergleichsform(anzeigeName(n)) === v || vergleichsform(`${n.vorname} ${n.nachname}`) === v
    );
    return treffer ?? teileNamen(eingabe);
}

/** Namen, die noch niemand hat — die eigene Eingabe bleibt waehlbar. */
export function freieNamen(liste: SchuelerName[], vergeben: string[], eigene: string): SchuelerName[] {
    const belegt = new Set(vergeben.filter(e => e !== eigene).map(vergleichsform));
    return liste.filter(n => !belegt.has(vergleichsform(anzeigeName(n))));
}

/**
 * Vorschlag je Arbeit aus der Reihenfolge der Klassenliste: der naechste freie
 * Name nach dem der vorigen Arbeit. Hat die Lehrkraft einen Namen eingetragen,
 * laeuft die Liste von dort weiter — fehlt mitten im Stapel eine Arbeit, stimmt
 * der Vorschlag danach also wieder.
 *
 * Nur ein VORSCHLAG (25.11.2026): Er steht grau im Feld und gilt erst, wenn die
 * Lehrkraft ihn mit Enter uebernimmt. Ein vorausgefuellter Name wuerde
 * durchgewunken; laege der Stapel anders, bekaeme jede Note stillschweigend die
 * falsche Person. `baueAufteilung` kennt deshalb nur Eingaben, nie Vorschlaege.
 */
export function vorschlaege(
    stuecke: Stueck[],
    eingaben: Record<number, string>,
    liste: SchuelerName[]
): Record<number, SchuelerName | undefined> {
    const belegt = new Set(Object.values(eingaben).filter(e => e.trim()).map(vergleichsform));
    const indexVon = (eingabe: string): number => {
        const n = namensAusEingabe(eingabe, liste);
        return n ? liste.findIndex(l => vergleichsform(anzeigeName(l)) === vergleichsform(anzeigeName(n))) : -1;
    };
    const ergebnis: Record<number, SchuelerName | undefined> = {};
    let zeiger = -1;
    for (const s of stuecke) {
        const eingabe = eingaben[s.start] ?? '';
        if (eingabe.trim()) {
            const i = indexVon(eingabe);
            if (i >= 0) zeiger = i;
            continue;
        }
        let i = zeiger + 1;
        while (i < liste.length && belegt.has(vergleichsform(anzeigeName(liste[i])))) i++;
        if (i < liste.length) { ergebnis[s.start] = liste[i]; zeiger = i; }
    }
    return ergebnis;
}

/** Die Stuecke mit ihren Namen in das Format, das die Liste der Arbeiten erwartet. */
export function baueAufteilung(
    stuecke: Stueck[],
    eingaben: Record<number, string>,
    liste: SchuelerName[]
): Aufteilung[] {
    return stuecke.map(s => {
        const name = namensAusEingabe(eingaben[s.start] ?? '', liste);
        return {
            firstName: name?.vorname || undefined,
            lastName: name?.nachname || undefined,
            pageCount: s.ende - s.start + 1
        };
    });
}
