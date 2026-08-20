import React, { useState } from 'react';
import { Play, RotateCcw, ScanLine } from 'lucide-react';
import { Button } from '../../ui/Button';
import { BatchFile } from '../../../types';
import { cn } from '@/lib/utils';

interface BatchItemRunActionsProps {
    item: BatchFile;
    idx: number;
    loading: boolean;
    isProcessing: boolean;
    onProcessSingleFile?: (idx: number) => void;
    onProcessSingleOCR?: (idx: number) => void;
    canRerunSingleOcr?: boolean;
}

type Ton = 'primary' | 'destruktiv' | 'gedaempft';

const TON_KLASSEN: Record<Ton, string> = {
    primary: 'border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white',
    destruktiv: 'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white',
    gedaempft: 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
};

interface LaufKnopfProps {
    titel: string;
    ton: Ton;
    beschriftung?: string;
    icon: React.ReactNode;
    onClick: () => void;
    onMouseLeave?: () => void;
}

/**
 * Ein Lauf-Knopf. Alle Zeilen-Aktionen, die etwas starten, tragen dieselbe Form
 * und stehen an derselben Stelle — nur die Toenung und der Hinweistext wechseln
 * mit dem Zustand.
 *
 * Beschriftet wird nur, wo angeleitet werden muss (Fehlerfall, Rueckfrage). Die
 * Routine-Zustaende wiederholen sich pro Zeile und bleiben deshalb leise.
 */
const LaufKnopf: React.FC<LaufKnopfProps> = ({ titel, ton, beschriftung, icon, onClick, onMouseLeave }) => (
    <Button
        variant="outline"
        size={beschriftung ? 'sm' : 'icon'}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onMouseLeave={onMouseLeave}
        title={titel}
        aria-label={titel}
        className={cn(
            'h-8 transition-all rounded-lg',
            beschriftung ? 'px-3 gap-2 text-xxs font-bold uppercase tracking-wider' : 'w-8',
            TON_KLASSEN[ton]
        )}
    >
        {icon}
        {beschriftung}
    </Button>
);

/**
 * BatchItemRunActions
 * 🏮 Die Lauf-Aktionen einer Stapelzeile — Bilderkennung und Korrektur.
 *
 * Vor dem 20.08.2026 lagen diese Aktionen in drei verschiedenen Formen an zwei
 * Stellen: zwei beschriftete Pillen im Inhaltsbereich, ein Symbol in der
 * Aktionsleiste. Fuer dieselbe Verb-Klasse ("lauf noch mal, fuer genau diese
 * Arbeit"). Sie wohnen jetzt gemeinsam in der Aktionsleiste, links vom
 * Papierkorb, in fester Reihenfolge.
 */
export const BatchItemRunActions: React.FC<BatchItemRunActionsProps> = ({
    item, idx, loading, isProcessing, onProcessSingleFile, onProcessSingleOCR, canRerunSingleOcr
}) => {
    const [ersetzenAngefragt, setErsetzenAngefragt] = useState(false);

    // Waehrend irgendein Lauf aktiv ist, bleibt die Zeile still: `processSingleFile`
    // registriert einen eigenen AbortController im Store und wuerde den laufenden
    // verdraengen (siehe useCorrectionRun). Das galt bisher nur fuer die eigene
    // Zeile (`isProcessing`) — der Stapel-Fall `loading` fehlte.
    if (loading || isProcessing) return null;

    const istFehler = item.status === 'error';

    const zeigeOcr = item.documentType === 'scanned'
        && (item.status === 'pending' || (istFehler && !item.ocrDone))
        && !!canRerunSingleOcr
        && !!onProcessSingleOCR;

    // Eine fertige Arbeit hat ihren Text bereits gehabt; nur die wartenden und
    // die fehlgeschlagenen muessen ihn noch vorweisen.
    const korrekturMoeglich = !!onProcessSingleFile
        && (item.status === 'done' || ((item.status === 'pending' || istFehler) && !!item.ocrDone));

    return (
        <>
            {zeigeOcr && (
                <LaufKnopf
                    titel={istFehler ? 'Bilderkennung wiederholen' : 'Nur diese Arbeit erkennen'}
                    ton={istFehler ? 'destruktiv' : 'primary'}
                    beschriftung={istFehler ? 'OCR neu starten' : undefined}
                    icon={istFehler ? <RotateCcw size={14} /> : <ScanLine size={14} />}
                    onClick={() => onProcessSingleOCR?.(idx)}
                />
            )}

            {korrekturMoeglich && item.status === 'pending' && (
                <LaufKnopf
                    titel="Nur diese Arbeit korrigieren"
                    ton="primary"
                    icon={<Play size={14} />}
                    onClick={() => onProcessSingleFile?.(idx)}
                />
            )}

            {korrekturMoeglich && istFehler && (
                <LaufKnopf
                    titel="Korrektur wiederholen"
                    ton="destruktiv"
                    beschriftung="Korrektur neu starten"
                    icon={<RotateCcw size={14} />}
                    onClick={() => onProcessSingleFile?.(idx)}
                />
            )}

            {/* Ein zweiter Lauf ersetzt `result` — und dort stehen auch die von Hand
                geaenderten Punkte und Rueckmeldungen. Die Rueckfrage steht deshalb im
                Knopf selbst: erst benennen, was verloren geht, dann laufen lassen. */}
            {korrekturMoeglich && item.status === 'done' && (
                <LaufKnopf
                    titel={ersetzenAngefragt ? 'Vorhandene Bewertung ersetzen' : 'Erneut korrigieren'}
                    ton={ersetzenAngefragt ? 'destruktiv' : 'gedaempft'}
                    beschriftung={ersetzenAngefragt ? 'Bewertung ersetzen?' : undefined}
                    icon={<RotateCcw size={14} />}
                    onMouseLeave={ersetzenAngefragt ? () => setErsetzenAngefragt(false) : undefined}
                    onClick={() => {
                        if (!ersetzenAngefragt) return setErsetzenAngefragt(true);
                        setErsetzenAngefragt(false);
                        onProcessSingleFile?.(idx);
                    }}
                />
            )}
        </>
    );
};
