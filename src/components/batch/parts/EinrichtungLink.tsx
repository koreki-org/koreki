import React from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useWechsleAnsicht } from '@/hooks/useFokusArbeit';

/**
 * Weg zur Einrichtung (Musterloesung, Arbeiten nachladen) — nur auf dem Handy.
 *
 * Ab `md` fuehrt "Neue Korrektur" in der Seitenleiste dorthin; ein zweiter Knopf
 * waere doppelt. Auf dem Handy gibt es die Seitenleiste nicht (17.11.2026).
 */
export const EinrichtungLink: React.FC = () => {
    const wechsle = useWechsleAnsicht();
    return (
        <Button variant="ghost" size="sm" onClick={() => wechsle('einrichtung')} className="md:hidden ml-auto h-7 gap-1 px-2 text-xs shrink-0">
            <Settings2 size={13} /> Einrichtung
        </Button>
    );
};
