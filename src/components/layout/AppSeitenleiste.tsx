import React, { useEffect } from 'react';
import { PanelLeft, PlusCircle, Sparkles, FileUp, List } from 'lucide-react';
import { Button } from '../ui/Button';
import Logo from '../Logo';
import { cn } from '@/lib/utils';
import { useSeitenleisteStore } from '@/hooks/store/useSeitenleisteStore';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useAnsicht, useWechsleAnsicht } from '@/hooks/useFokusArbeit';
import { SeitenleisteArbeiten } from './SeitenleisteArbeiten';
import type { ProfilEintrag } from './profil-eintraege';

interface AppSeitenleisteProps {
    eintraege: ProfilEintrag[];
    onDemo: () => void;
    onImportieren: () => void;
    /** Konto-Zeile unten: Edition bzw. Credits, Hilfe, Einstellungen. */
    fuss: React.ReactNode;
}

/**
 * Die Seitenleiste nach dem Vorbild von Claude (ab `md`, 17.11.2026).
 *
 * Zugeklappt bleibt nur das Symbol oben links — die Pruefansicht bekommt die
 * volle Breite. Aufgeklappt traegt sie, was vorher die Kopfleiste trug: die
 * drei Aktionen, die vier Profil-Familien mit ihrem aktuellen Wert, die Arbeiten
 * und unten die Konto-Zeile. Sie SCHIEBT den Inhalt (wie bei Claude); zum
 * Korrigieren klappt man sie zu. Gemerkt wird der letzte Zustand.
 *
 * Kein Schatten, kein Glas: Die Leiste liegt neben dem Inhalt, nicht darueber.
 */
const zeile = "h-9 w-full justify-start gap-3 px-3 text-sm font-normal";

export const AppSeitenleiste: React.FC<AppSeitenleisteProps> = ({ eintraege, onDemo, onImportieren, fuss }) => {
    const { offen, setOffen, ladeGemerkt } = useSeitenleisteStore();
    useEffect(() => { ladeGemerkt(); }, [ladeGemerkt]);
    const ansicht = useAnsicht();
    const wechsle = useWechsleAnsicht();
    const anzahl = useBatchStore(s => s.batchFiles.length);
    const aktiv = (ja: boolean) => ja && "bg-primary/10 text-primary";

    const umschalter = (
        <Button variant="ghost" size="icon" onClick={() => setOffen(!offen)} aria-expanded={offen}
            aria-label={offen ? 'Seitenleiste schließen' : 'Seitenleiste öffnen'} title={offen ? 'Seitenleiste schließen' : 'Seitenleiste öffnen'}
            className="h-8 w-8 text-muted-foreground shrink-0">
            <PanelLeft size={18} />
        </Button>
    );

    if (!offen) return <div className="hidden md:block fixed top-3 left-2 z-20">{umschalter}</div>;

    return (
        <aside aria-label="Seitenleiste" className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-20 flex-col bg-card border-r border-border">
            <div className="flex items-center gap-2 px-2 pt-3 pb-2">
                {umschalter}
                <Logo showText={true} size={22} />
            </div>
            <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
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
            </nav>
            <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-2">{fuss}</div>
        </aside>
    );
};
