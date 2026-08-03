import {
    toPixelRects,
    toRelativeRects,
    buildRedactionTemplate,
    mergeRedactionTemplate
} from '../../../src/lib/privacy-utils';

/**
 * Layer 1 — Schwärzungs-Geometrie.
 *
 * Kern der Sammel-Übertragung: Eine einmal gezogene Schwärzung muss auf fremden
 * Schülerarbeiten und in anders gerenderten Fassungen derselben Seite exakt
 * dieselbe Stelle treffen. Das Schwärzungs-Modal rendert PDFs mit Faktor 2.0,
 * die Vorschaubilder der Pipeline mit 2.5 — in Pixeln gespeicherte Balken säßen
 * dort verschoben und zu klein und würden Namen freilegen.
 */
describe('Schwärzungs-Geometrie (relative Koordinaten)', () => {
    describe('toPixelRects', () => {
        it('rechnet relative Rechtecke auf die Zielauflösung hoch', () => {
            const relative = [{ x: 0, y: 0, w: 1, h: 0.1 }];

            expect(toPixelRects(relative, 800, 1000)).toEqual([
                { x: 0, y: 0, w: 800, h: 100 }
            ]);
        });

        /**
         * Derselbe Balken auf zwei Auflösungen derselben Seite muss denselben
         * Seitenanteil bedecken — sonst entsteht genau der Versatz zwischen
         * Modal (2.0) und Vorschau (2.5), der PII freilegt.
         */
        it('bedeckt bei unterschiedlichen Auflösungen denselben Seitenanteil', () => {
            const relative = [{ x: 0, y: 0, w: 1, h: 0.0673 }];

            const [modal] = toPixelRects(relative, 1190, 1684);   // Faktor 2.0
            const [preview] = toPixelRects(relative, 1487, 2105); // Faktor 2.5

            expect(modal.h / 1684).toBeCloseTo(preview.h / 2105, 6);
            expect(modal.w / 1190).toBeCloseTo(preview.w / 1487, 6);
        });

        /**
         * Bestandsschutz: Ältere `.koreki`-Exporte enthalten absolute Pixelwerte.
         * Sie dürfen nicht ein zweites Mal skaliert werden.
         */
        it('lässt bereits absolute Rechtecke unverändert', () => {
            const absolute = [{ x: 10, y: 10, w: 100, h: 50 }];

            expect(toPixelRects(absolute, 800, 1000)).toEqual(absolute);
        });

        it('gibt Rechtecke unverändert zurück, wenn Zielmaße fehlen', () => {
            const relative = [{ x: 0, y: 0, w: 0.5, h: 0.1 }];

            expect(toPixelRects(relative, 0, 0)).toEqual(relative);
        });
    });

    describe('toRelativeRects', () => {
        it('rechnet Pixel-Rechtecke in Seitenanteile um', () => {
            const pixels = [{ x: 400, y: 100, w: 400, h: 100 }];

            expect(toRelativeRects(pixels, 800, 1000)).toEqual([
                { x: 0.5, y: 0.1, w: 0.5, h: 0.1 }
            ]);
        });

        it('ist zusammen mit toPixelRects verlustfrei', () => {
            const pixels = [{ x: 123, y: 456, w: 321, h: 78 }];

            const roundTrip = toPixelRects(toRelativeRects(pixels, 800, 1000), 800, 1000);

            expect(roundTrip[0].x).toBeCloseTo(123, 6);
            expect(roundTrip[0].y).toBeCloseTo(456, 6);
            expect(roundTrip[0].w).toBeCloseTo(321, 6);
            expect(roundTrip[0].h).toBeCloseTo(78, 6);
        });

        it('lässt bereits relative Rechtecke unverändert', () => {
            const relative = [{ x: 0.1, y: 0.1, w: 0.5, h: 0.2 }];

            expect(toRelativeRects(relative, 800, 1000)).toEqual(relative);
        });
    });
});

