/**
 * Kennzeichnung KI-erzeugter Textinhalte.
 *
 * Koreki erzeugt Feedbacktexte maschinell. Verlassen diese das System als
 * Datei, muss erkennbar bleiben, dass der Text kuenstlich erzeugt wurde —
 * maschinenlesbar in den Dateieigenschaften, dazu ein knapper Hinweis fuer
 * Menschen. Beides bewusst dezent: Der Text ist von der Lehrkraft geprueft
 * und freigegeben, das ist keine Warnung, sondern eine Herkunftsangabe.
 *
 * Zentral gehalten, damit ein neuer Exportweg nicht stillschweigend ohne
 * Kennzeichnung entsteht — geprueft durch
 * tests/unit/lib/ai-disclosure.test.ts.
 */

/** Erscheint in der Fusszeile exportierter PDFs. Eine Zeile, grau, klein. */
export const KI_HINWEIS_FUSSZEILE =
    'Erstellt mit Koreki · KI-generierte Textvorschläge, von der Lehrkraft geprüft und freigegeben';

/** Kurzform fuer Stellen mit wenig Platz (Feedback-Slips, Tabellenkopf). */
export const KI_HINWEIS_KURZ = 'KI-generiert, von der Lehrkraft freigegeben';

/**
 * Maschinenlesbare Herkunftsangabe fuer Dateieigenschaften.
 * Der Schluesselbegriff "AI-generated" steht bewusst auf Englisch drin,
 * damit automatisierte Pruefungen ihn finden.
 */
const KENNZEICHEN = 'AI-generated content (Koreki)';

/** Dateieigenschaften fuer PDF-Exporte (jsPDF `setProperties`). */
export function pdfKennzeichnung(titel: string): {
    title: string;
    subject: string;
    creator: string;
    keywords: string;
} {
    return {
        title: titel,
        subject: KI_HINWEIS_KURZ,
        creator: 'Koreki',
        keywords: `${KENNZEICHEN}, KI-generiert, Koreki`
    };
}

/** Dateieigenschaften fuer Excel-Exporte (SheetJS `Props`). */
export function excelKennzeichnung(): {
    Company: string;
    Category: string;
    Comments: string;
} {
    return {
        Company: 'Koreki',
        Category: KENNZEICHEN,
        Comments: KI_HINWEIS_FUSSZEILE
    };
}
