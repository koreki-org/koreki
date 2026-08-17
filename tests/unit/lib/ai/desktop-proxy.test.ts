import { warteMitAbbruch } from '@/lib/ai/desktop-proxy';

/**
 * Abbruch-Rennen fuer den Desktop-Proxy (Layer 1)
 * 🖥️
 *
 * Ein Rust-Aufruf kennt kein `AbortSignal`. Damit der Stopp-Knopf im
 * Desktop-Betrieb trotzdem wirkt, laeuft er gegen ein Versprechen, das beim
 * Abbruch ablehnt. Diese Konstruktion stand viermal im Repo.
 */
describe('warteMitAbbruch', () => {
    it('reicht das Ergebnis durch, wenn kein Signal uebergeben wird', async () => {
        await expect(warteMitAbbruch(Promise.resolve('fertig'))).resolves.toBe('fertig');
    });

    it('reicht das Ergebnis durch, solange nicht abgebrochen wird', async () => {
        const controller = new AbortController();
        await expect(warteMitAbbruch(Promise.resolve('fertig'), controller.signal)).resolves.toBe('fertig');
    });

    /**
     * Der Aufrufer muss den Abbruch vom echten Fehlschlag unterscheiden koennen:
     * bei Abbruch geht die Datei zurueck auf "wartet", bei einem Fehler wird sie
     * rot. Beides haengt am `name` des Fehlers.
     */
    it('meldet den Abbruch als AbortError', async () => {
        const controller = new AbortController();
        const nieFertig = new Promise<string>(() => { /* bleibt offen */ });

        const lauf = warteMitAbbruch(nieFertig, controller.signal);
        controller.abort();

        await expect(lauf).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('bricht sofort ab, wenn das Signal schon vor dem Start gesetzt war', async () => {
        const controller = new AbortController();
        controller.abort();

        const nieFertig = new Promise<string>(() => { /* bleibt offen */ });
        await expect(warteMitAbbruch(nieFertig, controller.signal))
            .rejects.toMatchObject({ name: 'AbortError' });
    });

    /**
     * Der Grund fuer `{ once: true }`.
     *
     * Bei einem Stapel von fuenfzig Arbeiten laeuft dieselbe Funktion fuenfzig
     * Mal mit DEMSELBEN Signal — es lebt so lange wie der ganze Lauf. Ohne
     * `once` bliebe jeder Zuhoerer daran haengen.
     */
    it('haeuft bei wiederholten Aufrufen keine Zuhoerer auf demselben Signal an', async () => {
        const controller = new AbortController();
        let angemeldet = 0;
        let einmalig = 0;

        const original = controller.signal.addEventListener.bind(controller.signal);
        controller.signal.addEventListener = ((typ: string, hoerer: EventListener, optionen?: AddEventListenerOptions) => {
            angemeldet++;
            if (optionen && optionen.once) einmalig++;
            return original(typ, hoerer, optionen);
        }) as typeof controller.signal.addEventListener;

        for (let i = 0; i < 50; i++) {
            await warteMitAbbruch(Promise.resolve(i), controller.signal);
        }

        expect(angemeldet).toBe(50);
        // Jeder einzelne raeumt sich nach dem ersten Ereignis selbst ab.
        expect(einmalig).toBe(50);
    });

    it('laesst einen echten Fehler unveraendert durch', async () => {
        const controller = new AbortController();
        const kaputt = Promise.reject(new Error('Proxy nicht erreichbar'));

        await expect(warteMitAbbruch(kaputt, controller.signal))
            .rejects.toThrow('Proxy nicht erreichbar');
    });
});
