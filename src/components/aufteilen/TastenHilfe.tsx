import React from 'react';

const Taste: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <kbd className="rounded-md border border-border bg-muted px-1.5 font-sans text-xs text-foreground">{children}</kbd>
);

/**
 * Die Tasten der Schere, als eine Zeile unter dem Titel. Bis zum 25.11.2026
 * stand dieser Text unten in der rechten Spalte — bei normaler Fensterhoehe
 * nur nach Scrollen zu sehen, also fuer genau die nicht, die ihn brauchen.
 * Am Handy gibt es diese Tasten nicht; dort steht nur der Satz zum Ablauf.
 */
const TastenHilfe: React.FC = () => (
    <>
        <p className="md:hidden text-sm text-muted-foreground m-0 mt-1">
            Blättere durch und markiere die erste Seite jeder Arbeit.
        </p>
        <p className="hidden md:flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground m-0 mt-2">
            <span><Taste>Enter</Taste> hier beginnt eine Arbeit, auf ihrer ersten Seite: Vorschlag übernehmen und weiter</span>
            <span><Taste>Entf</Taste> Anfang entfernen</span>
            <span><Taste>←</Taste> <Taste>→</Taste> blättern</span>
        </p>
    </>
);

export default TastenHilfe;
