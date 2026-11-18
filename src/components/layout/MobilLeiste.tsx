import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import Logo from '../Logo';
import { useSeitenleisteStore } from '@/hooks/store/useSeitenleisteStore';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useAnsicht } from '@/hooks/useFokusArbeit';
import { useDialogA11y, useEscapeKey } from '@/hooks/useDialogA11y';
import { SeitenleisteNav, type SeitenleisteNavProps } from './SeitenleisteNav';

interface MobilLeisteProps extends SeitenleisteNavProps {
    fuss: React.ReactNode;
}

const TITEL = { einrichtung: 'Einrichtung', alle: 'Alle Arbeiten' } as const;

/**
 * Die Seitenleiste auf dem Handy (unter `md`, 18.11.2026) — nach dem Vorbild
 * der Claude-App: oben eine schmale Kopfzeile mit ☰ und dem Namen der Ansicht,
 * die Leiste selbst als Schublade, die sich UEBER den Inhalt legt.
 *
 * Vorher stand hier eine schwebende Glasleiste mit vier Profil-Symbolen und
 * darunter auf jeder Ansicht Logo und drei Knoepfe — rund 200 px, bevor die
 * Arbeit anfing. Jetzt traegt die Schublade dieselben Eintraege wie am Rechner
 * (`SeitenleisteNav`).
 *
 * Die Schublade schliesst sich, sobald ein Eintrag gewaehlt ist: Sie liegt ueber
 * dem Inhalt, und wer eine Arbeit oeffnet, will die Arbeit sehen. Die Fusszeile
 * (Hilfe, Einstellungen) schliesst sie bewusst NICHT — das Hilfemenue klappt in
 * der Schublade selbst auf. Ebene `z-[1000]`: unter den Dialogen, die aus ihr
 * heraus aufgehen (ab `z-[2000]`).
 */
export const MobilLeiste: React.FC<MobilLeisteProps> = ({ fuss, ...nav }) => {
    const offen = useSeitenleisteStore(s => s.mobilOffen);
    const setOffen = useSeitenleisteStore(s => s.setMobilOffen);
    const ansicht = useAnsicht();
    const arbeit = useBatchStore(s => s.aufgeklappteArbeit !== null ? s.batchFiles[s.aufgeklappteArbeit]?.name : undefined);
    const { mounted, dialogRef } = useDialogA11y<HTMLElement>(offen);
    const schliessen = useCallback(() => setOffen(false), [setOffen]);
    useEscapeKey(offen, schliessen);

    const titel = ansicht === 'arbeit' ? arbeit : TITEL[ansicht];
    // Ein gewaehlter Eintrag schliesst die Schublade; die Aktion selbst laeuft ungestoert weiter.
    const nachWahl = (e: React.MouseEvent) => { if ((e.target as HTMLElement).closest('button')) schliessen(); };

    return (
        <>
            <div className="md:hidden h-12" aria-hidden="true" />
            <div className="md:hidden fixed top-0 inset-x-0 z-30 h-12 flex items-center gap-2 px-2 bg-card border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => setOffen(true)} aria-label="Menü öffnen" aria-expanded={offen} className="h-9 w-9 text-muted-foreground shrink-0">
                    <Menu size={20} />
                </Button>
                <Logo showText={true} size={20} />
                {titel && <span className="min-w-0 truncate text-sm text-muted-foreground">· {titel}</span>}
            </div>

            {mounted && offen && createPortal(
                <div className="md:hidden fixed inset-0 z-[1000]">
                    <button type="button" aria-label="Menü schließen" onClick={schliessen} className="absolute inset-0 w-full h-full bg-foreground/40 animate-overlay-in cursor-default" />
                    <aside ref={dialogRef} role="dialog" aria-modal="true" aria-label="Menü"
                        className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] flex flex-col bg-card border-r border-border animate-overlay-in">
                        <div className="flex items-center gap-2 px-2 pt-2 pb-2">
                            <Button variant="ghost" size="icon" onClick={schliessen} aria-label="Menü schließen" className="h-9 w-9 text-muted-foreground shrink-0">
                                <X size={20} />
                            </Button>
                            <Logo showText={true} size={22} />
                        </div>
                        <nav onClick={nachWahl} className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                            <SeitenleisteNav {...nav} />
                        </nav>
                        <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-2">{fuss}</div>
                    </aside>
                </div>,
                document.body
            )}
        </>
    );
};
