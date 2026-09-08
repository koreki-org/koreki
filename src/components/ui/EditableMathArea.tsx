import React, { useState } from 'react';
import { Pencil, Eye, Settings, FileText } from 'lucide-react';
import { MathMarkdown } from './MathMarkdown';
import { HighlightableTextArea } from './HighlightableTextArea';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import { ENGINE_LABELS, ENGINE_BESCHREIBUNGEN } from './feedback-engine-labels';
import { CalcTraceLegende } from './CalcTraceLegende';
import type { FeedbackEngine } from './feedback-engine-labels';
import { splitFeedback } from './feedback-split';
import { Aufklapper } from './FeedbackAufklapper';
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
    /** Festgeschrieben: kein Stift, kein Bearbeitungsmodus, nur Lesen. */
    gesperrt?: boolean;
}

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
    aiNotes,
    gesperrt = false
}) => {
    const [istOffen, setIstOffen] = useState(initialEditMode);
    // Die Sperre schlaegt den Zustand — sonst bliebe ein Feld bearbeitbar, das
    // waehrend der Bearbeitung festgeschrieben wurde.
    const isEditing = istOffen && !gesperrt;

    const { technical, engine, nichtNachgerechnet, pedagogical } = splitFeedback(value);
    const notizen = (aiNotes || '').trim();

    return (
        <div className={cn("relative group w-full", className)}>
            {/* Header / Actions */}
            <div className="flex items-center justify-between mb-2 px-4 min-h-[46px]">
                {leftAction ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {leftAction}
                    </div>
                ) : <div />}
                
                {/* Gar nicht erst gerendert, nicht nur per CSS versteckt: Ein
                    `hidden`-Schalter bleibt im Baum und per Tastatur erreichbar. */}
                {!gesperrt && (
                <div className="ml-auto flex items-center gap-1 opacity-30 group-hover:opacity-100 transition-all duration-300">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIstOffen(!istOffen)}
                        className={cn(
                            "h-7 w-7 rounded-lg transition-all",
                            isEditing ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        )}
                        title={isEditing ? "Vorschau anzeigen" : "Inhalt bearbeiten"}
                    >
                        {isEditing ? <Eye size={14} /> : <Pencil size={14} />}
                    </Button>
                </div>
                )}
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
                    <div className="space-y-4 p-4">
                        {value.trim() || notizen ? (
                            <>
                                {/*
                                  * Reihenfolge: erst die Rueckmeldung, dann der Beleg.
                                  *
                                  * Bis zum 09.09.2026 stand der Aufklapper oben. Damit lag ein
                                  * Bedienelement VOR der Aussage — das Auge musste an einer
                                  * zugeklappten Zeile vorbei, bevor es lesen konnte, was die KI
                                  * ueberhaupt sagt. Einen Beleg oeffnet man, wenn man zweifelt,
                                  * also nach der Aussage und nicht davor; das Vertrauens-Signal
                                  * traegt ohnehin schon der Chip in der Kopfzeile.
                                  */}
                                {pedagogical.trim() ? (
                                    <MathMarkdown content={pedagogical} />
                                ) : !technical && !notizen ? (
                                    <span className="text-muted-foreground/50 italic text-xs">
                                        {placeholder || "Kein Inhalt vorhanden."}
                                    </span>
                                ) : null}
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
