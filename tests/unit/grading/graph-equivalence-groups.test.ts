import { parseGeneratedGraph } from '../../../src/lib/grading/graph-generator';
import { GraphRunner } from '../../../src/lib/grading/GraphRunner';

/**
 * Äquivalenzgruppen aus der Modell-Antwort (Layer 1)
 * 🛡️⏱️
 *
 * Eine Äquivalenzgruppe sagt: „diese Präfixe sind gleichwertig". Der
 * `GraphRunner` probiert daraufhin JEDE Zuordnung durch und behält die beste
 * für die Schülerin — wer seine Subnetze anders benannt hat, soll nicht dafür
 * bestraft werden.
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026: Diese Gruppen wurden ungeprüft aus der
 * Modell-Antwort übernommen. Zwei Folgen:
 *
 * 1. Eine Gruppe ohne `prefixes` liess die Bewertung mit einem TypeError
 *    abstürzen („Cannot read properties of undefined"). Der Aufrufer fängt ihn
 *    zwar — die Aufgabe verlor dabei aber still ihre Graph-Bewertung.
 * 2. Der Aufwand wächst FAKULTATIV. Gemessen: acht Präfixe brauchen knapp eine
 *    Sekunde, zehn über eine Minute. Im PURE- und Desktop-Betrieb läuft das im
 *    Browser der Lehrkraft — dort ist das kein langsamer Vorgang mehr, sondern
 *    ein eingefrorenes Fenster. Und ein Einfrieren fängt kein `catch` ab.
 *
 * Modell-Ausgaben sind Eingaben, keine Zusicherungen.
 */

const antwort = (equivalenceGroups: unknown) => JSON.stringify({
    taskId: 'aufgabe-1',
    discipline: 'computer-science-networking',
    variables: [
        { id: 'a_netid', type: 'input', validationType: 'exact', defaultValue: '10.0.0.0', maxPoints: 1 },
        { id: 'b_netid', type: 'input', validationType: 'exact', defaultValue: '10.0.1.0', maxPoints: 1 }
    ],
    equivalenceGroups
});

const praefixe = (anzahl: number) =>
    Array.from({ length: anzahl }, (_, i) => String.fromCharCode(97 + i) + '_');

describe('Kaputte Gruppen', () => {
    /** DER ABSTURZ. Ohne `prefixes` gab es einen TypeError in der Bewertung. */
    it('verwirft eine Gruppe ohne Praefix-Liste', () => {
        const graph = parseGeneratedGraph(antwort([{ id: 'g1' }]));

        expect(graph).not.toBeNull();
        expect(graph!.equivalenceGroups).toBeUndefined();
        expect(() => GraphRunner.grade(graph!, { a_netid: '10.0.0.0' })).not.toThrow();
    });

    it.each([
        ['Text statt Liste', { id: 'g1', prefixes: 'a_' }],
        ['Zahl statt Liste', { id: 'g1', prefixes: 42 }],
        ['gar kein Objekt', 'kaputt'],
        ['null', null]
    ])('verwirft %s', (_name, gruppe) => {
        const graph = parseGeneratedGraph(antwort([gruppe]));

        expect(graph!.equivalenceGroups).toBeUndefined();
        expect(() => GraphRunner.grade(graph!, { a_netid: '10.0.0.0' })).not.toThrow();
    });

    /** Nicht-Text-Einträge werden aussortiert, der Rest bleibt brauchbar. */
    it('sortiert unbrauchbare Eintraege aus und behaelt den Rest', () => {
        const graph = parseGeneratedGraph(antwort([{ id: 'g1', prefixes: ['a_', 42, null, 'b_', '  '] }]));

        expect(graph!.equivalenceGroups![0].prefixes).toEqual(['a_', 'b_']);
    });

    it('entfernt doppelte Praefixe', () => {
        const graph = parseGeneratedGraph(antwort([{ id: 'g1', prefixes: ['a_', 'b_', 'a_'] }]));

        expect(graph!.equivalenceGroups![0].prefixes).toEqual(['a_', 'b_']);
    });

    /**
     * Eine Gruppe aus einem einzigen Präfix beschreibt keine Gleichwertigkeit
     * und kostet trotzdem einen Durchlauf.
     */
    it('verwirft eine Gruppe mit nur einem Praefix', () => {
        expect(parseGeneratedGraph(antwort([{ id: 'g1', prefixes: ['a_'] }]))!.equivalenceGroups)
            .toBeUndefined();
    });

    it('nimmt eine brauchbare Gruppe an', () => {
        const graph = parseGeneratedGraph(antwort([{ id: 'g1', prefixes: ['a_', 'b_'] }]));

        expect(graph!.equivalenceGroups).toHaveLength(1);
        expect(graph!.equivalenceGroups![0].prefixes).toEqual(['a_', 'b_']);
    });
});

describe('Zu grosse Gruppen', () => {
    /** Sieben Präfixe sind 5040 Zuordnungen — die Obergrenze. */
    it('laesst sieben Praefixe zu', () => {
        expect(parseGeneratedGraph(antwort([{ id: 'g1', prefixes: praefixe(7) }]))!.equivalenceGroups)
            .toHaveLength(1);
    });

    it('verwirft acht Praefixe', () => {
        expect(parseGeneratedGraph(antwort([{ id: 'g1', prefixes: praefixe(8) }]))!.equivalenceGroups)
            .toBeUndefined();
    });

    /**
     * Auch das PRODUKT über mehrere Gruppen wächst multiplikativ. Zwei Gruppen
     * zu je sechs Präfixen sind einzeln harmlos (720) und zusammen über eine
     * halbe Million Zuordnungen.
     */
    it('begrenzt auch die Summe mehrerer Gruppen', () => {
        const graph = parseGeneratedGraph(antwort([
            { id: 'g1', prefixes: praefixe(6) },
            { id: 'g2', prefixes: praefixe(6) }
        ]));

        expect(graph!.equivalenceGroups).toHaveLength(1);
    });

    /**
     * DIE EIGENTLICHE ZUSICHERUNG: die Bewertung bleibt bedienbar. Der Wert ist
     * bewusst grosszügig — geprüft wird nicht die Geschwindigkeit, sondern dass
     * kein fakultatives Wachstum mehr durchkommt. Ungebremst brauchte derselbe
     * Aufruf mit zehn Präfixen über eine Minute.
     */
    it('bewertet auch mit uebergrossen Gruppen in Sekundenbruchteilen', () => {
        const graph = parseGeneratedGraph(antwort([{ id: 'g1', prefixes: praefixe(10) }]));

        const start = Date.now();
        GraphRunner.grade(graph!, { a_netid: '10.0.0.0', b_netid: '10.0.1.0' });

        expect(Date.now() - start).toBeLessThan(1000);
    });
});

describe('Was die Gruppen leisten sollen', () => {
    /**
     * Der Sinn der Sache: die Schülerin hat die Subnetze vertauscht benannt und
     * bekommt trotzdem ihre Punkte.
     */
    it('findet die guenstigste Zuordnung fuer die Schuelerin', () => {
        const graph = parseGeneratedGraph(antwort([{ id: 'g1', prefixes: ['a_', 'b_'] }]));

        // Vertauscht geschrieben — inhaltlich richtig.
        const ergebnis = GraphRunner.grade(graph!, { a_netid: '10.0.1.0', b_netid: '10.0.0.0' });

        expect(ergebnis.totalPoints).toBe(2);
    });
});
