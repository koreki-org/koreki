import { resolveOCRSource, RedactionMissingError } from '../../src/lib/privacy-utils';
import type { BatchFile } from '../../src/types';

/**
 * Ein geschwärztes Dokument fällt zu, nicht auf (Layer 1)
 * 🏮🔒
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026. Über `resolveOCRSource` steht seit jeher:
 *
 *   "CRITICAL RULE: If a file is redacted, the REDACTED data MUST be
 *    prioritized to ensure sensitive original data never leaves the browser."
 *
 * Die Bauart widersprach dem. Fehlten bei einem als geschwärzt geführten
 * Dokument die Bilder, gab die Funktion `null` zurück — und `null` heißt beim
 * Aufrufer nicht "brich ab", sondern "nimm den Normalweg", also DAS ORIGINAL.
 * Ein fail-open an genau der Stelle, die das Gegenteil verspricht.
 *
 * Der zweite Teil: `filter(Boolean)` schnitt einzelne unlesbare Seiten
 * heraus. Die Texterkennung lief dann über vier statt fünf Seiten, ohne dass
 * es jemand merkte — die fehlende Seite fiel weder auf noch aus.
 *
 * HEUTE TRAT DAS NICHT EIN, und das gehört zum Befund: Alle drei Stellen, die
 * `isRedacted: true` setzen, legen die Bilder gleich dazu, und die
 * Verarbeitungs-Pipeline setzt das Kennzeichen ausdrücklich zurück, wenn sie
 * keinen Abzug erzeugen kann (mit einem Kommentar, der genau diese Gefahr
 * benennt). Die Zusicherung lebte also in den AUFRUFERN — und genau solche
 * Zusicherungen driften in diesem Projekt. Jetzt trägt sie die Funktion
 * selbst.
 */

const BILD = 'data:image/jpeg;base64,AAAA';

const dokument = (p: Partial<BatchFile>): BatchFile => ({
    files: [new File(['x'], 'arbeit.pdf')],
    ...p
} as unknown as BatchFile);

describe('Geschwaerzte Dokumente ohne brauchbaren Abzug', () => {
    /** DER BEFUND: vorher lieferte das `null` — und damit das Original. */
    it('verarbeitet nicht das Original, wenn die Bilder fehlen', () => {
        expect(() => resolveOCRSource(dokument({ isRedacted: true })))
            .toThrow(RedactionMissingError);
    });

    it('verarbeitet nicht das Original bei leerer Bilderliste', () => {
        expect(() => resolveOCRSource(dokument({ isRedacted: true, redactedDataUrls: [] })))
            .toThrow(RedactionMissingError);
    });

    /** Teilweise unbrauchbar ist auch unbrauchbar. */
    it('laesst keine einzelne unlesbare Seite unter den Tisch fallen', () => {
        const quelle = dokument({
            isRedacted: true,
            redactedDataUrls: [BILD, 'kaputt-ohne-komma', BILD]
        });

        expect(() => resolveOCRSource(quelle)).toThrow(/1 von 3 Seiten unlesbar/);
    });

    /** Die Meldung muss der Lehrkraft sagen, was zu tun ist. */
    it('nennt in der Meldung, dass das Original nicht verarbeitet wird', () => {
        try {
            resolveOCRSource(dokument({ isRedacted: true }));
            throw new Error('haette werfen muessen');
        } catch (err) {
            expect((err as Error).message).toMatch(/Original wird nicht verarbeitet/);
            expect((err as Error).message).toMatch(/erneut anwenden/);
        }
    });
});

describe('Der uebliche Weg bleibt unveraendert', () => {
    it('nimmt den geschwaerzten Abzug, wenn er vollstaendig ist', () => {
        const quelle = resolveOCRSource(dokument({
            isRedacted: true,
            redactedDataUrls: [BILD, BILD]
        }));

        expect(quelle).toEqual({
            buffers: ['AAAA', 'AAAA'],
            mimeType: 'image/jpeg',
            isScanned: true
        });
    });

    /**
     * Ohne Schwärzung übernimmt die normale Verarbeitung — dafür steht `null`.
     * Dieser Rückgabewert darf NUR hier vorkommen.
     */
    it('ueberlaesst ungeschwaerzte Dokumente dem Normalweg', () => {
        expect(resolveOCRSource(dokument({ isRedacted: false }))).toBeNull();
        expect(resolveOCRSource(dokument({}))).toBeNull();
    });

    it('meldet ein Dokument ohne Dateien als nicht aufloesbar', () => {
        expect(resolveOCRSource({ files: [] } as unknown as BatchFile)).toBeNull();
    });
});
