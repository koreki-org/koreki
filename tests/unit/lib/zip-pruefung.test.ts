import type { ZipBefund, ZipDatei } from '@/lib/zip-abgaben';

jest.mock('@/lib/zip-abgaben', () => ({
    ...jest.requireActual('@/lib/zip-abgaben'),
    leseZipAbgaben: jest.fn(),
    buendleAuswahl: jest.fn()
}));
jest.mock('@/lib/notify', () => ({ meldeErfolg: jest.fn(), meldeHinweis: jest.fn() }));

import { leseZipAbgaben, buendleAuswahl, standardAuswahl } from '@/lib/zip-abgaben';
import { meldeErfolg, meldeHinweis } from '@/lib/notify';
import {
    ordnerGruppen, ordnerStand, setzeDatei, setzeOrdner, zahlUebernommen,
    pruefeZipAbgaben, useZipPruefStore, uebernimmZip
} from '@/lib/zip-pruefung';

/**
 * „Abgaben pruefen" — Haken und Ablauf (Layer 1)
 * 🗂️
 *
 * ANLASS, 15.11.2026: Statt einer langen, sich selbst schliessenden Meldung
 * entscheidet die Lehrkraft in einem Fenster, was aus dem ZIP uebernommen wird.
 */

const datei = (pfad: string, art: ZipDatei['art']): ZipDatei =>
    ({ pfad, art, datei: new File(['x'], pfad.split('/').pop()!) });

const pruefling = (name: string) => ({
    name,
    dateien: [
        datei('transfer/sca/Bereitgestellte Dateien/Preisliste.pdf', 'vorlage'),
        datei('transfer/sca/_collect/APT1/a1.pdf', 'abgabe'),
        datei('transfer/sca/_collect/APT1/Kalkulation.ods', 'unlesbar'),
        datei('transfer/hda/_collect/APT/fremd.pdf', 'abgabe')
    ]
});

const befund: ZipBefund = { quelle: 'Abgaben.zip', prueflinge: [pruefling('lena'), pruefling('max')], ausserhalb: [], doppelt: [] };

afterEach(() => useZipPruefStore.setState({ befund: null, antwort: null }));

describe('ordnerGruppen', () => {
    it('gruppiert nach Ordner und kuerzt den gemeinsamen Anfang weg', () => {
        expect(ordnerGruppen(befund.prueflinge[0]).map(g => g.anzeige))
            .toEqual(['sca/Bereitgestellte Dateien', 'sca/_collect/APT1', 'hda/_collect/APT']);
    });
});

describe('Haken', () => {
    it('schlaegt vor, was nach eigener Abgabe aussieht', () => {
        expect(standardAuswahl(befund).lena).toEqual(['transfer/sca/_collect/APT1/a1.pdf', 'transfer/hda/_collect/APT/fremd.pdf']);
    });

    /** Ein fremder Ordner (andere Pruefung) wird einmal abgewaehlt — nicht 25-mal. */
    it('waehlt einen Ordner bei ALLEN Pruefligen ab', () => {
        const neu = setzeOrdner(befund, standardAuswahl(befund), 'transfer/hda/_collect/APT', false);
        expect(neu.lena).toEqual(['transfer/sca/_collect/APT1/a1.pdf']);
        expect(neu.max).toEqual(['transfer/sca/_collect/APT1/a1.pdf']);
    });

    it('nimmt mit dem Ordner nie eine unlesbare Datei auf', () => {
        const neu = setzeOrdner(befund, { lena: [], max: [] }, 'transfer/sca/_collect/APT1', true);
        expect(neu.lena).toEqual(['transfer/sca/_collect/APT1/a1.pdf']);
    });

    it('aendert mit einem Datei-Haken nur den einen Pruefling', () => {
        const neu = setzeDatei(standardAuswahl(befund), 'lena', 'transfer/sca/_collect/APT1/a1.pdf', false);
        expect(neu.lena).toEqual(['transfer/hda/_collect/APT/fremd.pdf']);
        expect(neu.max).toHaveLength(2);
    });

    it('meldet den Stand eines Ordners: alle, keine oder teilweise', () => {
        const [, collect, hda] = ordnerGruppen(befund.prueflinge[0]);
        expect(ordnerStand(collect, ['transfer/sca/_collect/APT1/a1.pdf'])).toBe('alle');
        expect(ordnerStand(hda, [])).toBe('keine');
        const gemischt = { ...collect, dateien: [...collect.dateien, datei('transfer/sca/_collect/APT1/a2.pdf', 'abgabe')] };
        expect(ordnerStand(gemischt, ['transfer/sca/_collect/APT1/a1.pdf'])).toBe('teil');
    });

    it('zaehlt nur Prueflinge, die etwas behalten', () => {
        expect(zahlUebernommen({ lena: ['a'], max: [] })).toBe(1);
    });
});

