import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { anzeigeName, freieNamen, namensAusEingabe, SchuelerName } from '@/lib/stapel-aufteilen';

interface NamensFeldProps {
    start: number;
    nummer: number;
    eingabe: string;
    vergeben: string[];
    doppelt: boolean;
    klassenliste: SchuelerName[];
    setzeName: (start: number, text: string) => void;
    autoFocus: boolean;
    /** Enter: offenen Vorschlag uebernehmen und zur naechsten Arbeit — derselbe Weg wie Enter im Fenster. */
    onEnter: () => void;
    /** Naechster Name aus der Listenreihenfolge. Gilt erst, wenn er uebernommen ist. */
    vorschlag?: SchuelerName;
}

const gleich = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Name einer Arbeit. Drei Zustaende, die man auf einen Blick unterscheiden muss
 * (Rueckmeldung 25.11.2026: ein grauer Platzhalter sah aus wie ein Eintrag):
 * - offener Vorschlag: farbiger Knopf unter einem sichtbar LEEREN Feld,
 * - uebernommen: Name im Feld, gruener Haken,
 * - frei getippt, aber nicht in der Liste: gelber Hinweis.
 */
const NamensFeld: React.FC<NamensFeldProps> = ({ start, nummer, eingabe, vergeben, doppelt, klassenliste, setzeName, autoFocus, onEnter, vorschlag }) => {
    const listId = `namen-arbeit-${start}`;
    const leer = !eingabe.trim();
    const offenerVorschlag = leer && vorschlag ? anzeigeName(vorschlag) : null;
    const treffer = !leer && klassenliste.length > 0 ? namensAusEingabe(eingabe, klassenliste) : null;
    const inListe = !!treffer && klassenliste.some(n => gleich(anzeigeName(n), anzeigeName(treffer)));

    return (
        <div className="flex flex-col gap-1.5">
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

            {offenerVorschlag && (
                <Button variant="chip" size="sm" onClick={onEnter} className="justify-between h-auto py-2 text-left">
                    <span>Vorschlag übernehmen: <strong>{offenerVorschlag}</strong></span>
                    <kbd className="text-xs font-sans">Enter</kbd>
                </Button>
            )}
            {doppelt && <span className="text-xs text-destructive">Dieser Name ist doppelt vergeben.</span>}
            {!doppelt && inListe && (
                <span className="flex items-center gap-1 text-xs text-success"><Check className="w-5 h-5" /> Aus der Klassenliste</span>
            )}
            {!doppelt && !leer && klassenliste.length > 0 && !inListe && (
                <span className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="w-5 h-5" /> Nicht in der Klassenliste</span>
            )}
        </div>
    );
};

export default NamensFeld;
