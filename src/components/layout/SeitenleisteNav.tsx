import React from 'react';
import { PlusCircle, Sparkles, FolderOpen, List, Settings2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { useAnsicht, useWechsleAnsicht } from '@/hooks/useFokusArbeit';
import { SeitenleisteArbeiten } from './SeitenleisteArbeiten';
import { DemoMenu } from './DemoMenu';
import { useSeitenleisteStore } from '@/hooks/store/useSeitenleisteStore';
import type { DemoArt } from '@/lib/demo/demoHandschrift';
import type { ProfilEintrag } from './profil-eintraege';

export interface SeitenleisteNavProps {
    eintraege: ProfilEintrag[];
    onDemo: (art: DemoArt) => void;
    onImportieren: () => void;
    /** Wie „Neu“ in Word: fragt, sobald etwas verloren gehen kann (`useNeueKorrektur`). */
    onNeueKorrektur: () => void;
}

const zeile = "h-9 w-full justify-start gap-3 px-3 text-sm font-normal";

/**
 * Der Inhalt der Seitenleiste — EINMAL, fuer beide Formen (18.11.2026): neben
 * dem Inhalt ab `md`, als Schublade auf dem Handy. Zwei Kopien liefen frueher
 * oder spaeter auseinander, und dann haette das Handy andere Eintraege als der
 * Rechner.
 */
export const SeitenleisteNav: React.FC<SeitenleisteNavProps> = ({ eintraege, onDemo, onImportieren, onNeueKorrektur }) => {
    const ansicht = useAnsicht();
    const wechsle = useWechsleAnsicht();
    const anzahl = useBatchStore(s => s.batchFiles.length);
    const hatMusterloesung = useDashboardStore(d => !!d.modelSolution);
    // Die Einrichtung einer laufenden Korrektur hat einen eigenen Eintrag
    // (21.11.2026): Musterloesung ansehen, Arbeiten nachladen. „Neue Korrektur“
    // ist seitdem wirklich neu und fragt vorher.
    const laeuft = anzahl > 0 || hatMusterloesung;
    const aktiv = (ja: boolean) => ja && "bg-primary/10 text-primary";
    // Das Menue faengt seine Klicks ab — die Schublade schliesst deshalb hier, nicht ueber das Klick-Ereignis.
    const schliesseSchublade = useSeitenleisteStore(s => s.setMobilOffen);

    return (
        <>
            <Button variant="ghost" onClick={onNeueKorrektur} className={cn(zeile, aktiv(!laeuft && ansicht === 'einrichtung'))}><PlusCircle size={16} /> Neue Korrektur</Button>
            {laeuft && <Button variant="ghost" onClick={() => wechsle('einrichtung')} className={cn(zeile, aktiv(ansicht === 'einrichtung'))}><Settings2 size={16} /> Einrichtung</Button>}
            {anzahl > 0 && <Button variant="ghost" onClick={() => wechsle('alle')} className={cn(zeile, aktiv(ansicht === 'alle'))}><List size={16} /> Alle Arbeiten<span className="ml-auto text-xs text-muted-foreground">{anzahl}</span></Button>}
            <DemoMenu onDemo={(art) => { wechsle('alle'); schliesseSchublade(false); onDemo(art); }}
                className="w-full" triggerClassName={cn(zeile, "rounded-md hover:bg-foreground/5")} trigger={<><Sparkles size={16} /> Demo</>} />
            <Button variant="ghost" onClick={onImportieren} className={zeile}><FolderOpen size={16} /> Öffnen</Button>

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
