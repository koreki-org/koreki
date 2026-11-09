import React, { useCallback, useState } from 'react';

/**
 * Ablagezone fuer Dateien.
 * 📥
 *
 * Die Mechanik — Standardverhalten unterbinden, Weiterreichen stoppen,
 * Hervorhebung schalten — stand in den drei Profil-Seitenleisten zeichengleich
 * dreimal da. Unterschiedlich war nur, was mit der Datei geschieht.
 *
 * Dass eine Regel mehrfach geschrieben wird, hat hier bereits Schaden
 * angerichtet: die Fehlerbehandlung beim Einlesen fehlte in zwei der drei
 * Kopien, und eine kaputte Datei brach den Vorgang still ab. Deshalb liegt die
 * Mechanik jetzt an einer Stelle, und die Seitenleisten geben nur noch an, was
 * mit der Datei passieren soll.
 *
 * Seit dem 09.11.2026 reicht die Zone ALLE abgelegten Dateien weiter, nicht nur
 * die erste. Schuelerarbeiten kommen stapelweise, und ein Stapel, von dem nur
 * das erste Blatt ankommt, waere schlimmer als gar keine Ablage: Der Verlust
 * faellt erst auf, wenn man die Liste zaehlt. Wer nur eine Datei verarbeiten
 * kann, nimmt sich `dateien[0]` — sichtbar an der Aufrufstelle.
 */

export interface FileDropZone {
    /** Wird eine Datei gerade ueber der Zone gehalten? */
    isDragging: boolean;
    /** Auf das umschliessende Element streuen. */
    dragProps: {
        onDragOver: (e: React.DragEvent) => void;
        onDragEnter: (e: React.DragEvent) => void;
        onDragLeave: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent) => void;
    };
    /**
     * An das `<input type="file">` haengen — der zweite Weg zu denselben Dateien.
     *
     * Lag zuvor als `handleFileChange` zeichengleich in jeder Seitenleiste, und
     * genau daran ist die CI gescheitert: Nachdem die Drag-Mechanik hierher
     * gewandert war, standen die verbliebenen Zeilen so dicht beieinander, dass
     * der Doppelungs-Waechter anschlug (9 statt der eingefrorenen 6).
     */
    onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function useFileDropZone(
    onFiles: (dateien: File[]) => void | Promise<void>
): FileDropZone {
    const [isDragging, setIsDragging] = useState(false);

    const halten = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const verlassen = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const ablegen = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const dateien = Array.from(e.dataTransfer.files ?? []);
        if (dateien.length === 0) return;

        await onFiles(dateien);
    }, [onFiles]);

    const auswaehlen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const dateien = Array.from(e.target.files ?? []);
        if (dateien.length === 0) return;

        await onFiles(dateien);
        // Zuruecksetzen, damit dieselbe Datei erneut gewaehlt werden kann. Ueber
        // das Ereignis statt ueber eine Referenz — so braucht die Seitenleiste
        // ihre `fileInputRef` nur noch zum Oeffnen des Dialogs.
        e.target.value = '';
    }, [onFiles]);

    return {
        isDragging,
        dragProps: {
            onDragOver: halten,
            onDragEnter: halten,
            onDragLeave: verlassen,
            onDrop: ablegen
        },
        onFileInputChange: auswaehlen
    };
}