describe('Sammel-Übertragung einer Schwärzung', () => {
    const header = { x: 0, y: 0, w: 1, h: 0.08 };
    const sideNote = { x: 0.8, y: 0.4, w: 0.15, h: 0.05 };

    describe('buildRedactionTemplate', () => {
        /**
         * Kern der Herkunfts-Logik: Wer Kopfzeile UND einen Einzelfall in einem
         * Durchgang zieht, darf nur den bewusst als gemeinsam markierten Balken
         * auf den ganzen Stapel legen.
         */
        it('überträgt ausschließlich als gemeinsam markierte Balken', () => {
            const rects = {
                0: [{ ...header, scope: 'shared' as const }, { ...sideNote, scope: 'local' as const }]
            };

            const template = buildRedactionTemplate(rects);

            expect(template).toHaveLength(1);
            expect(template[0]).toMatchObject({ x: header.x, y: header.y, w: header.w, h: header.h });
        });

        it('sammelt gemeinsame Balken über alle Seiten hinweg', () => {
            const rects = {
                0: [{ ...header, scope: 'shared' as const }],
                1: [{ ...sideNote, scope: 'shared' as const }]
            };

            expect(buildRedactionTemplate(rects)).toHaveLength(2);
        });

        /**
         * Bestandsschutz: Dokumente aus früheren Sitzungen und `.koreki`-Importe
         * kennen keine Herkunft. Damit ein gesetzter Haken dort nicht wirkungslos
         * bleibt, gilt die erste geschwärzte Seite als Vorlage.
         */
        it('fällt ohne Markierung auf die erste geschwärzte Seite zurück', () => {
            const template = buildRedactionTemplate({ 0: [header], 1: [sideNote] });

            expect(template).toHaveLength(1);
            expect(template[0]).toMatchObject({ x: header.x, w: header.w });
        });

        it('markiert die Rückfall-Vorlage als gemeinsam', () => {
            expect(buildRedactionTemplate({ 0: [header] })[0].scope).toBe('shared');
        });

        it('vereinigt beim Rückfall nicht über mehrere Seiten', () => {
            expect(buildRedactionTemplate({ 0: [header], 1: [sideNote] }))
                .not.toContainEqual(expect.objectContaining({ x: sideNote.x }));
        });

        it('überspringt führende Seiten ohne Schwärzung', () => {
            const template = buildRedactionTemplate({ 0: [], 1: [sideNote] });

            expect(template).toHaveLength(1);
            expect(template[0]).toMatchObject({ x: sideNote.x, w: sideNote.w });
        });

        it('liefert eine leere Vorlage, wenn nichts geschwärzt wurde', () => {
            expect(buildRedactionTemplate({})).toEqual([]);
            expect(buildRedactionTemplate({ 0: [], 1: [] })).toEqual([]);
        });
    });

    describe('mergeRedactionTemplate', () => {
        it('legt die Vorlage auf jede Seite des Dokuments', () => {
            const merged = mergeRedactionTemplate({}, [header], 3);

            expect(merged[0]).toEqual([header]);
            expect(merged[1]).toEqual([header]);
            expect(merged[2]).toEqual([header]);
        });

        /**
         * 🏮 Kern der Datenschutz-Zusage im Modal: Wer bei einem Schüler eine
         * zusätzliche Stelle geschwärzt hat, darf sie durch eine spätere
         * Sammel-Übertragung nicht verlieren. Schwärzung wächst, sie schrumpft nie.
         */
        it('erhält individuell gezogene Rechtecke', () => {
            const existing = { 1: [sideNote] };

            const merged = mergeRedactionTemplate(existing, [header], 2);

            expect(merged[1]).toContainEqual(sideNote);
            expect(merged[1]).toContainEqual(header);
        });

        it('verdoppelt die Vorlage bei mehrfacher Anwendung nicht', () => {
            const once = mergeRedactionTemplate({}, [header], 2);
            const twice = mergeRedactionTemplate(once, [header], 2);

            expect(twice[0]).toHaveLength(1);
            expect(twice[1]).toHaveLength(1);
        });

        it('erkennt nahezu deckungsgleiche Rechtecke als dieselbe Schwärzung', () => {
            const existing = { 0: [{ x: 0, y: 0, w: 1, h: 0.0801 }] };

            const merged = mergeRedactionTemplate(existing, [header], 1);

            expect(merged[0]).toHaveLength(1);
        });

        it('lässt den Bestand unangetastet, wenn die Vorlage leer ist', () => {
            const existing = { 0: [sideNote] };

            expect(mergeRedactionTemplate(existing, [], 3)).toEqual(existing);
        });

        it('verändert die übergebene Rechteck-Sammlung nicht', () => {
            const existing = { 0: [sideNote] };

            mergeRedactionTemplate(existing, [header], 2);

            expect(existing).toEqual({ 0: [sideNote] });
        });
    });
});
