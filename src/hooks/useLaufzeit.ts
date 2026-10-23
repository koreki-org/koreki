import { useEffect, useState } from 'react';
import { formatiereLaufzeit } from '@/lib/restzeit';

/**
 * „läuft seit 0:45“ — tickt jede Sekunde, solange `seit` gesetzt ist.
 * ⏱️
 *
 * Geteilt von der Stapel-Anzeige und der Musterlösung. Die Uhr hängt am Beginn,
 * nicht am ganzen Fortschritt: jedes fertige Blatt erneuert den Zustand, die
 * Uhr soll dabei weiterlaufen.
 */
export function useLaufzeit(seit: number | undefined): string | null {
    const [jetzt, setJetzt] = useState(() => Date.now());

    useEffect(() => {
        if (seit === undefined) return;
        setJetzt(Date.now());
        const uhr = setInterval(() => setJetzt(Date.now()), 1000);
        return () => clearInterval(uhr);
    }, [seit]);

    return seit === undefined ? null : formatiereLaufzeit(jetzt - seit);
}
