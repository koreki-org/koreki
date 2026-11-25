import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { stueckIndex } from '@/lib/stapel-aufteilen';
import type { StapelAufteilen } from '@/hooks/useStapelAufteilen';
import NamensFeld from './NamensFeld';

interface SeitenPanelProps {
    zustand: StapelAufteilen;
    erste: number;
    letzte: number;
    fokusName: boolean;
    /** Enter im Namensfeld: Vorschlag uebernehmen, weiter zur naechsten Arbeit und dort gleich ins Feld. */
    weiterImTippen: () => void;
}

const vergleich = (s: string) => s.trim().toLowerCase();

/**
 * Rechts neben der grossen Seite: Gehoert sie zur vorigen Arbeit oder beginnt
 * hier eine neue? Wenn neu, gleich der Name — man liest ihn ja gerade.
 */
const SeitenPanel: React.FC<SeitenPanelProps> = ({ zustand, erste, letzte, fokusName, weiterImTippen }) => {
    const { seite, stuecke, eingaben, blaettern } = zustand;
    const index = stueckIndex(stuecke, seite);
    const stueck = stuecke[index];
    const istAnfang = stueck.start === seite;
    const vergeben = stuecke.map(s => eingaben[s.start] ?? '').filter(e => e.trim() !== '');
    const eingabe = eingaben[stueck.start] ?? '';
    const doppelt = eingabe.trim() !== '' && vergeben.filter(v => vergleich(v) === vergleich(eingabe)).length > 1;

    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-sm text-muted-foreground m-0">Seite {seite - erste + 1} von {letzte - erste + 1}</p>
                <p className="text-lg font-semibold text-foreground m-0">
                    Arbeit {index + 1} von {stuecke.length}
                </p>
            </div>

            {istAnfang ? (
                <div className="flex flex-col gap-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary m-0">
                        <Scissors className="w-5 h-5" /> Arbeit {index + 1} beginnt hier
                    </p>
                    {seite !== erste && (
                        <Button variant="outline" size="sm" onClick={zustand.keinAnfangHier} className="justify-between">
                            Anfang entfernen <kbd className="text-xs text-muted-foreground font-sans">Entf</kbd>
                        </Button>
                    )}
                </div>
            ) : (
                <Button variant="outline" onClick={zustand.anfangHier} className="justify-between">
                    <span className="flex items-center gap-2"><Scissors className="w-5 h-5" /> Hier beginnt eine Arbeit</span>
                    <kbd className="text-xs text-muted-foreground font-sans">Enter</kbd>
                </Button>
            )}

            {istAnfang ? (
                <NamensFeld
                    key={stueck.start}
                    start={stueck.start}
                    nummer={index + 1}
                    eingabe={eingabe}
                    vergeben={vergeben}
                    doppelt={doppelt}
                    klassenliste={zustand.klassenliste}
                    setzeName={zustand.setzeName}
                    autoFocus={fokusName}
                    vorschlag={zustand.vorschlag[stueck.start]}
                    onEnter={weiterImTippen}
                />
            ) : (
                <p className="text-sm/relaxed text-muted-foreground m-0">
                    Gehört zu Arbeit {index + 1}{eingabe.trim() ? ` (${eingabe.trim()})` : ''}, Seite {seite - stueck.start + 1}.
                </p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-auto">
                <Button variant="outline" size="sm" onClick={blaettern.zurueck} disabled={seite === erste}>
                    <ChevronLeft className="w-5 h-5" /> Seite
                </Button>
                <Button variant="outline" size="sm" onClick={blaettern.vor} disabled={seite === letzte}>
                    Seite <ChevronRight className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="sm" onClick={blaettern.vorigeArbeit} disabled={seite === erste}>
                    <ChevronsLeft className="w-5 h-5" /> Arbeit
                </Button>
                <Button variant="outline" size="sm" onClick={blaettern.naechsteArbeit} disabled={index === stuecke.length - 1}>
                    Arbeit <ChevronsRight className="w-5 h-5" />
                </Button>
            </div>
            <p className="hidden md:block text-xs text-muted-foreground m-0">
                <strong>Enter</strong> auf der ersten Seite einer Arbeit: Vorschlag übernehmen
                und weiter. Auf jeder anderen Seite: hier beginnt eine Arbeit, die folgenden
                rücken mit. <strong>Entf</strong> nimmt einen Anfang weg. Pfeiltasten blättern.
            </p>
        </div>
    );
};

export default SeitenPanel;