describe('pruefeZipAbgaben', () => {
    it('wartet auf die Antwort des Fensters', async () => {
        const antwort = pruefeZipAbgaben(befund);
        expect(useZipPruefStore.getState().befund).toBe(befund);
        useZipPruefStore.getState().beantworte({ lena: ['x'] });
        await expect(antwort).resolves.toEqual({ lena: ['x'] });
        expect(useZipPruefStore.getState().befund).toBeNull();
    });

    /** Eine neue Pruefung verdraengt die alte nicht stumm — deren Upload bekommt „abgebrochen". */
    it('bricht eine offene Pruefung ab, statt sie haengen zu lassen', async () => {
        const erste = pruefeZipAbgaben(befund);
        pruefeZipAbgaben(befund);
        await expect(erste).resolves.toBeNull();
    });
});

describe('uebernimmZip', () => {
    const arbeit = { name: 'lena', datei: new File(['%PDF'], 'lena.pdf') };

    beforeEach(() => {
        jest.clearAllMocks();
        (leseZipAbgaben as jest.Mock).mockResolvedValue(befund);
        (buendleAuswahl as jest.Mock).mockResolvedValue({ arbeiten: [arbeit], nichtZuOeffnen: [] });
    });

    it('buendelt nach der Auswahl im Fenster und meldet kurz', async () => {
        const lauf = uebernimmZip([new File([''], 'Abgaben.zip')]);
        await new Promise(r => setTimeout(r, 0));
        useZipPruefStore.getState().beantworte({ lena: ['transfer/sca/_collect/APT1/a1.pdf'] });
        await expect(lauf).resolves.toEqual([arbeit]);
        expect(buendleAuswahl).toHaveBeenCalledWith(befund, { lena: ['transfer/sca/_collect/APT1/a1.pdf'] });
        expect(meldeErfolg).toHaveBeenCalledWith('1 Prüfling(e) übernommen.');
    });

    it('legt nichts an, wenn abgebrochen wird', async () => {
        const lauf = uebernimmZip([new File([''], 'Abgaben.zip')]);
        await new Promise(r => setTimeout(r, 0));
        useZipPruefStore.getState().beantworte(null);
        await expect(lauf).resolves.toBeUndefined();
        expect(buendleAuswahl).not.toHaveBeenCalled();
    });

    it('nennt Dateien, die sich nicht oeffnen liessen, in einer bleibenden Meldung', async () => {
        (buendleAuswahl as jest.Mock).mockResolvedValue({ arbeiten: [arbeit], nichtZuOeffnen: ['lena: kaputt.pdf'] });
        const lauf = uebernimmZip([new File([''], 'Abgaben.zip')]);
        await new Promise(r => setTimeout(r, 0));
        useZipPruefStore.getState().beantworte({ lena: ['x'] });
        await lauf;
        expect(meldeHinweis).toHaveBeenCalledWith(expect.stringContaining('lena: kaputt.pdf'), { bleibt: true });
    });
});
