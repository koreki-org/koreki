/**
 * Mengengrenzen der vier Profil-Familien
 * 📦🛡️
 *
 * WARUM ES DIESE DATEI GIBT
 * -------------------------
 * Der Experten-Modus war eine Schranke VOR den vier Konfigurations-Modalen:
 * wer nicht zahlte, sah sie gar nicht. Das war aus zwei Gründen falsch. Zum
 * einen hatten Trial-Nutzer und Instituts-Mitglieder sie ohnehin, die Schranke
 * traf also ausgerechnet den, der sich gerade für einen bezahlten Modus
 * entschieden hatte — ein Verlust genau im Moment der Festlegung. Zum anderen
 * verkaufte sie eine Fähigkeit, während Koreki sonst Verbrauch abrechnet.
 *
 * Jetzt sind die Modale für jeden offen, und begrenzt ist die MENGE. Wer ein
 * eigenes Profil je Familie anlegt, erlebt den Nutzen vollständig. Wer ein
 * zweites will, hat das Produkt verstanden und benutzt es — das ist der
 * richtige Moment für die Frage nach Geld, und der genaue Gegensatz zu vorher.
 *
 * WAS DIE GRENZE NICHT TUT
 * ------------------------
 * Sie nimmt nichts weg. Geprüft wird ausschließlich beim NEUANLEGEN. Ein
 * bestehendes Profil lässt sich weiter bearbeiten, auch wenn jemand über der
 * Grenze liegt — andernfalls könnte jemand sein eigenes Profil nicht mehr
 * speichern, sobald er das Kontingent erreicht hat. Das wäre die schlimmste
 * denkbare Ausprägung dieser Regel.
 *
 * Lokale Instanzen (Desktop, Schule) kennen die Grenze nicht: Sie haben weder
 * Credits noch Vertrieb. Die Prüfung steht deshalb nur in den SaaS-Zweigen.
 */

export type ProfilFamilie = 'EXPERTISE' | 'SKILLS' | 'ERFAHRUNG' | 'KI';

const BEZEICHNUNG: Record<ProfilFamilie, string> = {
    EXPERTISE: 'Expertise-Profil',
    SKILLS: 'Skill-Set',
    ERFAHRUNG: 'Erfahrungsschatz',
    KI: 'KI-Profil'
};

const zahlAusUmgebung = (wert: string | undefined, standard: number): number => {
    const gelesen = Number(wert);
    // Eine unlesbare oder negative Angabe darf die Grenze nicht aufheben und
    // auch nicht alles sperren — dann gilt der Standard.
    return Number.isInteger(gelesen) && gelesen >= 0 ? gelesen : standard;
};

/**
 * Wie viel im Grundzustand frei ist.
 *
 * EINE Zahl fuer alle vier Familien UND fuer die selbst gebauten Skills. Fuenf
 * getrennte Stellschrauben waeren fuenf Gelegenheiten, dass eine davon beim
 * naechsten Preiswechsel vergessen wird — und fuer die Lehrkraft fuenf Zahlen,
 * die sie sich merken muesste, statt einer Regel: eins von allem.
 */
export const FREI_GRENZE = zahlAusUmgebung(process.env.KOREKI_FREI_GRENZE, 1);

/**
 * Was die Freischaltung kostet.
 *
 * Steht hier und nicht in der Route, weil der Preis an zwei Stellen erscheint:
 * beim Abbuchen und im Hinweis am Knopf. Zwei von Hand gepflegte Zahlen laufen
 * auseinander, und dann verspricht die Oberflaeche einen Preis, den die Kasse
 * nicht nimmt.
 */
export const EXPERTEN_MODUS_CREDITS = 5;

/**
 * Erkennungszeichen für die HTTP-Abbildung.
 *
 * Beide Seiten nutzen diese Konstante — der Werfer und `toProfileHttpError`.
 * Ein von Hand wiederholter Satz liefe beim nächsten Umformulieren
 * auseinander, und die Meldung käme als „Interner Serverfehler" beim Nutzer an.
 */
export const GRENZE_MARKER = 'Experten-Modus';

/**
 * Woran haengt, ob jemand die Grenze spuert.
 *
 * `imInstitut` ist bewusst dabei: Eine Schule zahlt fuer ihre Lehrkraefte, und
 * sie dann einzeln zum Freischalten zu schicken waere doppelt kassiert.
 */
export interface GrenzKontext {
    rolle?: string | null;
    imInstitut?: boolean;
}

/** Wer die Grenze nicht spürt. */
export const istUnbegrenzt = (kontext: GrenzKontext): boolean =>
    kontext.rolle === 'EXPERTE' || kontext.rolle === 'ADMIN' || kontext.imInstitut === true;

/**
 * Wirft, wenn ein weiterer EIGENER Eintrag die Grenze überschreiten würde.
 *
 * @param anzahlEigene Bereits vorhandene eigene Einträge dieser Familie.
 *                     System-Vorlagen zählen nicht mit — sie gehören niemandem.
 */
export function pruefeProfilGrenze(
    familie: ProfilFamilie,
    anzahlEigene: number,
    kontext: GrenzKontext
): void {
    if (istUnbegrenzt(kontext)) return;
    if (anzahlEigene < FREI_GRENZE) return;

    throw new Error(
        `Ohne ${GRENZE_MARKER} ${FREI_GRENZE === 1 ? 'ist ein' : `sind ${FREI_GRENZE}`} eigenes `
        + `${BEZEICHNUNG[familie]} möglich. Für weitere schalte den ${GRENZE_MARKER} frei.`
    );
}

/** Wirft, wenn ein Skill-Set mehr selbst gebaute Skills mitbringt als erlaubt. */
export function pruefeSkillGrenze(
    customSkills: Record<string, unknown> | undefined | null,
    kontext: GrenzKontext
): void {
    if (istUnbegrenzt(kontext)) return;

    if (Object.keys(customSkills || {}).length <= FREI_GRENZE) return;

    throw new Error(
        `Ohne ${GRENZE_MARKER} ${FREI_GRENZE === 1 ? 'ist ein' : `sind ${FREI_GRENZE}`} eigener `
        + `Skill möglich. Für weitere schalte den ${GRENZE_MARKER} frei.`
    );
}
