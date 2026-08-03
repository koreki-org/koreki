/**
 * File: src/lib/privacy-utils.ts
 * Description: Industrial Privacy & Anonymization Utilities. 🏮🛡️🏛️
 * Ensures that sensitive data is handled with highest integrity across the pipeline.
 */

import { BatchFile } from '../types';

export interface OCRSource {
    buffers: string[];
    mimeType: string;
    isScanned: boolean;
}

/**
 * Herkunft eines Balkens. Steuert die Sammel-Übertragung und die Darstellung im
 * Schwärzungs-Modal — NICHT den gespeicherten Abzug: dort ist jeder Balken
 * schwarz. Ein Label im Bild würde von der Bilderkennung mit-transkribiert und
 * landete als Fremdtext in der Schülerarbeit.
 *
 * Fehlt das Feld (Bestand aus früheren Sitzungen und `.koreki`-Importen), gilt
 * der Balken als `local`.
 */
export type RedactionScope = 'shared' | 'local';

export interface RedactionRect {
    x: number;
    y: number;
    w: number;
    h: number;
    scope?: RedactionScope;
}

/** Schwärzungs-Rechtecke je Seitenindex (0-basiert innerhalb des Dokuments). */
export type RedactionRectMap = Record<number, RedactionRect[]>;

/**
 * 🏮 Rechtecke werden RELATIV zur Seitengröße gespeichert (Anteile von 0..1).
 *
 * Grund: Dieselbe Schwärzung trifft auf unterschiedlich gerenderte Fassungen
 * derselben Seite. Das Schwärzungs-Modal rendert PDFs mit Faktor 2.0
 * (`useRedactionEngine`), die Vorschaubilder der Pipeline mit 2.5
 * (`renderSinglePage`) — und beim Übertragen auf andere Schülerarbeiten kommen
 * beliebige Scan-Auflösungen dazu. In Pixeln gespeicherte Balken säßen dort
 * verschoben und rund 20 % zu klein, würden also PII freilegen statt zu decken.
 */
function isRelativeRect(r: RedactionRect): boolean {
    // Sicheres Unterscheidungsmerkmal: Der Zeichen-Handler verwirft Rechtecke
    // mit Breite oder Höhe <= 2 px. Ein in Pixeln gespeichertes Rechteck kann
    // daher niemals w <= 1 UND h <= 1 haben — ein relatives immer.
    return r.w <= 1 && r.h <= 1;
}

/**
 * Rechnet Rechtecke in den Pixelraum eines konkreten Bildes.
 * Bereits absolute (ältere, aus `.koreki`-Exporten stammende) Rechtecke bleiben
 * unverändert — gemischte Listen sind dadurch unproblematisch.
 */
export function toPixelRects(rects: RedactionRect[], width: number, height: number): RedactionRect[] {
    if (!width || !height) return rects;
    return rects.map(r => isRelativeRect(r)
        ? { ...r, x: r.x * width, y: r.y * height, w: r.w * width, h: r.h * height }
        : r
    );
}

/** Rechnet Rechtecke aus dem Pixelraum eines Bildes in relative Anteile. */
export function toRelativeRects(rects: RedactionRect[], width: number, height: number): RedactionRect[] {
    if (!width || !height) return rects;
    return rects.map(r => isRelativeRect(r)
        ? r
        : { ...r, x: r.x / width, y: r.y / height, w: r.w / width, h: r.h / height }
    );
}

/**
 * Ermittelt die Vorlage für eine Sammel-Übertragung.
 *
 * Vorrang haben ausdrücklich als `shared` markierte Balken — sie entstehen, wenn
 * beim Ziehen der Haken „Auf alle Scans übernehmen" gesetzt war. Damit lassen
 * sich gemeinsame und individuelle Schwärzungen in EINEM Durchgang ziehen, ohne
 * dass der Einzelfall bei allen landet.
 *
 * Rückfall für Bestandsdokumente ohne Markierung: die Rechtecke der ersten
 * geschwärzten Seite. Bewusst nur eine Seite — eine Vereinigung über alle Seiten
 * würde seitenspezifische Schwärzungen ungefragt auf fremde Arbeiten ausweiten.
 * Wie viele Balken die Vorlage umfasst, zeigt das Modal vor dem Anwenden an.
 */
