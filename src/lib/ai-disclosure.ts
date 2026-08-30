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

/**
 * Maschinenlesbare Kennung fuer Webseiten, die KI-erzeugten Text zeigen.
 *
 * Der digitale Rueckmeldezettel ist der einzige Weg, auf dem Feedback die
 * Schuelerin oder den Schueler NICHT als Datei erreicht — dort greifen weder
 * PDF- noch Excel-Eigenschaften. Ohne diese Kennung waere ausgerechnet die
 * Ausgabe an die betroffene Person die einzige ungekennzeichnete.
 *
 * `generator` ist ein etablierter Meta-Name und damit von jedem Werkzeug
 * lesbar; `ai-generated` sagt es zusaetzlich ausdruecklich. Artikel 50 Absatz 2
 * verlangt ein maschinenlesbares Format, nennt aber bewusst keine Technik —
 * Metadaten sind hier das Gegenstueck zu dem, was Dateien schon tragen.
 */
export function htmlKennzeichnung(): { generator: string; aiGenerated: string } {
    return {
        generator: `Koreki — ${KENNZEICHEN}`,
        aiGenerated: KENNZEICHEN
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
