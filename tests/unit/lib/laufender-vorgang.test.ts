import { laufenderVorgang } from '@/lib/laufender-vorgang';
import { useBatchStore } from '@/hooks/store/useBatchStore';

/** Woran „Neue Korrektur“, „Öffnen“ und „Demo“ erkennen, dass sie warten muessen. */
describe('laufenderVorgang', () => {
    beforeEach(() => useBatchStore.setState({ isLoadingBatch: false, isLoadingModel: false }));

    it('ist null, wenn nichts laeuft', () => {
        expect(laufenderVorgang()).toBeNull();
    });

    it.each([
        [{ isLoadingBatch: true }, /Bilderkennung oder Korrektur/],
        [{ isLoadingModel: true }, /Musterlösung/],
    ])('nennt den laufenden Vorgang (%p)', (zustand, text) => {
        useBatchStore.setState(zustand);
        expect(laufenderVorgang()).toMatch(text);
    });
});