export function buildRedactionTemplate(rects: RedactionRectMap): RedactionRect[] {
    const pages = Object.keys(rects).map(Number).sort((a, b) => a - b);

    const shared: RedactionRect[] = [];
    pages.forEach(page => {
        (rects[page] || []).forEach(rect => {
            if (rect.scope === 'shared' && !shared.some(s => isSameRect(s, rect))) {
                shared.push(rect);
            }
        });
    });
    if (shared.length > 0) return shared;

    for (const page of pages) {
        if (rects[page]?.length) {
            return rects[page].map(r => ({ ...r, scope: 'shared' as const }));
        }
    }
    return [];
}

function isSameRect(a: RedactionRect, b: RedactionRect): boolean {
    const epsilon = 0.001; // Relativer Raum: ~0.1 % der Seitenkante
    return Math.abs(a.x - b.x) < epsilon
        && Math.abs(a.y - b.y) < epsilon
        && Math.abs(a.w - b.w) < epsilon
        && Math.abs(a.h - b.h) < epsilon;
}

/**
 * Legt die Vorlage auf JEDE Seite eines Dokuments — additiv.
 *
 * 🏮 Bereits vorhandene, individuell gezogene Rechtecke bleiben erhalten: Wer
 * bei einem Schüler eine zusätzliche Stelle geschwärzt hat, verliert sie durch
 * eine spätere Sammel-Übertragung nicht. Schwärzung darf nur wachsen, nie
 * schrumpfen.
 */
export function mergeRedactionTemplate(
    existing: RedactionRectMap | undefined,
    template: RedactionRect[],
    pageCount: number
): RedactionRectMap {
    const merged: RedactionRectMap = { ...(existing || {}) };
    if (template.length === 0) return merged;

    for (let page = 0; page < Math.max(1, pageCount); page++) {
        const current = merged[page] || [];
        const additions = template.filter(t => !current.some(c => isSameRect(c, t)));
        merged[page] = [...current, ...additions];
    }
    return merged;
}

/**
 * Resolves the atomic source for OCR processing.
 * 🏮 CRITICAL RULE: If a file is redacted, the REDACTED data MUST be prioritized
 * to ensure sensitive original data never leaves the browser.
 */
export function resolveOCRSource(item: BatchFile): OCRSource | null {
    if (!item.files || item.files.length === 0) return null;

    // --- CASE A: REDACTED (Anonymisierungspfad) ---
    if (item.isRedacted && item.redactedDataUrls && item.redactedDataUrls.length > 0) {
        // We strictly use the list of blacked-out images.
        const buffers = item.redactedDataUrls.map(url => url.split(',')[1]).filter(Boolean);
        
        if (buffers.length === 0) return null;

        return {
            buffers,
            mimeType: 'image/jpeg',
            isScanned: true // A redacted canvas export is by definition an image/scan
        };
    }

    // --- CASE B: ORIGINAL (Standardpfad) ---
    // If not redacted, we return null to signal that the standard file-processor
    // logic (PDF-to-Image or Image-B64) should handle it.
    // This maintains separation of concerns.
    return null;
}

/**
 * Re-applies redaction rectangles to preview images.
 * Used when restoring physical PDFs from a .koreki export where only coordinates are saved.
 */
export async function applyRedactionsToPreviews(
    previewUrls: string[],
    redactionRects: RedactionRectMap
): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < previewUrls.length; i++) {
        const url = previewUrls[i];
        const relativeRects = redactionRects[i] || [];

        if (relativeRects.length === 0) {
            results.push(url);
            continue;
        }

        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            results.push(url);
            continue;
        }

        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = '#0f172a'; // Slate-900 / Black
        // Relativ gespeicherte Rechtecke auf die Auflösung DIESES Vorschaubildes
        // hochrechnen — das Modal rendert mit Faktor 2.0, die Vorschau mit 2.5.
        toPixelRects(relativeRects, img.width, img.height).forEach(r => {
            ctx.fillRect(r.x, r.y, r.w, r.h);
        });

        results.push(canvas.toDataURL('image/jpeg', 0.9));
    }
    
    return results;
}
