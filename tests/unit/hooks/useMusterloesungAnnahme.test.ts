import { renderHook, act } from '@testing-library/react';
import { useMusterloesungAnnahme } from '../../../src/hooks/useMusterloesungAnnahme';
import { askConfirmation } from '../../../src/lib/confirm-dialog';
import { meldeHinweis } from '../../../src/lib/notify';

jest.mock('../../../src/lib/confirm-dialog', () => ({
    askConfirmation: jest.fn()
}));
jest.mock('../../../src/lib/notify', () => ({
    meldeHinweis: jest.fn(),
    meldeFehler: jest.fn()
}));

/**
 * Die Tuer zur Musterloesung.
 * 🚪
 *
 * Geprueft wird das, was am 09.11.2026 gefehlt hat: Der Knopf "Ändern" oeffnete
 * den Dateidialog ohne jede Pruefung — auch nachdem Arbeiten korrigiert waren.
 * Die Aufgabenstruktur wechselte unter fertigen Korrekturen hinweg, und die
 * vergebenen Punkte zeigten danach auf Aufgaben, die es nicht mehr gab.
 *
 * Zwei Tore, und sie sind NICHT dasselbe: Die Sperre fragt nicht, die Rueckfrage
 * sperrt nicht. Wer sie verwechselt, baut entweder eine Sackgasse (Sperre, wo
 * ersetzen erlaubt waere) oder ein Scheunentor (Rueckfrage, wo es nichts mehr
 * abzuwaegen gibt).
 */
describe('useMusterloesungAnnahme', () => {
    const fragen = askConfirmation as jest.MockedFunction<typeof askConfirmation>;
    let setPendingModelFile: jest.Mock;
    let setShowModelTypeModal: jest.Mock;
    let handleModelUpload: jest.Mock;

    const bauen = (hatMusterloesung: boolean, gesperrt: boolean) => {
        setPendingModelFile = jest.fn();
        setShowModelTypeModal = jest.fn();
        handleModelUpload = jest.fn();
        return renderHook(() => useMusterloesungAnnahme({
            hatMusterloesung,
            gesperrt,
            setPendingModelFile,
            setShowModelTypeModal,
            handleModelUpload
        }));
    };

    const datei = (name = 'muster.txt') => new File(['Aufgabe 1'], name, { type: 'text/plain' });

    beforeEach(() => jest.clearAllMocks());

    it('nimmt auf leerer Oberflaeche sofort an, ohne zu fragen', async () => {
        const { result } = bauen(false, false);

        await act(async () => { await result.current([datei()]); });

        expect(fragen).not.toHaveBeenCalled();
        expect(setShowModelTypeModal).toHaveBeenCalledWith(true);
    });

    it('fragt, bevor es eine vorhandene Musterloesung ersetzt', async () => {
        fragen.mockResolvedValue(true);
        const { result } = bauen(true, false);

        await act(async () => { await result.current([datei()]); });

        expect(fragen).toHaveBeenCalledTimes(1);
        expect(setShowModelTypeModal).toHaveBeenCalledWith(true);
    });

    it('laesst die alte Musterloesung stehen, wenn die Rueckfrage verneint wird', async () => {
        fragen.mockResolvedValue(false);
        const { result } = bauen(true, false);

        await act(async () => { await result.current([datei()]); });

        expect(setPendingModelFile).not.toHaveBeenCalled();
        expect(setShowModelTypeModal).not.toHaveBeenCalled();
        expect(handleModelUpload).not.toHaveBeenCalled();
    });

    it('sperrt waehrend einer laufenden Korrektur — und fragt dabei NICHT', async () => {
        const { result } = bauen(true, true);

        await act(async () => { await result.current([datei()]); });

        // Keine Rueckfrage: Hier gibt es nichts abzuwaegen. Die vergebenen Punkte
        // beziehen sich auf die geladene Struktur; wer sie wechseln will, startet
        // eine neue Korrektur.
        expect(fragen).not.toHaveBeenCalled();
        expect(setPendingModelFile).not.toHaveBeenCalled();
        expect(handleModelUpload).not.toHaveBeenCalled();
        // Aber die Sperre sagt, warum — sonst wirkt sie wie ein Defekt.
        expect(meldeHinweis).toHaveBeenCalled();
    });

    it('sperrt auch dann, wenn noch gar keine Musterloesung geladen ist', async () => {
        // Die Sperre haengt an der KORREKTUR, nicht am Inhalt des Feldes. Haengte
        // sie am Inhalt, waere sie ueber den leeren Zustand zu umgehen.
        const { result } = bauen(false, true);

        await act(async () => { await result.current([datei()]); });

        expect(setShowModelTypeModal).not.toHaveBeenCalled();
    });

    it('sagt es, wenn mehrere Dateien abgelegt wurden, und nimmt die erste', async () => {
        const { result } = bauen(false, false);

        await act(async () => {
            await result.current([datei('eins.txt'), datei('zwei.txt')]);
        });

        expect(meldeHinweis).toHaveBeenCalled();
        expect(setPendingModelFile).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'eins.txt' })
        );
    });

    it('tut bei einer leeren Ablage nichts', async () => {
        const { result } = bauen(false, false);

        await act(async () => { await result.current([]); });

        expect(fragen).not.toHaveBeenCalled();
        expect(meldeHinweis).not.toHaveBeenCalled();
        expect(setShowModelTypeModal).not.toHaveBeenCalled();
    });
});
