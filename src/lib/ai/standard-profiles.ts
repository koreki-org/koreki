/**
 * Industrial Standard Profiles (Stage 10)
 * 🏮🛡️🏛️
 * This is the SINGLE SOURCE OF TRUTH for all pedagogical default prompts.
 * Shared between SaaS, Community and Desktop editions.
 */
export const STANDARD_PROFILES = [
    { 
        name: 'Standard', 
        isSystem: true, 
        correctionPrompt: 'Bewerte die inhaltliche Substanz fair und ausgewogen. Achte dabei besonders auf eine klare Strukturierung der Argumentation und die fachliche Nachvollziehbarkeit der Gedankengänge.' 
    },
    { 
        name: 'Mathe & Logik', 
        isSystem: true, 
        correctionPrompt: 'Bewerte mit höchster mathematischer und logischer Präzision. Achte akribisch auf die formale Korrektheit von Rechenwegen, Formeln und logischen Beweisketten. Identifiziere logische Fehlschlüsse oder Rechenfehler präzise, aber bewerte unvollständige oder fehlerbehaftete Lösungsansätze anhand von Folgefehlern fair.' 
    },
    { 
        name: 'Informatik', 
        isSystem: true, 
        correctionPrompt: 'Lege besonderen Wert auf das logische Verständnis von informationstechnischen Zusammenhängen und Strukturen. Bewerte funktionale Korrektheit und Problemlösungskompetenz höher als rein syntaktische Perfektion.' 
    },
    { 
        name: 'Wirtschaftskunde', 
        isSystem: true, 
        correctionPrompt: 'Achte besonders auf die präzise Verwendung ökonomischer Fachbegriffe (z.B. BIP, Inflation, Marktmechanismen) und das fundierte Verständnis mikro- und makroökonomischer Kausalitäten. Erwarte eine logische Herleitung wirtschaftlicher Entscheidungen.' 
    },
    { 
        name: 'Ethik', 
        isSystem: true, 
        correctionPrompt: 'Bewerte primär die Tiefe der ethischen Reflexion und die logische Schlüssigkeit der normativen Begründungen. Achte auf eine korrekte Einbeziehung und Anwendung moralphilosophischer Konzepte.' 
    },
    { 
        name: 'Geschichte', 
        isSystem: true, 
        correctionPrompt: 'Priorisiere die korrekte zeitliche Einordnung sowie die fundierte Analyse historischer Ursache-Wirkungs-Zusammenhänge. Bewerte Ansätze von Multiperspektivität und kritischer Quellenarbeit besonders positiv.' 
    },
    { 
        name: 'Gemeinschaftskunde', 
        isSystem: true, 
        correctionPrompt: 'Lege Wert auf ein fundiertes Verständnis demokratischer Prozesse und die Fähigkeit zur kritischen, multiperspektivischen Urteilsbildung. Achte auf eine klare Differenzierung zwischen Sach- und Werturteil.' 
    }
];
