import React from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen } from 'lucide-react';
import { Button } from './ui/Button';
import { useDialogA11y, useEscapeKey } from '@/hooks/useDialogA11y';
import { oeffneHandbuch } from '@/lib/handbuch';

interface QuickStartModalProps {
    onClose: () => void;
}

/**
 * Die Kurzanleitung: der Ablauf in fünf Zeilen, für den Fall ohne Internet.
 *
 * Erklärt wird im Handbuch unter hilfe.koreki.org. Bis zum 12.11.2026 stand
 * hier ein zweites, kleines Handbuch mit eigenen Begriffen („Fach-Prompts“,
 * „Präzedenzfälle“), das neben dem echten auseinanderlief. Die Schritte hier
 * folgen deshalb wörtlich den Überschriften von `handbuch/korrigieren/ablauf.md`
 * — wer dort einen Schritt ändert, zieht ihn hier nach.
 */
const SCHRITTE: { titel: string; text: string }[] = [
    { titel: 'Musterlösung laden', text: 'Koreki erkennt daraus Aufgaben und Punkte. Prüfe die Liste.' },
    { titel: 'Schülerarbeiten hinzufügen', text: 'Eine Datei je Person, als PDF, Bild, Text oder Moodle-Export.' },
    { titel: 'Scans lesen lassen', text: 'Bei Scans zuerst Namen schwärzen, dann die Bilderkennung starten.' },
    { titel: 'Korrigieren lassen', text: 'Koreki schlägt für jede Aufgabe Punkte und ein Feedback vor.' },
    { titel: 'Prüfen und exportieren', text: 'Du gehst die Vorschläge durch, änderst, was nicht passt, und exportierst.' },
];

const QuickStartModal: React.FC<QuickStartModalProps> = ({ onClose }) => {
    const { mounted, dialogRef } = useDialogA11y<HTMLDivElement>();
    useEscapeKey(true, onClose);

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-glass animate-overlay-in"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="kurzanleitung-titel"
                className="relative w-full max-w-md bg-card rounded-hero p-6 shadow-glass border border-border animate-dialog-in"
                onClick={e => e.stopPropagation()}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Schließen"
                    className="absolute top-4 right-4 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                >
                    <X size={20} />
                </Button>

                <h2 id="kurzanleitung-titel" className="text-lg font-semibold text-foreground">Kurzanleitung</h2>
                <p className="mt-1 text-sm text-muted-foreground">Eine Korrektur in fünf Schritten.</p>

                <ol className="mt-5 space-y-3">
                    {SCHRITTE.map((schritt, i) => (
                        <li key={schritt.titel} className="flex gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {i + 1}
                            </span>
                            <div>
                                <p className="text-sm font-medium text-foreground">{schritt.titel}</p>
                                <p className="text-sm text-muted-foreground">{schritt.text}</p>
                            </div>
                        </li>
                    ))}
                </ol>

                <p className="mt-5 text-sm text-muted-foreground">
                    Alles ausführlich, mit Bildern und Lösungen für häufige Probleme, steht im Handbuch.
                </p>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={onClose}>Schließen</Button>
                    <Button onClick={() => { void oeffneHandbuch(); }} className="gap-2">
                        <BookOpen size={16} /> Handbuch öffnen
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QuickStartModal;
