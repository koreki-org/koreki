import React from 'react';
import { FileText } from 'lucide-react';
import { BatchFile } from '../../../types';
import { cn } from '@/lib/utils';

/**
 * Der Original-Scan der Schuelerarbeit.
 * 🔎
 *
 * Am 08.09.2026 aus `BatchSolutionPanel` herausgeloest. Er bleibt bewusst EIN
 * Bereich fuer die ganze Arbeit und wird nicht je Aufgabe gezeigt: Ein Scan ist
 * nicht nach Aufgaben zerlegt, es gibt dort also nichts zu paaren.
 *
 * Geschwaerzte Seiten haben Vorrang vor der Vorschau — sonst zeigte die
 * Oberflaeche nach dem Schwaerzen weiter das ungeschwaerzte Bild.
 */

interface BatchScanViewerProps {
    item: BatchFile;
    previewUrl: string | null;
    /** Sichtbarkeits-Klassen der Aufrufstelle (Mobil-Umschalter). */
    className?: string;
}

export const BatchScanViewer: React.FC<BatchScanViewerProps> = ({ item, previewUrl, className }) => (
    <div className={cn("flex-1 border border-border rounded-xl bg-card overflow-hidden relative shadow-sm h-[80vh] md:h-[600px] transition-all duration-300", className)}>
        <div className="w-full h-full overflow-auto custom-scrollbar bg-background/50 flex flex-col items-center">
            {item.isRedacted && item.redactedDataUrls && item.redactedDataUrls.length > 0 ? (
                item.redactedDataUrls.map((url, pIdx) => (
                    <img key={pIdx} src={url} alt={`Geschwärzter Scan Seite ${pIdx + 1}`} className="w-full h-auto object-contain p-1 border-b border-border last:border-0 shadow-sm" />
                ))
            ) : item.previewDataUrls && item.previewDataUrls.length > 0 ? (
                item.previewDataUrls.map((url, pIdx) => (
                    <img key={pIdx} src={url} alt={`Seite ${pIdx + 1}`} className="w-full h-auto object-contain p-1 border-b border-border last:border-0 shadow-sm" />
                ))
            ) : previewUrl ? (
                <img src={previewUrl} alt="Scan Vorschau" className="min-w-full object-contain p-1" />
            ) : (
                <div className="flex flex-col items-center justify-center p-8 text-muted-foreground text-sm text-center h-full w-full max-w-xs m-auto space-y-2">
                    <FileText size={40} className="stroke-1 opacity-60 text-muted-foreground" />
                    <span className="font-semibold text-foreground">Keine Scan-Vorschau aktiv</span>
                    <span className="text-xs text-muted-foreground">Du kannst deine Scans jederzeit nachträglich über den „Dateien verknüpfen“-Button ganz oben erneut laden.</span>
                </div>
            )}
        </div>
    </div>
);
