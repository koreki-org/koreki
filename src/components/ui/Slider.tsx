import React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
    value: number;
    /** Bekommt den bereits gelesenen Zahlenwert, nicht das Ereignis. */
    onValueChange: (value: number) => void;
    /**
     * Ganzzahlig lesen statt als Kommawert.
     *
     * Bewusst hier und nicht beim Aufrufer: ein Regler fuer Token-Anzahlen muss
     * eine Ganzzahl liefern. Stand die Entscheidung beim Aufrufer, hiess das
     * `parseInt` an der einen und `parseFloat` an der anderen Stelle — und ein
     * Kommawert, der versehentlich durchrutscht, landet im Profil und spaeter
     * in der Anfrage an den Anbieter.
     */
    integer?: boolean;
}

/**
 * Schieberegler des Koreki-UI-Kits.
 *
 * Der Style Guide verlangt, dass UI-Elemente aus @/components/ui/ stammen — fuer
 * Regler gab es bis hierhin aber keine Entsprechung, sodass die Regel dort
 * nicht erfuellbar war. Diese Komponente schliesst die Luecke.
 */
const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, value, onValueChange, integer = false, ...props }, ref) => (
        <input
            type="range"
            value={value}
            onChange={(e) => onValueChange(integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value))}
            className={cn(
                'w-full accent-primary bg-muted h-1.5 rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all',
                className
            )}
            ref={ref}
            {...props}
        />
    )
);
Slider.displayName = 'Slider';

export { Slider };
