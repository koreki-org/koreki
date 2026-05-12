/**
 * Koreki Standard Grading Skills Registry
 * 🏮🛡️🏛️
 * Houses all modular correction rules (skills) and their corresponding prompt snippets.
 * Includes declarative metadata for prerequisites and mutual exclusion constraints.
 */

export interface GradingSkill {
    id: string;
    name: string;
    category: 'math-science' | 'languages' | 'standards' | 'feedback';
    description: string;
    promptSnippet: string;
    requires?: string[];      // IDs of skills that must be active
    conflictsWith?: string[]; // IDs of skills that cannot be active together
}

export const STANDARD_SKILLS: Record<string, GradingSkill> = {
    'skill-consecutive-errors': {
        id: 'skill-consecutive-errors',
        name: 'Folgefehler-Tracking (Mathematik)',
        category: 'math-science',
        description: 'Rechnet mathematische und physikalische Folgeschritte basierend auf einem initialen Rechenfehler logisch nach und bewertet diese folgerichtig kulant.',
        promptSnippet: `
FOLGEFEHLER-REGEL (MATHEMATISCH-LOGISCH):
- Wenn der Schüler in einem Rechenschritt einen Rechen- oder Übertragungsfehler macht (Primärfehler), ziehe für DIESEN Schritt Punkte gemäß der Vorgabe ab.
- Wenn der Schüler alle darauffolgenden Rechenschritte basierend auf diesem falschen Zwischenergebnis mathematisch, methodisch und logisch absolut korrekt durchführt, darfst du für diese Folgeschritte KEINE weiteren Punkte abziehen!
- Berechne das Folge-Ergebnis gedanklich mit dem falschen Wert nach. Stimmt der Rechenweg und das Ergebnis basierend auf dem Fehlerwert, gib die volle Punktzahl für diese Teilaufgabe.`
    },
    'skill-math-equivalence': {
        id: 'skill-math-equivalence',
        name: 'Mathematische Äquivalenz (IT & Mathematik)',
        category: 'math-science',
        description: 'Akzeptiert alternative, mathematisch identische Rechenwege, zusammengefasste Terme (z.B. Division durch 1024^2 statt zweimalige Division durch 1024) oder übersprungene Zwischenschritte als 100% korrekt.',
        promptSnippet: `
MATHEMATISCHE ÄQUIVALENZ (HÖCHSTE PRIORITÄT):
- Akzeptiere alle mathematisch identischen Rechenwege und Darstellungsformen.
- Kurzschreibweisen und zusammengefasste Terme sind hocheffizient und absolut korrekt (z.B. eine Division durch "(1024 * 1024)" oder "1024^2" ist identisch mit zwei aufeinanderfolgenden Divisionen durch 1024).
- Werte solche mathematisch korrekten Vereinfachungen niemals ab und bezeichne sie nicht als unvollständig oder falsch, solange das Ergebnis und der mathematische Gesamtfaktor stimmen.`
    },
    'skill-math-isolated-grading': {
        id: 'skill-math-isolated-grading',
        name: 'Rechenweg- & Ergebnis-Trennung',
        category: 'math-science',
        description: 'Trennt die Punktevergabe für den logischen Ansatz/Rechenweg strikt vom rechnerischen Endergebnis. Verhindert unfaire Punktabzüge bei reinen Tipp- und Rechenfehlern.',
        promptSnippet: `
STRIKTE TRENNUNG VON RECHENWEG UND ENDERGEBNIS:
- Bewerte den logischen Rechenweg ("Ansatz") und das rechnerische Endergebnis völlig isoliert voneinander.
- Wenn der logische Ansatz (richtige Formeln, Operatoren und Ausgangswerte) korrekt is, vergib alle für den Rechenweg vorgesehenen Punkte in "pointsObtained", selbst wenn das Endergebnis rechnerisch falsch ist.
- Ein Rechen- oder Tippfehler am Ende darf niemals dazu führen, dass Punkte für den ansonsten korrekten Lösungsweg abgezogen werden. Kürze bei einem Rechenfehler ausschließlich den explizit für das Ergebnis vorgesehenen Punkt.`
    },
    'skill-math-scratchpad': {
        id: 'skill-math-scratchpad',
        name: 'Aktives Nachrechnen (Scratchpad)',
        category: 'math-science',
        description: 'Verpflichtet die KI, im Denk-Raum "correctionNotes" jeden Schritt des Schülers aktiv nachzurechnen, um Abweichungen exakt mathematisch zu begründen und falsche Diagnosen zu vermeiden.',
        promptSnippet: `
AKTIVES NACHRECHNEN IM DENK-RAUM (SCRATCHPAD):
- Nutze das Feld "correctionNotes" als deinen mathematischen Denk-Raum. Führe für jeden Rechenschritt des Schülers eine aktive Probe-Berechnung durch.
- Weicht ein Schülerwert von der Musterlösung ab, ermittle mathematisch exakt, welche Zahl, welcher Multiplikator (z.B. Paketgröße) oder welcher Schritt vergessen, vertauscht oder falsch berechnet wurde.
- Dokumentiere diese exakte mathematische Ursache in deinen "correctionNotes". Vermeide falsche Pauschal-Diagnosen wie "falscher Umrechnungsfaktor", wenn der Faktor korrekt aufgeschrieben, aber falsch berechnet wurde.`
    },
    'skill-marks-bayern': {
        id: 'skill-marks-bayern',
        name: 'Korrekturzeichen (Bayern)',
        category: 'standards',
        description: 'Formatiert Korrekturhinweise im bayerischen Format (R, Gr, Z, Sb, f, ug). schließt NRW-Kürzel aus.',
        promptSnippet: `
FORMATIERUNG DER FEHLER (KORREKTURZEICHEN BAYERN):
Verwende in deinen 'correctionNotes' und 'feedback' ausschließlich die bayerischen Korrekturzeichen. Setze das zutreffende Zeichen zwingend in eckigen Klammern direkt vor den jeweiligen Fehlerhinweis (z.B. "[f] Rechenfehler: ..." oder "[R] 'Ennergie'"):
- [R] für Rechtschreibfehler
- [Gr] für Grammatikfehler
- [Z] für Zeichensetzungsfehler
- [Sb] für Satzbaufehler
- [f] für fachlich/inhaltlich falsch
- [ug] für ungenau / unvollständig`,
        conflictsWith: ['skill-marks-nrw']
    },
    'skill-marks-nrw': {
        id: 'skill-marks-nrw',
        name: 'Korrekturzeichen (NRW)',
        category: 'standards',
        description: 'Formatiert Korrekturhinweise im NRW-Format (Orth, Synt, Lex, Inh, Gr). schließt Bayern-Kürzel aus.',
        promptSnippet: `
FORMATIERUNG DER FEHLER (KORREKTURZEICHEN NRW):
Verwende in deinen 'correctionNotes' und 'feedback' ausschließlich die NRW-Korrekturzeichen. Setze das zutreffende Zeichen zwingend in eckigen Klammern direkt vor den jeweiligen Fehlerhinweis (z.B. "[Inh] Rechenfehler: ..." oder "[Orth] 'Ennergie'"):
- [Orth] für Rechtschreibfehler
- [Synt] für Satzbau- und Grammatikfehler
- [Lex] für Ausdrucks- und Wortwahlfehler
- [Inh] für inhaltliche Mängel
- [Gr] für klassische grammatikalische Fehler`,
        conflictsWith: ['skill-marks-bayern']
    },
    'skill-feedback-sandwich': {
        id: 'skill-feedback-sandwich',
        name: 'Sandwich-Feedback-Methode',
        category: 'feedback',
        description: 'Strukturiert das Feedback pädagogisch nach der Lob-Kritik-Lob Methode.',
        promptSnippet: `
FEEDBACK-STRUKTUR (SANDWICH-METHODE):
Strukturiere das Feld 'feedback' für jede Aufgabe zwingend wie folgt:
1. Positiver Einstieg (Spezifisches Lob: Was wurde gut gelöst?)
2. Konstruktive Kritik (Konkreter Verbesserungshinweis: Wo genau lag der Fehler?)
3. Motivierender Abschluss (Mutmachender Satz zur Weiterarbeit)`
    },
    'skill-orthography-lenient': {
        id: 'skill-orthography-lenient',
        name: 'Orthographie-Ignoranz',
        category: 'languages',
        description: 'Bewertet rein die inhaltliche Substanz. Rechtschreibung und Grammatik werden komplett ignoriert.',
        promptSnippet: `
ORTHOGRAPHIE-IGNORANZ:
- Rechtschreibung, Grammatik, Zeichensetzung und sprachliche Ästhetik haben absolut KEINEN Einfluss auf die Bewertung.
- Ziehe niemals Punkte für falsche Schreibweisen oder holprigen Satzbau ab, sofern die fachlich-inhaltliche Aussage verständlich ist.
- Erwähne Orthographiefehler nicht im Feedback.`
    },
    'skill-marks-classic': {
        id: 'skill-marks-classic',
        name: 'Korrekturzeichen (Klassisch)',
        category: 'standards',
        description: 'Formatiert Korrekturhinweise mit klassischen, allgemein verständlichen Korrekturzeichen (f für falsch, r für Rechtschreibfehler, g für Grammatikfehler, z für Zeichensetzung).',
        promptSnippet: `
FORMATIERUNG DER FEHLER (KLASSISCHE KORREKTURZEICHEN):
Verwende in deinen 'correctionNotes' und 'feedback' ausschließlich die folgenden klassischen Korrekturzeichen. Setze das zutreffende Zeichen zwingend in eckigen Klammern direkt vor den jeweiligen Fehlerhinweis (z.B. "[f] Rechenfehler: ..." oder "[r] 'Ennergie'"):
- [f] für fachlich/inhaltlich falsch
- [r] für Rechtschreibfehler
- [g] für Grammatikfehler
- [z] für Zeichensetzungsfehler
- [?] für unklare oder unvollständige Aussagen`,
        conflictsWith: ['skill-marks-bayern', 'skill-marks-nrw']
    },
    'skill-feedback-general': {
        id: 'skill-feedback-general',
        name: 'Allgemeines Feedback',
        category: 'feedback',
        description: 'Erstellt ein klares, motivierendes Feedback für Schüler mit Lob und konkreten Verbesserungstipps. Benötigt klassische Korrekturzeichen.',
        promptSnippet: `
PÄDAGOGISCHES FEEDBACK (ALLGEMEIN):
Verfasse im Feld 'feedback' ein wertschätzendes, altersgerechtes Feedback:
1. LOB: Hebe positiv hervor, was bereits gut gelöst wurde.
2. TIPP: Erkläre verständlich, wo der Fehler lag und wie er behoben werden kann.
3. ABSCHLUSS: Schließe mit einem motivierenden Satz ab.`,
        requires: ['skill-marks-classic']
    }
};
