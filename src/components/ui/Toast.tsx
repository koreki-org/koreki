import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import type { MeldungsArt } from '@/lib/notify';

/**
 * Eine Meldung am Rand.
 *
 * Bewusst kein Modal: Eine Erfolgsmeldung darf den Ablauf nicht anhalten. Der
 * Zettel legt sich neben den Inhalt, statt sich davor zu stellen.
 *
 * DIE FLAECHE IST UNDURCHSICHTIG, und das ist keine Geschmacksfrage.
 * Die erste Fassung faerbte den Zettel mit `bg-success/5` ein — zusammen mit
 * `bg-background` in derselben Klassenliste. `cn()` fasst ueber `tailwind-merge`
 * zusammen und behaelt nur die letzte Hintergrundklasse: uebrig blieben fuenf
 * Prozent Deckkraft. Ueber einem Modal war der Zettel damit kaum lesbar. Die
 * Tonlage traegt deshalb der Streifen links, nicht die Flaeche.
 */

interface ToastProps {
    art: MeldungsArt;
    text: string;
    onSchliessen: () => void;
}

const TON: Record<MeldungsArt, { rahmen: string; streifen: string; farbe: string; Symbol: typeof Info }> = {
    erfolg: {
        rahmen: 'border-success/40',
        streifen: 'bg-success',
        farbe: 'text-success',
        Symbol: CheckCircle2
    },
    // Ein fehlender Name ist eine offene Aufgabe, kein Defekt. Rot wuerde der
    // Lehrkraft sagen, etwas sei kaputt.
    hinweis: {
        rahmen: 'border-warning/40',
        streifen: 'bg-warning',
        farbe: 'text-warning',
        Symbol: Info
    },
    fehler: {
        rahmen: 'border-destructive/40',
        streifen: 'bg-destructive',
        farbe: 'text-destructive',
        Symbol: AlertTriangle
    }
};

const BESCHRIFTUNG: Record<MeldungsArt, string> = {
    erfolg: 'Erfolg',
    hinweis: 'Hinweis',
    fehler: 'Fehler'
};

export const Toast: React.FC<ToastProps> = ({ art, text, onSchliessen }) => {
    const { rahmen, streifen, farbe, Symbol } = TON[art];

    return (
        <div
            // Ein Fehler unterbricht die Vorlesereihenfolge, Erfolg und Hinweis
            // warten hoeflich ab. Ohne diese Trennung liest ein Screenreader
            // jede belanglose Bestaetigung mitten in den Satz hinein, an dem
            // der Nutzer gerade ist.
            role={art === 'fehler' ? 'alert' : 'status'}
            aria-live={art === 'fehler' ? 'assertive' : 'polite'}
            className={cn(
                'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden',
                'rounded-lg border bg-background py-4 pl-5 pr-3 shadow-xl',
                'animate-fade-in transition-all duration-300',
                rahmen
            )}
        >
            <span className={cn('absolute inset-y-0 left-0 w-1', streifen)} aria-hidden="true" />

            <Symbol className={cn('h-5 w-5 shrink-0', farbe)} aria-hidden="true" />

            <div className="min-w-0 flex-1">
                <span className="sr-only">{BESCHRIFTUNG[art]}: </span>
                <p className="whitespace-pre-line break-words text-sm leading-snug text-foreground">
                    {text}
                </p>
            </div>

            <Button
                variant="ghost"
                size="icon"
                onClick={onSchliessen}
                aria-label="Meldung schließen"
                className="h-auto shrink-0 p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
                <X className="h-5 w-5" />
            </Button>
        </div>
    );
};
