import React, { useState } from 'react';
import { Pencil, Check, Eye, ChevronDown, Settings, FileText } from 'lucide-react';
import { MathMarkdown } from './MathMarkdown';
import { HighlightableTextArea } from './HighlightableTextArea';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import { ENGINE_LABELS, ENGINE_BESCHREIBUNGEN } from './feedback-engine-labels';
import { CalcTraceLegende } from './CalcTraceLegende';
import type { FeedbackEngine } from './feedback-engine-labels';
import { splitFeedback } from './feedback-split';
export type { FeedbackEngine };
export { splitFeedback };

interface EditableMathAreaProps {
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
    className?: string;
    initialEditMode?: boolean;
    label?: string;
    leftAction?: React.ReactNode;
    /**
     * Notizzettel des Modells zu dieser Aufgabe (`AITask.correctionNotes`).
     *
     * Kommt bewusst als eigener Wert und nicht im Feedback-Text: Der Engine-Block
     * liegt dort und muss deshalb von jedem schuelergerichteten Ausgabeweg per
     * `stripPangBlock` wieder herausgeschnitten werden. Eine weitere solche Stelle
     * waere eine weitere Gelegenheit, es zu vergessen — und ein vergessener Schnitt
     * setzte das Selbstgespraech der KI auf das PDF eines Schuelers.
     */
    aiNotes?: string;
}

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

