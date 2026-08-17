import React from 'react';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { Slider } from '@/components/ui/Slider';

/**
 * Ein Regler fuer einen KI-Parameter.
 *
 * Der Block stand achtmal in AiProfileModules — viermal fuer die Korrektur,
 * viermal fuer die Texterkennung — und unterschied sich nur in Beschriftung,
 * Wertebereich und Formatierung. Als eigene Komponente aendert man Aussehen
 * und Verhalten aller acht an einer Stelle.
 */
interface ParameterSliderProps {
    label: string;
    tooltipTitle: string;
    tooltipContent: string;
    value: number;
    onChange: (value: number) => void;
    min: string;
    max: string;
    step: string;
    /**
     * Nachkommastellen der Anzeige. Ohne Angabe wird ganzzahlig gelesen und
     * mit Tausendertrennung angezeigt — die Token-Regler brauchen das, die
     * uebrigen eine feste Zahl an Nachkommastellen.
     */
    decimals?: number;
    /** Was der Wert praktisch bedeutet. Steht links unter dem Regler. */
    description: React.ReactNode;
    /** Empfohlener Wert. Steht rechts unter dem Regler. */
    defaultHint: React.ReactNode;
}

export const ParameterSlider: React.FC<ParameterSliderProps> = ({
    label,
    tooltipTitle,
    tooltipContent,
    value,
    onChange,
    min,
    max,
    step,
    decimals,
    description,
    defaultHint
}) => {
    const istGanzzahlig = decimals === undefined;
    const anzeige = istGanzzahlig ? value.toLocaleString() : value.toFixed(decimals);

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">{label}</label>
                    <KorekiTooltip
                        title={tooltipTitle}
                        content={tooltipContent}
                        buttonClassName="h-6 w-6"
                        iconSize={14}
                        align="left"
                    />
                </div>
                <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded-md text-foreground">{anzeige}</span>
            </div>
            <Slider
                min={min} max={max} step={step}
                value={value}
                integer={istGanzzahlig}
                onValueChange={onChange}
            />
            <div className="flex justify-between items-center text-xxs text-muted-foreground font-semibold leading-relaxed">
                <span>{description}</span>
                <span className="text-xxs text-muted-foreground font-medium">Standard: {defaultHint}</span>
            </div>
        </div>
    );
};
