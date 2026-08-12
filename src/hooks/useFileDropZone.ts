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
}

export function useFileDropZone(onFile: (file: File) => void | Promise<void>): FileDropZone {
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

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        await onFile(file);
    }, [onFile]);

    return {
        isDragging,
        dragProps: {
            onDragOver: halten,
            onDragEnter: halten,
            onDragLeave: verlassen,
            onDrop: ablegen
        }
    };
}
