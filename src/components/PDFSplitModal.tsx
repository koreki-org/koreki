import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './ui/Button';
import { useDialogA11y, useEscapeKey } from '@/hooks/useDialogA11y';
import { useSeitenVorschau } from '@/hooks/useSeitenVorschau';
import { useStapelAufteilen } from '@/hooks/useStapelAufteilen';
import type { Aufteilung } from '@/lib/stapel-aufteilen';
import AufteilenWerkzeuge from './aufteilen/AufteilenWerkzeuge';
import SeitenPanel from './aufteilen/SeitenPanel';
import SeitenLeiste from './aufteilen/SeitenLeiste';

interface AufzuteilendeArbeit {
    name: string;
    pageCount?: number;
    pageRange?: [number, number];
    files?: File[];
}

interface PDFSplitModalProps {
    arbeit: AufzuteilendeArbeit;
    onClose: () => void;
    onSplit: (aufteilung: Aufteilung[]) => void;
}

const TITEL_ID = 'pdf-aufteilen-titel';

/** Pfeiltasten blaettern — ausser man tippt gerade in ein Feld. */
const tipptInFeld = (ziel: EventTarget | null): boolean =>
    ziel instanceof HTMLElement && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA');

/**
 * Die Schere: ein Sammel-PDF in einzelne Arbeiten teilen.
 * Man blaettert den Stapel einmal durch wie auf Papier — eine Seite gross genug
 * zum Lesen. Beginnt eine neue Arbeit, steht der Name gleich daneben. Der
 * Stapel muss dafuer nicht in der Reihenfolge der Klassenliste liegen.
 */
const PDFSplitModal: React.FC<PDFSplitModalProps> = ({ arbeit, onClose, onSplit }) => {
    const erste = arbeit.pageRange?.[0] ?? 1;
    const letzte = arbeit.pageRange?.[1] ?? erste + (arbeit.pageCount ?? 1) - 1;
    const zustand = useStapelAufteilen(erste, letzte);
    const vorschau = useSeitenVorschau(arbeit.files?.[0], erste, letzte, zustand.seite);
    const [fokusName, setFokusName] = useState(false);
    const { mounted, dialogRef } = useDialogA11y<HTMLDivElement>();
    useEscapeKey(true, onClose);

    if (!mounted) return null;
    const { seite, blaettern, stuecke } = zustand;
    const bild = vorschau.gross[seite] ?? vorschau.klein[seite];

    // Abgefangen, bevor die Taste beim Knopf ankommt: Enter darf nicht zusaetzlich den Knopf ausloesen, der
    // gerade den Fokus hat — nach einem Klick auf „Seite ›“ hiesse Enter sonst „weiterblaettern“.
    const beiTaste = (e: React.KeyboardEvent) => {
        if (tipptInFeld(e.target)) return;
        const aktion: Record<string, () => void> = {
            ArrowRight: blaettern.vor,
            ArrowLeft: blaettern.zurueck,
            Enter: zustand.enter,
            Delete: zustand.keinAnfangHier
        };
        const tun = aktion[e.key];
        if (!tun) return;
        e.preventDefault();
        setFokusName(false);
        tun();
    };

    const aufteilen = () => {
        onSplit(zustand.ergebnis());
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-overlay-in">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={TITEL_ID}
                tabIndex={-1}
                onKeyDownCapture={beiTaste}
                className="relative w-full max-w-6xl h-[92vh] bg-white rounded-hero p-6 shadow-glass border border-border animate-dialog-in overflow-hidden flex flex-col gap-4 focus:outline-none"
            >
                <div className="flex justify-between items-start gap-4 shrink-0">
                    <div>
                        <h2 id={TITEL_ID} className="text-xl font-bold text-foreground tracking-tight m-0">PDF aufteilen</h2>
                        <p className="text-sm text-muted-foreground m-0 mt-1">
                            {arbeit.name} · {letzte - erste + 1} Seiten. Blättere durch und markiere die erste Seite jeder Arbeit.
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Schließen" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="shrink-0">
                    <AufteilenWerkzeuge key={zustand.seitenJe ?? 'frei'} zustand={zustand} seitenGesamt={letzte - erste + 1} />
                </div>

                <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4 overflow-y-auto md:overflow-visible scrollbar-thin">
                    <div key={seite} className="h-[50vh] shrink-0 md:h-auto md:shrink md:flex-1 min-w-0 md:min-h-0 overflow-y-auto rounded-lg border border-border bg-muted scrollbar-thin">
                        {bild
                            ? <img src={bild} alt={`Seite ${seite - erste + 1}`} className="w-full" />
                            : <p className="p-6 text-sm text-muted-foreground m-0">
                                {vorschau.fehler ? 'Die Seitenbilder ließen sich nicht laden. Aufteilen geht trotzdem.' : 'Seite wird geladen …'}
                            </p>}
                    </div>
                    <div className="md:w-72 shrink-0 md:min-h-0 md:overflow-y-auto scrollbar-thin flex flex-col">
                        <SeitenPanel
                            zustand={zustand}
                            erste={erste}
                            letzte={letzte}
                            fokusName={fokusName}
                            weiterImTippen={() => { setFokusName(true); zustand.enter(); }}
                        />
                    </div>
                </div>

                <div className="shrink-0">
                    <SeitenLeiste
                        erste={erste}
                        letzte={letzte}
                        seite={seite}
                        stuecke={stuecke}
                        klein={vorschau.klein}
                        springeZu={(s) => { setFokusName(false); blaettern.zu(s); }}
                    />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border shrink-0">
                    <Button variant="outline" onClick={onClose} className="flex-1">Abbrechen</Button>
                    <Button onClick={aufteilen} className="flex-[2]">
                        In {stuecke.length} {stuecke.length === 1 ? 'Arbeit' : 'Arbeiten'} aufteilen
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PDFSplitModal;
