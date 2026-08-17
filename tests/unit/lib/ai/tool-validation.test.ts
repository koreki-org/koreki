import { pruefeWerkzeugAufruf, MAX_TOOL_RETRIES } from '@/lib/ai/tool-validation';

/**
 * Pruefung der Modell-Entwuerfe (Layer 1)
 * 🧪
 *
 * Beim Erzeugen eines Bewertungsgraphen liefert das Modell seinen Entwurf als
 * Werkzeugaufruf. Koreki simuliert ihn, bevor er akzeptiert wird — das ist der
 * Grund, warum ein erzeugter Graph verlaesslich ist und nicht bloss plausibel
 * formuliert.
 *
 * Die Pruefung stand vorher zweimal da (mistral-provider, openai-provider),
 * ueber 58 Zeilen zeichengleich. Sie war noch nicht auseinandergelaufen —
 * anders als zwei andere Kopien-Paare in derselben Sitzung, die es waren.
 */
describe('pruefeWerkzeugAufruf', () => {
    /** Ein Graph, der sich fehlerfrei durchrechnen laesst. */
    const gueltigerGraph = JSON.stringify({
        taskId: 'A1',
        discipline: 'mathematics',
        variables: [
            { id: 'laenge', type: 'input', defaultValue: 10, validationType: 'exact', maxPoints: 0 },
            { id: 'breite', type: 'input', defaultValue: 5, validationType: 'exact', maxPoints: 0 },
            { id: 'volumen', type: 'formula', expression: 'laenge * breite', validationType: 'exact', maxPoints: 2 }
        ]
    });

    it('akzeptiert einen Graphen, der die Simulation besteht', () => {
        const urteil = pruefeWerkzeugAufruf('validate_graph', gueltigerGraph);

        expect(urteil.status).toBe('akzeptiert');
        if (urteil.status === 'akzeptiert') {
            expect(urteil.artefakt).toBeTruthy();
        }
    });

    it('verlangt Nachbesserung, wenn der Entwurf kein brauchbares JSON ist', () => {
        const urteil = pruefeWerkzeugAufruf('validate_graph', 'das ist kein JSON');

        expect(urteil.status).toBe('nachbessern');
        if (urteil.status === 'nachbessern') {
            expect(urteil.rueckmeldung).toContain('GRADING_GRAPH_SCHEMA');
        }
    });

    /**
     * Die Rueckmeldung muss den KONKRETEN Fehler nennen. Ein blosses "war
     * falsch" laesst das Modell im naechsten Versuch dieselbe Struktur mit
     * anderen Zahlen bauen — der Nachbesserungsversuch waere verschenkt.
     */
    it('nennt bei einem rechnerisch kaputten Graphen den konkreten Fehler', () => {
        // Die Formel greift auf eine Variable zu, die es im Graphen nicht gibt.
        const kaputt = JSON.stringify({
            taskId: 'A1',
            discipline: 'mathematics',
            variables: [
                { id: 'laenge', type: 'input', defaultValue: 10, validationType: 'exact', maxPoints: 0 },
                { id: 'volumen', type: 'formula', expression: 'laenge * gibtsnicht', validationType: 'exact', maxPoints: 2 }
            ]
        });

        const urteil = pruefeWerkzeugAufruf('validate_graph', kaputt);

        expect(urteil.status).toBe('nachbessern');
        if (urteil.status === 'nachbessern') {
            expect(urteil.rueckmeldung).toContain('Mathematical validation failed');
            // Nicht nur der Hinweis, dass etwas nicht stimmt, sondern was.
            expect(urteil.rueckmeldung.length).toBeGreaterThan('Mathematical validation failed: .'.length);
        }
    });

    it('verlangt Nachbesserung bei einer unbrauchbaren Rechenkette', () => {
        const urteil = pruefeWerkzeugAufruf('validate_calc_trace', 'kein JSON');

        expect(urteil.status).toBe('nachbessern');
        if (urteil.status === 'nachbessern') {
            expect(urteil.rueckmeldung).toContain('CALC_TRACE_SCHEMA');
        }
    });

    /**
     * Ruft das Modell ein Werkzeug auf, das hier nicht geprueft wird, darf die
     * Pruefung es nicht als Fehler werten — der Anbieter behandelt die Antwort
     * dann als gewoehnlichen Text.
     */
    it('meldet ein fremdes Werkzeug als unbekannt, nicht als Fehler', () => {
        expect(pruefeWerkzeugAufruf('irgendwas_anderes', '{}').status).toBe('unbekannt');
    });

    /**
     * Der Kern der Zusammenlegung: derselbe Entwurf muss bei jedem Anbieter
     * dasselbe Urteil bekommen. Vorher war das nur eine Hoffnung.
     */
    it('urteilt unabhaengig davon, welcher Anbieter fragt', () => {
        const a = pruefeWerkzeugAufruf('validate_graph', gueltigerGraph);
        const b = pruefeWerkzeugAufruf('validate_graph', gueltigerGraph);

        expect(a).toEqual(b);
    });

    it('gibt dem Modell eine begrenzte, aber ausreichende Zahl Nachbesserungen', () => {
        expect(MAX_TOOL_RETRIES).toBe(3);
    });
});
