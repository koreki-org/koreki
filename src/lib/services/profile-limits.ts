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

/** Eigene Einträge je Familie im Grundzustand. */
export const PROFIL_GRENZE = zahlAusUmgebung(process.env.KOREKI_PROFIL_GRENZE, 1);

/** Selbst gebaute Skills neben den mitgelieferten. */
export const SKILL_GRENZE = zahlAusUmgebung(process.env.KOREKI_SKILL_GRENZE, 1);

/**
 * Erkennungszeichen für die HTTP-Abbildung.
 *
 * Beide Seiten nutzen diese Konstante — der Werfer und `toProfileHttpError`.
 * Ein von Hand wiederholter Satz liefe beim nächsten Umformulieren
 * auseinander, und die Meldung käme als „Interner Serverfehler" beim Nutzer an.
 */
export const GRENZE_MARKER = 'Experten-Modus';

/** Wer die Grenze nicht spürt. */
export const istUnbegrenzt = (rolle?: string | null): boolean =>
    rolle === 'EXPERTE' || rolle === 'ADMIN';

/**
 * Wirft, wenn ein weiterer EIGENER Eintrag die Grenze überschreiten würde.
 *
 * @param anzahlEigene Bereits vorhandene eigene Einträge dieser Familie.
 *                     System-Vorlagen zählen nicht mit — sie gehören niemandem.
 */
export function pruefeProfilGrenze(
    familie: ProfilFamilie,
    anzahlEigene: number,
    rolle?: string | null
): void {
    if (istUnbegrenzt(rolle)) return;
    if (anzahlEigene < PROFIL_GRENZE) return;

    const bezeichnung = BEZEICHNUNG[familie];
    throw new Error(
        `Ohne ${GRENZE_MARKER} ${PROFIL_GRENZE === 1 ? 'ist ein' : `sind ${PROFIL_GRENZE}`} eigenes `
        + `${bezeichnung} möglich. Für weitere schalte den ${GRENZE_MARKER} frei.`
    );
}

/** Wirft, wenn ein Skill-Set mehr selbst gebaute Skills mitbringt als erlaubt. */
export function pruefeSkillGrenze(
    customSkills: Record<string, unknown> | undefined | null,
    rolle?: string | null
): void {
    if (istUnbegrenzt(rolle)) return;

    const anzahl = Object.keys(customSkills || {}).length;
    if (anzahl <= SKILL_GRENZE) return;

    throw new Error(
        `Ohne ${GRENZE_MARKER} ${SKILL_GRENZE === 1 ? 'ist ein' : `sind ${SKILL_GRENZE}`} eigener `
        + `Skill möglich. Für weitere schalte den ${GRENZE_MARKER} frei.`
    );
}
