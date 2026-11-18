import React from 'react';
import { PlusCircle, Sparkles, FileUp, List } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useAnsicht, useWechsleAnsicht } from '@/hooks/useFokusArbeit';
import { SeitenleisteArbeiten } from './SeitenleisteArbeiten';
import type { ProfilEintrag } from './profil-eintraege';

export interface SeitenleisteNavProps {
    eintraege: ProfilEintrag[];
    onDemo: () => void;
    onImportieren: () => void;
}

const zeile = "h-9 w-full justify-start gap-3 px-3 text-sm font-normal";

/**
 * Der Inhalt der Seitenleiste — EINMAL, fuer beide Formen (18.11.2026): neben
 * dem Inhalt ab `md`, als Schublade auf dem Handy. Zwei Kopien liefen frueher
 * oder spaeter auseinander, und dann haette das Handy andere Eintraege als der
 * Rechner.
 */
export const SeitenleisteNav: React.FC<SeitenleisteNavProps> = ({ eintraege, onDemo, onImportieren }) => {
    const ansicht = useAnsicht();
    const wechsle = useWechsleAnsicht();
    const anzahl = useBatchStore(s => s.batchFiles.length);
    const aktiv = (ja: boolean) => ja && "bg-primary/10 text-primary";

    return (
        <>
            <Button variant="ghost" onClick={() => wechsle('einrichtung')} className={cn(zeile, aktiv(ansicht === 'einrichtung'))}><PlusCircle size={16} /> Neue Korrektur</Button>
            {anzahl > 0 && <Button variant="ghost" onClick={() => wechsle('alle')} className={cn(zeile, aktiv(ansicht === 'alle'))}><List size={16} /> Alle Arbeiten<span className="ml-auto text-xs text-muted-foreground">{anzahl}</span></Button>}
            <Button variant="ghost" onClick={() => { wechsle('alle'); onDemo(); }} className={zeile}><Sparkles size={16} /> Demo</Button>
            <Button variant="ghost" onClick={onImportieren} className={zeile}><FileUp size={16} /> Importieren</Button>

            <p className="px-3 pt-4 pb-1 text-xs text-muted-foreground">Bewertung</p>
            {eintraege.map(e => (
                <Button key={e.schluessel} variant="ghost" onClick={e.onOeffnen} title={e.beschreibung}
                    className={cn(zeile, e.aktiv ? "text-primary" : "text-foreground")}>
                    <span className={cn("shrink-0", !e.aktiv && "text-muted-foreground")}>{e.icon}</span>
                    <span className="shrink-0">{e.label}</span>
                    <span className={cn("ml-auto truncate text-xs", e.aktiv ? "text-primary font-medium" : "text-muted-foreground")}>{e.wert}</span>
                </Button>
            ))}

            <SeitenleisteArbeiten />
        </>
    );
};
