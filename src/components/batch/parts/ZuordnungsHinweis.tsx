import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Hinweis, dass die KI eine Aufgabe unter einem anderen Namen geliefert hat.
 *
 * Steht NEBEN dem Text, nie darin: Bis zum 16.11.2026 war er ein Vorsatz vor
 * Schuelertext bzw. Feedback und ging damit an die Bewertung bzw. an den
 * Schueler (siehe `findeKiAufgabe`). Eine Komponente fuer beide Ansichten —
 * Pruefung der Texterkennung und Vorschlag —, damit der Hinweis gleich aussieht.
 */
export const ZuordnungsHinweis: React.FC<{ text?: string }> = ({ text }) => {
    if (!text) return null;
    return (
        <div className="bg-warning/10 text-warning border border-warning/20 rounded-xl p-3 flex items-start gap-2 text-xs font-medium">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{text}</span>
        </div>
    );
};
