/**
 * Die drei Schülertypen des Simulators.
 * 🎭
 *
 * Koreki erzeugt fiktive Abgaben in drei Ausprägungen, damit die Lehrkraft ihre
 * Bewertung an typischen Fehlerbildern kalibriert statt an einem Idealfall.
 * Reine Darstellung — deshalb hier und nicht im Hook.
 */

export function getCharacterBadgeStyle(char: string): string {
    switch (char) {
        case 'TYPO':
            return 'bg-rose-50 text-rose-600 border border-rose-100/80';
        case 'MATH_STEP_MISSING':
            return 'bg-amber-50 text-amber-600 border border-amber-100/80';
        case 'SEMANTIC_LENIENT':
            return 'bg-sky-50 text-sky-600 border border-sky-100/80';
        default:
            return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
}

export function getCharacterTitle(char: string): string {
    switch (char) {
        case 'TYPO':
            return 'Der Flüchtige (Tippfehler & Syntax)';
        case 'MATH_STEP_MISSING':
            return 'Der Lückenhafte (Rechenweg / Struktur)';
        case 'SEMANTIC_LENIENT':
            return 'Der Schwammige (Umgangssprache / Kulanz)';
        default:
            return char;
    }
}
