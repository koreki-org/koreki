import { renderHook, act } from '@testing-library/react';
import { useNeueKorrektur } from '@/hooks/useNeueKorrektur';
import { useConfirmStore } from '@/lib/confirm-dialog';
import { useBatchStore } from '@/hooks/store/useBatchStore';

jest.mock('@/lib/notify', () => ({ meldeFehler: jest.fn(), meldeHinweis: jest.fn() }));
import { meldeHinweis } from '@/lib/notify';

/**
 * „Neue Korrektur“ wie „Neu“ in Word (Layer 1)
 *
 * Schuelerdaten leben nur im Arbeitsspeicher. Der Test sichert die drei Wege
 * der Rueckfrage — und vor allem den einen, der leicht uebersehen wird: Bricht
 * die Lehrkraft das Speichern ab, darf NICHTS verworfen werden.
 */
const aufbau = (hatArbeit: boolean, gespeichert: boolean | Error = true) => {
    const setter = {
        setBatchFiles: jest.fn(), setTasksLayout: jest.fn(),
        setModelSolution: jest.fn(), setModelSolutionContext: jest.fn(),
        nachDemVerwerfen: jest.fn()
    };
    const speichern = jest.fn(() => gespeichert instanceof Error ? Promise.reject(gespeichert) : Promise.resolve(gespeichert));
    const { result } = renderHook(() => useNeueKorrektur({ hatArbeit, speichern, ...setter }));
    return { neu: result.current, setter, speichern };
};

/** Startet „Neue Korrektur“, beantwortet die Rueckfrage und wartet das Ende ab. */
const klickeUndAntworte = async (neu: () => Promise<void>, antwort: boolean | 'zweite') => {
    let lauf: Promise<void> = Promise.resolve();
    act(() => { lauf = neu(); });
    expect(useConfirmStore.getState().request?.title).toBe('Aktuelle Korrektur schließen?');
    await act(async () => { useConfirmStore.getState().answer(antwort); await lauf; });
};

describe('useNeueKorrektur', () => {
    beforeAll(() => { window.scrollTo = jest.fn(); });
    beforeEach(() => {
        useConfirmStore.setState({ request: null, pendingAnswer: null });
        useBatchStore.getState().setEinrichtungOffen(false);
        useBatchStore.setState({ isLoadingBatch: false, isLoadingModel: false });
        (meldeHinweis as jest.Mock).mockClear();
    });

    it('ohne geladene Arbeit: keine Rueckfrage, direkt die Einrichtung', async () => {
        const { neu, setter } = aufbau(false);
        await act(async () => { await neu(); });
        expect(useConfirmStore.getState().request).toBeNull();
        expect(setter.setBatchFiles).not.toHaveBeenCalled();
        expect(useBatchStore.getState().einrichtungOffen).toBe(true);
    });

    it('Abbrechen laesst alles stehen', async () => {
        const { neu, setter, speichern } = aufbau(true);
        await klickeUndAntworte(neu, false);
        expect(speichern).not.toHaveBeenCalled();
        expect(setter.setBatchFiles).not.toHaveBeenCalled();
        expect(useBatchStore.getState().einrichtungOffen).toBe(false);
    });

    it('Nicht speichern verwirft ohne zu speichern', async () => {
        const { neu, setter, speichern } = aufbau(true);
        await klickeUndAntworte(neu, 'zweite');
        expect(speichern).not.toHaveBeenCalled();
        expect(setter.setBatchFiles).toHaveBeenCalledWith([]);
        expect(setter.setTasksLayout).toHaveBeenCalledWith([]);
        expect(setter.nachDemVerwerfen).toHaveBeenCalled();
        expect(useBatchStore.getState().einrichtungOffen).toBe(true);
    });

    it('Speichern speichert erst und verwirft dann', async () => {
        const { neu, setter, speichern } = aufbau(true, true);
        await klickeUndAntworte(neu, true);
        expect(speichern).toHaveBeenCalledTimes(1);
        expect(setter.setBatchFiles).toHaveBeenCalledWith([]);
    });

    /**
     * Mitten in einem Lauf wuerde „Nicht speichern“ die Sitzung leeren, waehrend
     * der Lauf seine Ergebnisse per Platznummer in die NEUE Korrektur schreibt.
     */
    it.each([
        ['Bilderkennung oder Korrektur', { isLoadingBatch: true }, /Bilderkennung oder Korrektur/],
        ['Analyse der Musterloesung', { isLoadingModel: true }, /Musterlösung/],
    ])('waehrend %s: keine Rueckfrage, nichts verworfen, ein Hinweis', async (_, zustand, text) => {
        useBatchStore.setState(zustand);
        const { neu, setter } = aufbau(true);
        await act(async () => { await neu(); });
        expect(useConfirmStore.getState().request).toBeNull();
        expect(setter.setBatchFiles).not.toHaveBeenCalled();
        expect(meldeHinweis).toHaveBeenCalledWith(expect.stringMatching(text));
        expect(useBatchStore.getState().einrichtungOffen).toBe(false);
    });

    it.each([
        ['abgebrochen', false],
        ['fehlgeschlagen', new Error('Platte voll')],
    ])('Speichern %s: nichts wird verworfen', async (_, ergebnis) => {
        const { neu, setter } = aufbau(true, ergebnis);
        await klickeUndAntworte(neu, true);
        expect(setter.setBatchFiles).not.toHaveBeenCalled();
        expect(setter.setTasksLayout).not.toHaveBeenCalled();
        expect(useBatchStore.getState().einrichtungOffen).toBe(false);
    });
});
