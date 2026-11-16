import React from 'react';
import { useZipPruefStore } from '@/lib/zip-pruefung';
import { ZipPruefDialog } from './upload/ZipPruefDialog';

/**
 * Zeigt das Fenster „Abgaben pruefen", sobald ein ZIP-Upload darauf wartet
 * (`pruefeZipAbgaben`). Einmal in `_app.tsx` eingehaengt, wie `ConfirmationHost`.
 * Der `key` sorgt dafuer, dass ein neues ZIP mit frischer Auswahl beginnt.
 */
export const ZipPruefHost: React.FC = () => {
    const befund = useZipPruefStore(state => state.befund);
    const beantworte = useZipPruefStore(state => state.beantworte);
    if (!befund) return null;
    return (
        <ZipPruefDialog
            key={`${befund.quelle}:${befund.prueflinge.length}`}
            befund={befund}
            onUebernehmen={auswahl => beantworte(auswahl)}
            onAbbrechen={() => beantworte(null)}
        />
    );
};
