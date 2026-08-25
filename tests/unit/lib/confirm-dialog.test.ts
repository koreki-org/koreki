import { useConfirmStore, askConfirmation, confirmOverwrite } from '@/lib/confirm-dialog';

/**
 * Die Rueckfrage-Vermittlung (Layer 1)
 * 🗣️🛡️
 *
 * `window.confirm` hielt den Ablauf an und gab die Antwort unmittelbar zurueck.
 * Der Ersatz muss dasselbe leisten, ohne anzuhalten — deshalb ein Versprechen,
 * das erst auf die Antwort des Nutzers aufloest. Der gefaehrliche Fall ist ein
 * Versprechen, das NIE aufloest: der angefangene Vorgang bliebe fuer immer auf
 * halbem Weg stehen, ohne Fehler und ohne Spur.
 */
describe('Rueckfrage-Vermittlung', () => {
    beforeEach(() => {
        useConfirmStore.setState({ request: null, pendingAnswer: null });
    });

    it('loest erst auf, wenn geantwortet wurde', async () => {
        const antwort = askConfirmation({ title: 'Titel', message: 'Meldung' });

        expect(useConfirmStore.getState().request).toEqual({ title: 'Titel', message: 'Meldung' });

        useConfirmStore.getState().answer(true);
        await expect(antwort).resolves.toBe(true);
    });

    it('gibt die Ablehnung weiter', async () => {
        const antwort = askConfirmation({ title: 'Titel', message: 'Meldung' });
        useConfirmStore.getState().answer(false);

        await expect(antwort).resolves.toBe(false);
    });

    it('raeumt nach der Antwort auf, damit kein Dialog stehen bleibt', () => {
        askConfirmation({ title: 'Titel', message: 'Meldung' });
        useConfirmStore.getState().answer(true);

        expect(useConfirmStore.getState().request).toBeNull();
        expect(useConfirmStore.getState().pendingAnswer).toBeNull();
    });

    /**
     * DER FALL, DER SONST STILL HAENGEN BLEIBT.
     *
     * Kommt eine zweite Frage, waehrend die erste noch offen ist, wuerde ein
     * blosses Ueberschreiben des Zustands den ersten Aufrufer fuer immer warten
     * lassen. Er wird stattdessen verneint — abgebrochen ist besser als
     * eingefroren.
     */
    it('verneint eine verdraengte Frage, statt sie haengen zu lassen', async () => {
        const erste = askConfirmation({ title: 'Erste', message: 'Erste' });
        askConfirmation({ title: 'Zweite', message: 'Zweite' });

        await expect(erste).resolves.toBe(false);
        expect(useConfirmStore.getState().request?.title).toBe('Zweite');
    });
});

/**
 * DIE RUECKFRAGE MUSS SAGEN, WAS SIE ERSETZT.
 *
 * Diese Zusicherung stand zuvor im Test von `bestaetigeSchatzName` und ist mit
 * dem gemeinsamen Helfer hierher gewandert. Sie bleibt woertlich noetig: der
 * Mutationstest hatte gezeigt, dass sich die Bezeichnung der Familie durch eine
 * leere Zeichenkette ersetzen liess, ohne dass ein Test anschlug. Die Lehrkraft
 * liest dann „Ein  mit dem Namen ... existiert bereits" — oder, schlimmer, den
 * Namen einer anderen Familie, und bestaetigt ein Ueberschreiben, das sie nicht
 * gemeint hat.
 */
describe('confirmOverwrite', () => {
    beforeEach(() => {
        useConfirmStore.setState({ request: null, pendingAnswer: null });
    });

    it('nennt Familie und Namen in der Meldung', () => {
        confirmOverwrite('Erfahrungsschatz', 'Physik');

        const frage = useConfirmStore.getState().request;
        expect(frage?.message).toContain('Ein Erfahrungsschatz mit dem Namen');
        expect(frage?.message).toContain('"Physik"');
    });

    it('nennt die Familie auch in der Kopfzeile', () => {
        confirmOverwrite('KI-Profil', 'Mathe');

        // Sonst steht ueber der Meldung ein Titel, der nicht zu ihr gehoert.
        expect(useConfirmStore.getState().request?.title).toContain('KI-Profil');
    });

    it('sagt, dass ueberschrieben wird — nicht bloss, dass der Name belegt ist', () => {
        confirmOverwrite('Profil', 'Deutsch');

        expect(useConfirmStore.getState().request?.message).toMatch(/überschrieben/);
    });
});
