import React from 'react';
import { Input } from '@/components/ui/Input';
import { anzeigeName, freieNamen, SchuelerName } from '@/lib/stapel-aufteilen';

interface NamensFeldProps {
    start: number;
    nummer: number;
    eingabe: string;
    vergeben: string[];
    doppelt: boolean;
    klassenliste: SchuelerName[];
    setzeName: (start: number, text: string) => void;
    autoFocus: boolean;
    /** Enter springt zur naechsten Arbeit — so tippt man die Klasse in einem Zug durch. */
    onEnter: () => void;
}

/**
 * Name einer Arbeit. Mit Klassenliste schlaegt das Feld nur Namen vor, die
 * noch frei sind; freie Eingabe geht immer.
 */
const NamensFeld: React.FC<NamensFeldProps> = ({ start, nummer, eingabe, vergeben, doppelt, klassenliste, setzeName, autoFocus, onEnter }) => {
    const listId = `namen-arbeit-${start}`;
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={`${listId}-feld`} className="text-sm font-semibold text-foreground">
                Name für Arbeit {nummer}
            </label>
            <Input
                id={`${listId}-feld`}
                list={listId}
                value={eingabe}
                placeholder={klassenliste.length > 0 ? 'Erste Buchstaben …' : 'Name …'}
                autoComplete="off"
                autoFocus={autoFocus}
                onChange={(e) => setzeName(start, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }}
                className={doppelt ? 'border-destructive' : undefined}
            />
            <datalist id={listId}>
                {freieNamen(klassenliste, vergeben, eingabe).map(n => (
                    <option key={anzeigeName(n)} value={anzeigeName(n)} />
                ))}
            </datalist>
            {doppelt && <span className="text-xs text-destructive">Dieser Name ist doppelt vergeben.</span>}
        </div>
    );
};

export default NamensFeld;
