import React from 'react';
import { cn } from '@/lib/utils';
import { useFileDropZone } from '@/hooks/useFileDropZone';

/**
 * Die Flaeche, auf der eine Datei landet — per Klick oder per Ablegen.
 * 📥
 *
 * Bis zum 09.11.2026 nahmen die beiden Upload-Karten ausschliesslich Klicks an.
 * Sie SAHEN aus wie Ablageflaechen (gestrichelter Rand, Hochlade-Symbol, "laden"
 * im Text) und hiessen im Quelltext sogar `group/dropzone` — niemand fing das
 * Ablegen jedoch ab. Die Folge war nicht "nichts passiert": Ohne Abfang oeffnet
 * der Browser die fallengelassene Datei und verlaesst damit die Anwendung.
 * Schuelerdaten leben absichtlich nur im Arbeitsspeicher, eine laufende
 * Korrektur war danach weg.
 *
 * Zwei Auspraegungen, eine Mechanik:
 * - `gross` — die leere Karte, eine grosse gestrichelte Flaeche.
 * - sonst   — eine schmale Leiste unter bereits geladenem Inhalt.
 *
 * Warum ueberhaupt eine Leiste und kein Knopf in der Kopfzeile: Ein Klick
 * IRGENDWO auf eine gefuellte Karte darf nicht "ersetze die Musterloesung"
 * bedeuten — dort stehen Textfelder. Die Absicht braucht einen eigenen Ort,
 * und dieser Ort nimmt dann auch das Ablegen an.
 */

interface UploadAblageProps {
    /** Was mit den Dateien geschehen soll. */
    onFiles: (dateien: File[]) => void;
    /** Dateiarten fuer den Auswahldialog. */
    accept: string;
    /** Duerfen mehrere auf einmal kommen? */
    multiple?: boolean;
    /** Grosse Flaeche statt schmaler Leiste. */
    gross?: boolean;
    /** Nur bei `gross`: das Symbol ueber der Beschriftung. */
    icon?: React.ReactNode;
    titel: string;
    /**
     * Gesperrt — die Flaeche nimmt nichts an und sagt, warum.
     *
     * Wichtig: Das Ablegen wird trotzdem ABGEFANGEN. Eine gesperrte Flaeche,
     * die das Ereignis durchlaesst, waere schlimmer als gar keine — dann
     * oeffnet der Browser die Datei und die Sitzung ist hin.
     */
    gesperrt?: boolean;
    /** Der Satz, der die Sperre erklaert. Ohne ihn wirkt sie wie ein Fehler. */
    grund?: string;
    testId?: string;
}

export const UploadAblage: React.FC<UploadAblageProps> = ({
    onFiles, accept, multiple = false, gross = false, icon, titel,
    gesperrt = false, grund, testId
}) => {
    const eingabe = React.useRef<HTMLInputElement>(null);

    const annehmen = React.useCallback((dateien: File[]) => {
        if (gesperrt) return;
        onFiles(dateien);
    }, [gesperrt, onFiles]);

    const { isDragging, dragProps, onFileInputChange } = useFileDropZone(annehmen);

    const oeffnen = () => {
        if (gesperrt) return;
        eingabe.current?.click();
    };

    return (
        <div
            {...dragProps}
            onClick={oeffnen}
            role="button"
            tabIndex={gesperrt ? -1 : 0}
            aria-disabled={gesperrt}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    oeffnen();
                }
            }}
            title={gesperrt ? grund : undefined}
            className={cn(
                'border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center group/dropzone',
                gross
                    ? 'flex-1 rounded-hero p-8 min-h-[350px]'
                    : 'rounded-xl px-4 py-3 mt-4',
                gesperrt
                    ? 'border-border/40 bg-muted/10 cursor-not-allowed'
                    : 'border-border/60 bg-muted/20 cursor-pointer hover:bg-card/80 hover:border-primary/40',
                // Waehrend eine Datei ueber der Flaeche haengt, sagt der Rand zu.
                // Rand UND Flaeche — ein Schatten waere ein drittes Mittel fuer
                // dieselbe Aussage, und Inhalt traegt hoechstens `shadow-sm`.
                isDragging && !gesperrt && 'border-primary bg-primary/5'
            )}
        >
            <input
                data-testid={testId}
                type="file"
                accept={accept}
                multiple={multiple}
                ref={eingabe}
                onChange={onFileInputChange}
                disabled={gesperrt}
                hidden
            />
            {gross && icon && (
                <div className={cn(
                    'bg-card p-4 rounded-2xl shadow-sm border border-border mb-4 transition-all duration-300',
                    !gesperrt && 'group-hover/dropzone:scale-110 group-hover/dropzone:-translate-y-1 group-hover/dropzone:shadow-md'
                )}>
                    {icon}
                </div>
            )}
            <p className={cn(
                gross ? 'font-semibold' : 'text-xs font-bold',
                gesperrt
                    ? 'text-muted-foreground'
                    : 'text-foreground group-hover/dropzone:text-primary transition-colors'
            )}>
                {gesperrt && grund ? grund : titel}
            </p>
            {!gesperrt && (
                <p className={cn('text-muted-foreground', gross ? 'text-xs mt-1' : 'text-xxs mt-0.5')}>
                    Klicken oder Dateien hierher ziehen
                </p>
            )}
        </div>
    );
};
