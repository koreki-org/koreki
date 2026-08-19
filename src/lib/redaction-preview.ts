import type { RedactionRect } from './privacy-utils';

/**
 * Die Vorschau im Schwaerzungs-Modal zeichnen.
 * 🖋️👁️
 *
 * 🏮 Die Einfaerbung und die Beschriftung existieren AUSSCHLIESSLICH in der
 * VORSCHAU. Der gespeicherte Abzug entsteht in einer eigenen Leinwand
 * (`processAndAnonymize`) und ist durchgehend schwarz — Text im Bild wuerde von
 * der Bilderkennung mit-transkribiert und landete als Fremdwort in der
 * Schuelerarbeit.
 *
 * Stand als 55-Zeilen-Effekt im Rumpf von `RedactionModal`. Ausgelagert nach
 * `architectural-vision` §6.1 (Logic in Lib, Thin Components) — die Komponente
 * steuert jetzt nur noch, WANN gezeichnet wird.
 */
export function zeichneSchwaerzungsVorschau(
    canvas: HTMLCanvasElement,
    bild: HTMLImageElement,
    rects: RedactionRect[],
    primaerfarbe: string,
    laufend?: { start: { x: number; y: number }; aktuell: { x: number; y: number } }
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const primary = primaerfarbe;
    const activeImage = bild;
    const isDrawing = !!laufend;
    const startPos = laufend?.start ?? { x: 0, y: 0 };
    const currentPos = laufend?.aktuell ?? { x: 0, y: 0 };


        // Clear and redraw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(activeImage, 0, 0, canvas.width, canvas.height);

        // 🏮 Die Einfärbung und die Beschriftung existieren AUSSCHLIESSLICH hier
        // in der Vorschau. Der gespeicherte Abzug entsteht in einer eigenen
        // Leinwand (processAndAnonymize) und ist durchgehend schwarz — Text im
        // Bild würde von der Bilderkennung mit-transkribiert und landete als
        // Fremdwort in der Schülerarbeit.
        const fontSize = Math.max(12, Math.round(canvas.width / 55));
        ctx.textBaseline = 'middle';

        rects.forEach(r => {
            const isShared = r.scope === 'shared';
            ctx.fillStyle = isShared ? primary : '#0f172a';
            ctx.fillRect(r.x, r.y, r.w, r.h);

            const label = isShared ? 'ALLE SCANS' : 'NUR HIER';
            ctx.font = `700 ${fontSize}px Inter, sans-serif`;
            const labelWidth = ctx.measureText(label).width;

            // Nur beschriften, wenn der Balken den Text trägt — schmale Streifen
            // bleiben unbeschriftet, dort trägt allein die Farbe die Information.
            if (r.w > labelWidth * 1.4 && r.h > fontSize * 1.6) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.fillText(label, r.x + fontSize * 0.6, r.y + r.h / 2);
            }
        });

        // Draw current drag rect
        if (isDrawing) {
            ctx.strokeStyle = primary;
            const displayWidth = canvas.clientWidth || 1;
            ctx.lineWidth = Math.max(2, (2 * canvas.width) / displayWidth);

            const x = Math.min(startPos.x, currentPos.x);
            const y = Math.min(startPos.y, currentPos.y);
            const w = Math.abs(startPos.x - currentPos.x);
            const h = Math.abs(startPos.y - currentPos.y);

            ctx.strokeRect(x, y, w, h);
            ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
            ctx.fillRect(x, y, w, h);
        }
}
