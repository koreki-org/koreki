import { renderHook } from '@testing-library/react';
import { useVerlassenWarnung } from '../../../src/hooks/useVerlassenWarnung';

/**
 * Die Rueckfrage, bevor eine Korrektur mit der Seite verschwindet.
 * ⚠️
 *
 * Schuelerdaten leben nur im Arbeitsspeicher (`architectural-vision` §2) — ein
 * F5 vernichtet sie endgueltig. Geprueft wird deshalb beides, und beides ist
 * gleich wichtig: dass die Warnung da ist, wenn es etwas zu verlieren gibt, UND
 * dass sie schweigt, wenn nichts geladen ist. Eine Rueckfrage, die immer kommt,
 * wird weggeklickt, bevor man sie liest — dann ist sie schlechter als keine.
 */
describe('useVerlassenWarnung', () => {
    let hinzu: jest.SpyInstance;
    let weg: jest.SpyInstance;

    beforeEach(() => {
        hinzu = jest.spyOn(window, 'addEventListener');
        weg = jest.spyOn(window, 'removeEventListener');
    });

    afterEach(() => jest.restoreAllMocks());

    const lauscher = (spy: jest.SpyInstance) =>
        spy.mock.calls.filter(([name]) => name === 'beforeunload');

    it('schweigt, solange nichts geladen ist', () => {
        renderHook(() => useVerlassenWarnung(false));

        expect(lauscher(hinzu)).toHaveLength(0);
    });

    it('meldet sich an, sobald eine Korrektur geladen ist', () => {
        renderHook(() => useVerlassenWarnung(true));

        expect(lauscher(hinzu)).toHaveLength(1);
    });

    it('raeumt beim Abbau wieder ab', () => {
        const { unmount } = renderHook(() => useVerlassenWarnung(true));
        unmount();

        expect(lauscher(weg)).toHaveLength(1);
    });

    it('meldet sich ab, sobald der letzte Inhalt weg ist', () => {
        // Sonst bliebe die Warnung nach „Neue Korrektur" haengen und fragte
        // auf einer leeren Oberflaeche.
        const { rerender } = renderHook(({ inhalt }) => useVerlassenWarnung(inhalt), {
            initialProps: { inhalt: true }
        });
        rerender({ inhalt: false });

        expect(lauscher(weg)).toHaveLength(1);
        expect(lauscher(hinzu)).toHaveLength(1);
    });

    it('haelt das Verlassen wirklich auf', () => {
        // Beides ist noetig: `preventDefault` ist der heutige Weg, `returnValue`
        // der aeltere. Faellt eines weg, zeigen manche Browser nichts an — und
        // das faellt erst auf, wenn Daten weg sind.
        renderHook(() => useVerlassenWarnung(true));
        const [, behandler] = lauscher(hinzu)[0] as [string, EventListener];

        const ereignis = {
            preventDefault: jest.fn(),
            returnValue: 'unberuehrt'
        } as unknown as BeforeUnloadEvent;
        behandler(ereignis);

        expect(ereignis.preventDefault).toHaveBeenCalled();
        expect(ereignis.returnValue).toBe('');
    });
});