const Aufklapper: React.FC<{
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
        <details className="group mb-4">
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

/**
 * EditableMathArea
 * 🎭 A dual-mode component that toggles between high-fidelity math rendering and raw text editing.
 * Implements the "Read-Only-First" pattern for premium UX.
 */
export const EditableMathArea: React.FC<EditableMathAreaProps> = ({
    value,
    onChange,
    placeholder,
    className,
    initialEditMode = false,
    label,
    leftAction,
    aiNotes
}) => {
    const [isEditing, setIsEditing] = useState(initialEditMode);

    const { technical, engine, nichtNachgerechnet, pedagogical } = splitFeedback(value);
    const notizen = (aiNotes || '').trim();

    return (
        <div className={cn("relative group w-full", className)}>
            {/* Header / Actions */}
            <div className="flex items-center justify-between mb-2 px-1">
                {leftAction ? (
                    <div className="flex items-center gap-2">
                        {leftAction}
                    </div>
                ) : <div />}
                
                <div className="ml-auto flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all duration-300">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsEditing(!isEditing)}
                        className={cn(
                            "h-7 w-7 rounded-lg transition-all",
                            isEditing ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        )}
                        title={isEditing ? "Vorschau anzeigen" : "Inhalt bearbeiten"}
                    >
                        {isEditing ? <Eye size={14} /> : <Pencil size={14} />}
                    </Button>
                </div>
            </div>

            {/*
              * Rahmen und Innenabstand haengen NICHT am Bearbeitungsmodus.
              *
              * Genau das war hier kurzzeitig der Fall, und der Stift liess damit beim
              * Umschalten die Umrahmung erscheinen und die Abstaende springen — es
              * fuehlte sich an, als sei etwas kaputt (gemeldet am 08.09.2026). Ein
              * Feld, das man bearbeiten kann, darf beim Bearbeiten nicht die Gestalt
              * wechseln.
              *
              * Das `p-4` unten ist bewusst dasselbe Mass, das
              * `HighlightableTextArea` intern verwendet. Sonst verschiebt sich der
              * Text beim Umschalten um vier Pixel.
              *
              * Die Aufgabe, die dieser Rahmen frueher NICHT haben sollte — eine
              * ueberfluessige Ebene zu sein — erledigt inzwischen die Farbleiter:
              * grauer Behaelter, heller Block, Feld darin.
              */}
            <div className={cn(
                'relative min-h-[100px] w-full rounded-xl overflow-hidden border shadow-sm transition-colors',
                // Die Flaeche bleibt WEISS, auch beim Bearbeiten. Hier stand kurz
                // `bg-muted`, und das Feld sah dadurch aus wie abgeschaltet
                // (gemeldet am 08.09.2026): Eine graue Fuellung ist die uebliche
                // Anzeige fuer "nicht bedienbar". Ein Feld, in das man gerade
                // schreibt, muss heller sein als seine Umgebung, nicht dunkler.
                //
                // Den Modus sagen deshalb Rand und Ring — und der Ring liegt INNEN.
                //
                // Aussen lag er zuerst, und ein Scrollbehaelter mit nur rechtem
                // Innenabstand schnitt ihn links ab (gemeldet am 08.09.2026). Statt
                // an den Abstaenden jedes Behaelters zu drehen, in dem dieses Feld je
                // vorkommen kann, liegt der Ring jetzt innerhalb der eigenen Kante:
                // dort kann ihn per Konstruktion nichts beschneiden.
                //
                // Weder Rand noch Ring veraendern die Geometrie — Rahmenstaerke,
                // Radius und Innenabstand bleiben in beiden Zustaenden gleich.
                'bg-card',
                isEditing
                    ? 'border-primary/60 ring-2 ring-inset ring-primary/20'
                    : 'border-border/50 hover:border-primary/20'
            )}>
                {isEditing ? (
                    <HighlightableTextArea 
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder || "Inhalt hier eingeben..."}
                        className="min-h-[140px] border-none bg-transparent"
                    />
                ) : (
                    <div className="min-h-[140px] space-y-4 p-4">
                        {value.trim() || notizen ? (
                            <>
                                {technical ? (
                                    <Aufklapper
                                        titel={engine ? ENGINE_LABELS[engine] : 'Technische Detailanalyse einblenden'}
                                        beschreibung={engine ? ENGINE_BESCHREIBUNGEN[engine] : undefined}
                                        warnung={nichtNachgerechnet
                                            ? 'Nicht nachgerechnet — die Sandbox fand keinen Rechenausdruck. Die Punkte hat das Sprachmodell vergeben.'
                                            : undefined}
                                        ton="engine"
                                        icon={<Settings size={12} className="transition-transform duration-500 group-open:rotate-90" />}
                                    >
                                        {engine === 'CalcTrace' && <CalcTraceLegende />}
                                        <MathMarkdown content={technical} />
                                    </Aufklapper>
                                ) : notizen ? (
                                    // Nur wo keine Engine gerechnet hat, also bei Textaufgaben. Bei Rechen- und
                                    // Graphaufgaben liegen die Notizen zwar ebenfalls vor, bleiben aber bewusst
                                    // ungezeigt — der Engine-Beweis ist dort das Verlaesslichere, und zwei
                                    // Aufklapper uebereinander ueberladen die Karte.
                                    <Aufklapper
                                        titel="Notizen der KI zur Punktevergabe einblenden"
                                        ton="notizen"
                                        icon={<FileText size={12} />}
                                    >
                                        {/* Roher Text, kein Markdown: Der Notizzettel ist Fliesstext mit
                                            Zeilenumbruechen, den ein Markdown-Renderer zusammenziehen wuerde. */}
                                        <div className="whitespace-pre-wrap">{notizen}</div>
                                        <p className="mt-3 pt-3 border-t border-border text-muted-foreground/70 font-sans not-italic">
                                            Notizzettel des Modells, unredigiert — nicht für Schüler bestimmt.
                                        </p>
                                    </Aufklapper>
                                ) : null}
                                {pedagogical.trim() ? (
                                    <MathMarkdown content={pedagogical} />
                                ) : !technical && !notizen ? (
                                    <span className="text-muted-foreground/50 italic text-xs">
                                        {placeholder || "Kein Inhalt vorhanden."}
                                    </span>
                                ) : null}
                            </>
                        ) : (
                            <span className="text-muted-foreground/50 italic text-xs">
                                {placeholder || "Kein Inhalt vorhanden."}
                            </span>
                        )}
                    </div>
                )}
                
                {/* Save Indicator removed for cleaner UI as per user feedback */}
            </div>
        </div>
    );
};
