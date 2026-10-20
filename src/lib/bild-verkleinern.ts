/**
 * Bilder für die lokale Bilderkennung auf Seitengröße bringen.
 * 🖼️
 *
 * ANLASS (20.10.2026). Ein Handyfoto (2304 × 3264) brach die Bilderkennung auf
 * lokalem Ollama ab: Der Bild-Encoder forderte 17,2 GB Grafikspeicher in einem
 * Block an, bei 1600 × 2267 noch 13,4 GB. Gemessen auf 2 × RTX 4000 SFF Ada
 * (20 GB) mit `qwen3.6:35b` UND `qwen3.8` — beide Modelle gleich. Bei
 * 1190 × 1686 lief es mit beiden durch.
 *
 * PDF-Seiten waren davon nie betroffen: Sie werden seit dem 09.09.2026 mit
 * `SEITEN_RENDER_FAKTOR` gerendert (A4 ≈ 1190 × 1684), aus genau diesem Grund.
 * Hochgeladene Fotos und Scans gingen dagegen in voller Größe hinaus.
 *
 * Die Grenze ist deshalb keine neue Zahl, sondern die Länge einer A4-Seite bei
 * diesem Faktor: Ein Foto darf so groß sein wie eine gerenderte PDF-Seite.
 *
 * Bewusst NUR für Ollama: Mistral und OpenAI-kompatible Anbieter haben diese
 * Grenze nicht, und wie sich ein kleineres Bild dort auf die Erkennung auswirkt,
 * ist nicht gemessen.
 */
import { SEITEN_RENDER_FAKTOR } from './file-utils';

/** Lange Seite eines A4-Blatts in PDF-Punkten (297 mm). */
const A4_HOEHE_PUNKTE = 841.89;

/** Längste erlaubte Bildkante für die lokale Bilderkennung, in Pixeln. */
export const MAX_BILDKANTE_LOKAL = Math.round(A4_HOEHE_PUNKTE * SEITEN_RENDER_FAKTOR);

/** Zielgröße unter Erhalt des Seitenverhältnisses — `null`, wenn das Bild schon passt. */
export function zielGroesse(breite: number, hoehe: number, maxKante: number = MAX_BILDKANTE_LOKAL): { breite: number; hoehe: number } | null {
    const laengste = Math.max(breite, hoehe);
    if (laengste <= maxKante) return null;
    const faktor = maxKante / laengste;
    return { breite: Math.round(breite * faktor), hoehe: Math.round(hoehe * faktor) };
}

export interface BildDaten {
    base64: string;
    mimeType: string;
}

/**
 * Verkleinert ein Bild auf `MAX_BILDKANTE_LOKAL`. Passt es schon, kommt es
 * unverändert zurück. Ohne Canvas (Server, Tests) ebenfalls unverändert — die
 * Bilderkennung wird im Browser bzw. in der Desktop-App vorbereitet.
 */
export async function verkleinereFuerLokaleBilderkennung(bild: BildDaten): Promise<BildDaten> {
    if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') return bild;

    // Bewusst OHNE `fetch('data:…')`: Die Content-Security-Policy erlaubt in
    // `connect-src` keine data:-Adressen (src/middleware.ts). Der Abruf scheiterte
    // im Browser mit „Failed to fetch", bevor eine Anfrage den Server erreichte —
    // gemessen am 20.10.2026 im ersten Versuch dieser Datei.
    const bytes = Uint8Array.from(atob(bild.base64), zeichen => zeichen.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: bild.mimeType }));
    try {
        const ziel = zielGroesse(bitmap.width, bitmap.height);
        if (!ziel) return bild;

        const canvas = document.createElement('canvas');
        canvas.width = ziel.breite;
        canvas.height = ziel.hoehe;
        const ctx = canvas.getContext('2d');
        if (!ctx) return bild;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, ziel.breite, ziel.hoehe);

        // Dieselbe Qualität wie gerenderte PDF-Seiten (`renderSinglePage`).
        return { base64: canvas.toDataURL('image/jpeg', 0.92).split(',')[1], mimeType: 'image/jpeg' };
    } finally {
        bitmap.close();
    }
}
