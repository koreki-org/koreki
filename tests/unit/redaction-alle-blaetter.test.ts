/**
 * Schwärzung auf jedem Blatt einer Arbeit (lib/privacy-utils.ts).
 *
 * ANLASS (24.10.2026). Ein Balken galt nur für das Blatt, auf dem er gezogen wurde.
 * Wer die Kopfzeile auf Blatt 1 schwärzte, schickte die Blätter 2–4 mit Namen an die
 * Texterkennung, und die Arbeit trug trotzdem die Kennzeichnung „geschwärzt“. Bei nur
 * einer Arbeit im Stapel gab es nicht einmal den Haken zum Übertragen.
 */
import type { BatchFile } from '@/types';
import { verteileAufAlleBlaetter, blaetterOhneSchwaerzung, istVollstaendigGeschwaerzt } from '@/lib/privacy-utils';

const scan = (felder: Partial<BatchFile>): BatchFile => ({
    name: 'Schüler #1', status: 'pending', result: null, error: null,
    documentType: 'scanned', pageCount: 3, selected: true, ...felder
} as BatchFile);

describe('Balken auf alle Blätter einer Arbeit', () => {
    const groessen = { 0: { width: 1000, height: 2000 }, 1: { width: 1000, height: 2000 }, 2: { width: 2000, height: 1000 } };

    it('legt den Balken auf jedes Blatt, umgerechnet auf dessen Größe', () => {
        const balken = { x: 100, y: 200, w: 300, h: 100, scope: 'local' as const };
        const neu = verteileAufAlleBlaetter({}, balken, 0, groessen);
        expect(neu[0]).toEqual([balken]);
        expect(neu[1]).toEqual([{ x: 100, y: 200, w: 300, h: 100, scope: 'local' }]);
        // Querformat: gleicher relativer Ort, andere Pixel.
        expect(neu[2]).toEqual([{ x: 200, y: 100, w: 600, h: 50, scope: 'local' }]);
    });

    it('lässt vorhandene Balken stehen', () => {
        const vorher = { 1: [{ x: 1, y: 1, w: 50, h: 50 }] };
        const neu = verteileAufAlleBlaetter(vorher, { x: 10, y: 10, w: 20, h: 20 }, 0, groessen);
        expect(neu[1]).toHaveLength(2);
    });
});

describe('Ist eine Arbeit wirklich geschwärzt?', () => {
    const balken = [{ x: 0.1, y: 0.1, w: 0.5, h: 0.05 }];

    it('nennt die Blätter ohne Balken', () => {
        const teilweise = scan({ isRedacted: true, redactedDataUrls: ['a', 'b', 'c'], redactionRects: { 0: balken } });
        expect(blaetterOhneSchwaerzung(teilweise)).toEqual([2, 3]);
        expect(istVollstaendigGeschwaerzt(teilweise)).toBe(false);
    });

    it('gilt erst als geschwärzt, wenn jedes Blatt einen Balken trägt', () => {
        const ganz = scan({ isRedacted: true, redactedDataUrls: ['a', 'b', 'c'], redactionRects: { 0: balken, 1: balken, 2: balken } });
        expect(istVollstaendigGeschwaerzt(ganz)).toBe(true);
    });

    it('zählt ein als geschwärzt markiertes Dokument ohne gespeicherte Balken nicht als geschwärzt', () => {
        // Bestand aus der entfernten 2-cm-Automatik: Kennzeichnung ja, Balken keine.
        expect(istVollstaendigGeschwaerzt(scan({ isRedacted: true, redactedDataUrls: ['a'] }))).toBe(false);
    });

    it('betrifft nur Scans', () => {
        expect(istVollstaendigGeschwaerzt(scan({ documentType: 'typed' }))).toBe(true);
        expect(istVollstaendigGeschwaerzt(scan({}))).toBe(false);
    });
});
