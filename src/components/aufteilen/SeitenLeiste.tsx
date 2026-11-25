import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import type { Stueck } from '@/lib/stapel-aufteilen';

interface SeitenLeisteProps {
    erste: number;
    letzte: number;
    seite: number;
    stuecke: Stueck[];
    klein: Record<number, string>;
    springeZu: (seite: number) => void;
}

/**
 * Schmale Uebersicht unter der grossen Seite: Wo sitzen die Schnitte, wo bin ich?
 * Zum Lesen sind die Bilder zu klein — dafuer ist die grosse Seite da.
 */
const SeitenLeiste: React.FC<SeitenLeisteProps> = ({ erste, letzte, seite, stuecke, klein, springeZu }) => {
    const aktuellRef = useRef<HTMLButtonElement | null>(null);
    useEffect(() => {
        aktuellRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [seite]);

    const seiten = Array.from({ length: letzte - erste + 1 }, (_, i) => erste + i);
    const arbeitAb = new Map(stuecke.map((s, i) => [s.start, i + 1]));

    return (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin" aria-label="Alle Seiten">
            {seiten.map(s => {
                const arbeit = arbeitAb.get(s);
                const aktuell = s === seite;
                return (
                    <Button
                        key={s}
                        ref={aktuell ? aktuellRef : undefined}
                        variant="ghost"
                        aria-current={aktuell ? 'page' : undefined}
                        aria-label={arbeit ? `Seite ${s - erste + 1}, Beginn von Arbeit ${arbeit}` : `Seite ${s - erste + 1}`}
                        onClick={() => springeZu(s)}
                        className={`relative h-auto w-12 shrink-0 p-0 rounded-md border-2 overflow-hidden ${aktuell ? 'border-foreground' : arbeit ? 'border-primary' : 'border-transparent'}`}
                    >
                        <div className="aspect-[1/1.414] w-full bg-muted">
                            {klein[s] && <img src={klein[s]} alt="" className="w-full h-full object-cover" />}
                        </div>
                        {arbeit && (
                            <span className="absolute top-0 left-0 rounded-br-md bg-primary px-1 text-xs font-semibold text-primary-foreground">
                                {arbeit}
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    );
};

export default SeitenLeiste;
