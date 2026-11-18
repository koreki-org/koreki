import React, { useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import Logo from '../Logo';
import { useSeitenleisteStore } from '@/hooks/store/useSeitenleisteStore';
import { SeitenleisteNav, type SeitenleisteNavProps } from './SeitenleisteNav';
import { MobilLeiste } from './MobilLeiste';

interface AppSeitenleisteProps extends SeitenleisteNavProps {
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
 * Auf dem Handy wird dieselbe Leiste zur Schublade (`MobilLeiste`).
 */
export const AppSeitenleiste: React.FC<AppSeitenleisteProps> = ({ fuss, ...nav }) => {
    const { offen, setOffen, ladeGemerkt } = useSeitenleisteStore();
    useEffect(() => { ladeGemerkt(); }, [ladeGemerkt]);

    const umschalter = (
        <Button variant="ghost" size="icon" onClick={() => setOffen(!offen)} aria-expanded={offen}
            aria-label={offen ? 'Seitenleiste schließen' : 'Seitenleiste öffnen'} title={offen ? 'Seitenleiste schließen' : 'Seitenleiste öffnen'}
            className="h-8 w-8 text-muted-foreground shrink-0">
            <PanelLeft size={18} />
        </Button>
    );

    return (
        <>
            <MobilLeiste {...nav} fuss={fuss} />
            {!offen ? <div className="hidden md:block fixed top-3 left-2 z-20">{umschalter}</div> : (
                <aside aria-label="Seitenleiste" className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-20 flex-col bg-card border-r border-border">
                    <div className="flex items-center gap-2 px-2 pt-3 pb-2">
                        {umschalter}
                        <Logo showText={true} size={22} />
                    </div>
                    <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                        <SeitenleisteNav {...nav} />
                    </nav>
                    <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-2">{fuss}</div>
                </aside>
            )}
        </>
    );
};
