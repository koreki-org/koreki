import React, { useState } from 'react';
import { Pencil, Check, Eye, ChevronDown, Settings, FileText } from 'lucide-react';
import { MathMarkdown } from './MathMarkdown';
import { HighlightableTextArea } from './HighlightableTextArea';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import { ENGINE_LABELS, ENGINE_BESCHREIBUNGEN } from './feedback-engine-labels';
import { CalcTraceLegende } from './CalcTraceLegende';
import type { FeedbackEngine } from './feedback-engine-labels';
export type { FeedbackEngine };

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

const TON: Record<AufklapperTon, { rahmen: string; flaeche: string; schrift: string; anriss: string; marke: string; trenner: string }> = {
    engine: {
        rahmen: 'border-primary/20',
        flaeche: 'bg-primary/5',
        schrift: 'text-primary',
        anriss: 'hover:bg-primary/10',
        marke: 'bg-primary/15 text-primary',
        trenner: 'border-primary/10'
    },
    notizen: {
        rahmen: 'border-border',
        flaeche: 'bg-muted/40',
        schrift: 'text-muted-foreground',
        anriss: 'hover:bg-muted/60',
        marke: 'bg-muted text-muted-foreground',
        trenner: 'border-border'
    }
};

const Aufklapper: React.FC<{
    titel: string;
    beschreibung?: string;
    ton: AufklapperTon;
    icon: React.ReactNode;
    children: React.ReactNode;
}> = ({ titel, beschreibung, ton, icon, children }) => {
    const t = TON[ton];
    return (
        <details className={cn('group rounded-xl border overflow-hidden transition-all duration-300 mb-4', t.rahmen, t.flaeche)}>
            <summary className={cn(
                'flex items-center justify-between p-3.5 cursor-pointer list-none select-none text-xs font-bold transition-all [&::-webkit-details-marker]:hidden',
                t.schrift, t.anriss
            )}>
                <div className="flex items-start gap-2.5 min-w-0">
                    <div className={cn('flex items-center justify-center w-5 h-5 rounded-md shrink-0', t.marke)}>{icon}</div>
                    <div className="min-w-0">
                        <span>{titel}</span>
                        {beschreibung && (
                            <p className="mt-0.5 font-normal text-muted-foreground">{beschreibung}</p>
                        )}
                    </div>
                </div>
                <ChevronDown size={14} className={cn('transition-transform duration-300 group-open:rotate-180', t.schrift)} />
            </summary>
            <div className={cn('border-t p-4 bg-background/30 text-xs leading-relaxed font-mono', t.trenner)}>
                {children}
            </div>
        </details>
    );
};

interface SplitFeedback {
    technical?: string;
    /** Nur gesetzt, wenn `technical` vorhanden ist. */
    engine?: FeedbackEngine;
    pedagogical: string;
}

/**
 * Parses and splits raw feedback text into technical engine blocks (PANG/AGS)
 * and didactical/pedagogical feedback.
 */
export function splitFeedback(text: string): SplitFeedback {
    if (!text) return { pedagogical: "" };

    const pangIndex = text.indexOf('[⚙️ PANG Engine');
    const agsIndex = text.indexOf('[⚙️ AGS Engine');
    const calcIndex = text.indexOf('[📐 CalcTrace Engine');
    
    let engineIndex = -1;
    let engine: FeedbackEngine | undefined;
    if (pangIndex !== -1) {
        engineIndex = pangIndex;
        engine = 'PANG';
    } else if (agsIndex !== -1) {
        engineIndex = agsIndex;
        engine = 'AGS';
    } else if (calcIndex !== -1) {
        engineIndex = calcIndex;
        engine = 'CalcTrace';
    }

    if (engineIndex === -1) {
        return { pedagogical: text };
    }

    const remainingText = text.slice(engineIndex);
    
    // Look for a standalone divider to split technical from pedagogical feedback
    // We must include newlines so we don't accidentally split markdown tables (|:---|)
    const dividerIndex = remainingText.indexOf('\n---\n');
    
    let technical = "";
    let pedagogical = "";

    if (dividerIndex !== -1) {
        technical = remainingText.slice(0, dividerIndex).trim();
        let afterDivider = remainingText.slice(dividerIndex + 5).trim();
        if (afterDivider.startsWith('[KI-Pädagogische Einschätzung]')) {
            afterDivider = afterDivider.slice('[KI-Pädagogische Einschätzung]'.length).trim();
        }
        pedagogical = afterDivider;
    } else {
        const kiIndex = remainingText.indexOf('[KI-Pädagogische Einschätzung]');
        if (kiIndex !== -1) {
            technical = remainingText.slice(0, kiIndex).trim();
            pedagogical = remainingText.slice(kiIndex + '[KI-Pädagogische Einschätzung]'.length).trim();
        } else {
            technical = remainingText.trim();
            pedagogical = "";
        }
    }

    const prefix = text.slice(0, engineIndex).trim();
    if (prefix) {
        pedagogical = prefix + "\n\n" + pedagogical;
    }

    return {
        technical: technical || undefined,
        engine: technical ? engine : undefined,
        pedagogical: pedagogical
    };
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
    aiNotes
}) => {
    const [isEditing, setIsEditing] = useState(initialEditMode);

    const { technical, engine, pedagogical } = splitFeedback(value);
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

            {/* Content Area */}
            <div className="relative min-h-[100px] w-full rounded-xl overflow-hidden border border-border/50 bg-background hover:border-primary/20 transition-all shadow-sm">
                {isEditing ? (
                    <HighlightableTextArea 
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder || "Inhalt hier eingeben..."}
                        className="min-h-[140px] border-none bg-transparent"
                    />
                ) : (
                    <div className="p-5 min-h-[140px] space-y-4">
                        {value.trim() || notizen ? (
                            <>
                                {technical ? (
                                    <Aufklapper
                                        titel={engine ? ENGINE_LABELS[engine] : 'Technische Detailanalyse einblenden'}
                                        beschreibung={engine ? ENGINE_BESCHREIBUNGEN[engine] : undefined}
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
