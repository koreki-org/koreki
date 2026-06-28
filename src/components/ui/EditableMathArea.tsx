import React, { useState } from 'react';
import { Pencil, Check, Eye, ChevronDown, Settings } from 'lucide-react';
import { MathMarkdown } from './MathMarkdown';
import { HighlightableTextArea } from './HighlightableTextArea';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface EditableMathAreaProps {
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
    className?: string;
    initialEditMode?: boolean;
    label?: string;
    leftAction?: React.ReactNode;
}

interface SplitFeedback {
    technical?: string;
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
    if (pangIndex !== -1) {
        engineIndex = pangIndex;
    } else if (agsIndex !== -1) {
        engineIndex = agsIndex;
    } else if (calcIndex !== -1) {
        engineIndex = calcIndex;
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
    leftAction
}) => {
    const [isEditing, setIsEditing] = useState(initialEditMode);

    const { technical, pedagogical } = splitFeedback(value);

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
            <div className="relative min-h-[100px] w-full rounded-xl overflow-hidden border border-border/50 bg-background/50 hover:border-primary/20 transition-all shadow-sm">
                {isEditing ? (
                    <HighlightableTextArea 
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder || "Inhalt hier eingeben..."}
                        className="min-h-[140px] border-none bg-transparent"
                    />
                ) : (
                    <div className="p-5 min-h-[140px] space-y-4">
                        {value.trim() ? (
                            <>
                                {technical && (
                                    <details className="group border border-primary/20 dark:border-primary/20 rounded-xl bg-primary/5 dark:bg-primary/5 overflow-hidden transition-all duration-300 mb-4">
                                        <summary className="flex items-center justify-between p-3.5 cursor-pointer list-none select-none text-xs font-bold text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/10 transition-all [&::-webkit-details-marker]:hidden">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/15 dark:bg-primary/15 text-primary dark:text-primary">
                                                    <Settings size={12} className="transition-transform duration-500 group-open:rotate-90" />
                                                </div>
                                                <span>Technische PANG-Detailanalyse einblenden</span>
                                            </div>
                                            <ChevronDown size={14} className="text-primary dark:text-primary transition-transform duration-300 group-open:rotate-180" />
                                        </summary>
                                        <div className="border-t border-primary/10 dark:border-primary/10 p-4 bg-background/30 text-xs leading-relaxed font-mono">
                                            <MathMarkdown content={technical} />
                                        </div>
                                    </details>
                                )}
                                {pedagogical.trim() ? (
                                    <MathMarkdown content={pedagogical} />
                                ) : !technical ? (
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
