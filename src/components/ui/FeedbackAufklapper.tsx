import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Zwei Sorten Inhalt teilen sich den Aufklapper, und sie sind NICHT gleichwertig:
 *
 * - `engine` — was eine Rechen-Engine bewiesen hat. Stimmt per Konstruktion mit der
 *   Punktzahl ueberein. Blau, wie alles Belastbare in dieser Karte.
 * - `notizen` — der Notizzettel des Modells vor der Punktevergabe. Ein Entwurf, der
 *   der Punktzahl widersprechen KANN (gemessen am 24.08.2026: "Insgesamt 5-6 Punkte
 *   moeglich" gefolgt von voller Punktzahl). Grau, weil es Maschinen-Innenleben ist
 *   und kein Beweis.
 *
 * Bewusst EIN Bauteil mit zwei Toenen statt zweier Aufklapper: Sie treten nie
 * gleichzeitig auf, und eine Kopie waere wortgleich.
 */
type AufklapperTon = 'engine' | 'notizen';

const TON: Record<AufklapperTon, { schrift: string; anriss: string; marke: string; trenner: string }> = {
    engine: {
        schrift: 'text-primary',
        anriss: 'hover:bg-primary/5',
        marke: 'text-primary/70',
        trenner: 'border-primary/15'
    },
    notizen: {
        schrift: 'text-muted-foreground',
        anriss: 'hover:bg-muted/50',
        marke: 'text-muted-foreground/70',
        trenner: 'border-border'
    }
};

export const Aufklapper: React.FC<{
    titel: string;
    beschreibung?: string;
    /** Tritt an die Stelle der Beschreibung, wenn die Engine nichts belegen konnte. */
    warnung?: string;
    ton: AufklapperTon;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ titel, beschreibung, warnung, ton, icon, children }) => {
    const t = TON[ton];
    return (
        /*
         * Kein Rahmen, keine Flaeche, keine senkrechte Schiene — nur zwei Haarlinien.
         *
         * Die Schiene stand hier einen Entwurf lang und fiel wieder heraus: Ueber
         * einen kurzen Block liest sie als Gruppierung, ueber einen langen als
         * sinnfreie senkrechte Linie neben dem Text (gemeldet am 07.09.2026). Ein
         * aufgeklappter Block braucht eine Ober- und eine Unterkante, mehr nicht;
         * offen oder zu sagt der Pfeil rechts.
         *
         * Nichts an der waagerechten Ausrichtung haengt an `open:`, damit beim Klick
         * kein Text zur Seite springt.
         */
        <details className="group">
            {/*
              * Marke links, Pfeil rechts — beide gleich weit von der Kante.
              *
              * `px-2 -mx-2` ist der Trick dahinter: Die Hoverflaeche greift acht Pixel
              * ueber den Inhalt hinaus, waehrend Zahnrad und Pfeil buendig mit den
              * Kanten des Textbereichs stehen. Ohne den negativen Rand klebte der
              * Pfeil entweder an der Kante oder der Text ruecke ein.
              *
              * Symmetrie ist hier nachgemessen, nicht geschaetzt: Am 07.09.2026 stand
              * schon einmal 19,6px links gegen 6px rechts, weil ein `pl-3` ohne
              * Gegenstueck gesetzt war.
              */}
            <summary className={cn(
                'flex items-start justify-between gap-3 py-2 px-2 -mx-2 rounded-lg cursor-pointer list-none select-none text-xs font-bold transition-colors [&::-webkit-details-marker]:hidden',
                t.schrift, t.anriss
            )}>
                <div className="flex items-start gap-2.5 min-w-0">
                    <div className={cn('flex items-center justify-center w-5 h-5 shrink-0', t.marke)}>{icon}</div>
                    <div className="min-w-0">
                        <span>{titel}</span>
                        {warnung ? (
                            <p className="mt-0.5 font-normal text-warning">{warnung}</p>
                        ) : beschreibung && (
                            <p className="mt-0.5 font-normal text-muted-foreground">{beschreibung}</p>
                        )}
                    </div>
                </div>
                <ChevronDown size={14} className={cn('shrink-0 mt-0.5 transition-transform duration-300 group-open:rotate-180', t.schrift)} />
            </summary>
            {/*
              * Fliesstext in Fliesschrift, Rechnungen in Monospace.
              *
              * Hier stand bis zum 04.09.2026 `font-mono` fuer den GANZEN Block. Damit
              * sah ein Satz wie "Der extrahierte Rechenweg ist in sich fehlerfrei" aus
              * wie ein Programmauszug, und die Lehrkraft las eine Wand aus
              * Schreibmaschinenschrift. Monospace hat genau eine Aufgabe: Zeichen
              * untereinander ausrichten. Das braucht eine Formel, kein Satz.
              *
              * Was Rechnung IST, entscheidet der Erzeuger, indem er es in
              * Backtick-Zeichen setzt; `MathMarkdown` macht daraus Monospace.
              */}
            <div className={cn('border-t border-b mt-2 pt-3 pb-4 text-xs leading-relaxed font-sans', t.trenner)}>
                {children}
            </div>
        </details>
    );
};
