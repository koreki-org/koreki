import {
    useNotifyStore,
    meldeErfolg,
    meldeHinweis,
    meldeFehler,
    meldeNachNeuladen,
    holeMeldungNachNeuladen,
    STANDZEIT
} from '@/lib/notify';

/**
 * Meldungen an die Lehrkraft (Layer 1)
 * 🔔🛡️
 *
 * `alert()` hielt den Ablauf an — bequem, aber es bestrafte die Lehrkraft mit
 * einem Klick dafuer, dass etwas geklappt hat. Der Ersatz darf nichts
 * blockieren; damit entstehen zwei neue Fehlermoeglichkeiten, die es vorher
 * nicht gab: eine Meldung, die zu frueh verschwindet, und eine, die nie
 * erscheint.
 */
describe('Meldungs-Speicher', () => {
    beforeEach(() => useNotifyStore.setState({ meldungen: [] }));

    it('nimmt eine Meldung mit ihrer Tonlage auf', () => {
        meldeErfolg('Gespeichert.');

        const [meldung] = useNotifyStore.getState().meldungen;
        expect(meldung.art).toBe('erfolg');
        expect(meldung.text).toBe('Gespeichert.');
    });

    it('haelt die drei Tonlagen auseinander', () => {
        meldeErfolg('a');
        meldeHinweis('b');
        meldeFehler('c');

        expect(useNotifyStore.getState().meldungen.map(m => m.art)).toEqual(['erfolg', 'hinweis', 'fehler']);
    });

    it('stapelt mehrere Meldungen statt sie zu verdraengen', () => {
        meldeFehler('erster');
        meldeFehler('zweiter');

        expect(useNotifyStore.getState().meldungen).toHaveLength(2);
    });

    /**
     * Wer zweimal auf einen gesperrten Knopf drueckt, soll nicht zwei gleiche
     * Zettel bekommen — sonst stapelt sich der Bildschirm bei einem hartnaeckig
     * wiederholten Fehlversuch zu.
     */
    it('stapelt dieselbe Meldung nicht doppelt', () => {
        meldeHinweis('Bitte gib einen Namen ein.');
        meldeHinweis('Bitte gib einen Namen ein.');

        expect(useNotifyStore.getState().meldungen).toHaveLength(1);
    });

    it('vergibt eigene Kennungen, damit gleiche Texte unterscheidbar bleiben', () => {
        meldeErfolg('gleich');
        meldeFehler('gleich');

        const [a, b] = useNotifyStore.getState().meldungen;
        expect(a.id).not.toBe(b.id);
    });

    it('entfernt genau die verworfene Meldung', () => {
        meldeFehler('bleibt');
        meldeHinweis('geht');
        const zuVerwerfen = useNotifyStore.getState().meldungen[1].id;

        useNotifyStore.getState().verwirf(zuVerwerfen);

        expect(useNotifyStore.getState().meldungen.map(m => m.text)).toEqual(['bleibt']);
    });

    /**
     * DIE WICHTIGSTE ZUSICHERUNG.
     *
     * Ein Fehler enthaelt oft, was zu tun ist, und manche sind mehrere Zeilen
     * lang. Eine Fehlermeldung, die sich selbst schliesst, bevor sie gelesen
     * ist, ist schlimmer als keine: Der Nutzer weiss dann, dass etwas war, aber
     * nicht was.
     */
    it('laesst Fehler stehen und blendet nur Erfolg und Hinweis aus', () => {
        expect(STANDZEIT.fehler).toBeNull();
        expect(STANDZEIT.erfolg).toBeGreaterThan(0);
        expect(STANDZEIT.hinweis).toBeGreaterThan(0);
        // Ein Hinweis verlangt eine Handlung und braucht daher laenger als eine
        // blosse Bestaetigung.
        expect(STANDZEIT.hinweis as number).toBeGreaterThan(STANDZEIT.erfolg as number);
    });
});

/**
 * Nach dem Beitritt zu einem Institut laedt Koreki neu, um den neuen
 * Arbeitsbereich zu uebernehmen. Ein gewoehnlicher Toast waere in dem Moment
 * mit der Seite verschwunden — die Lehrkraft haette nie erfahren, dass es
 * geklappt hat. Frueher trug `alert` das, weil es anhielt, bis jemand OK
 * drueckte.
 */
describe('Meldung ueber ein Neuladen hinweg', () => {
    beforeEach(() => {
        useNotifyStore.setState({ meldungen: [] });
        window.sessionStorage.clear();
    });

    it('gibt die hinterlegte Meldung danach zurueck', () => {
        meldeNachNeuladen('erfolg', 'Erfolgreich beigetreten: Musterschule');

        const geholt = holeMeldungNachNeuladen();
        expect(geholt?.art).toBe('erfolg');
        expect(geholt?.text).toBe('Erfolgreich beigetreten: Musterschule');
    });

    it('gibt sie nur EINMAL zurueck', () => {
        meldeNachNeuladen('erfolg', 'einmalig');

        expect(holeMeldungNachNeuladen()).not.toBeNull();
        // Sonst begruesste dieselbe Meldung den Nutzer bei jedem weiteren
        // Seitenaufruf erneut.
        expect(holeMeldungNachNeuladen()).toBeNull();
    });

    it('liefert nichts, wenn nichts hinterlegt wurde', () => {
        expect(holeMeldungNachNeuladen()).toBeNull();
    });

    it('verschluckt sich nicht an beschaedigten Daten', () => {
        window.sessionStorage.setItem('koreki:meldung-nach-neuladen', 'kein json');

        expect(() => holeMeldungNachNeuladen()).not.toThrow();
        expect(holeMeldungNachNeuladen()).toBeNull();
    });

    it('weist eine unbekannte Tonlage ab', () => {
        window.sessionStorage.setItem('koreki:meldung-nach-neuladen', JSON.stringify({ art: 'quatsch', text: 'x' }));

        expect(holeMeldungNachNeuladen()).toBeNull();
    });
});
