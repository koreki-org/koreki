import { formatPluginFeedback } from '../../../src/lib/grading/feedback-formatter';
import type { GradingResult, StepResult, GradingGraph } from '../../../src/lib/grading/types';

/**
 * Was die Schülerin in ihrer Korrektur liest (Layer 1)
 * 📄👀
 *
 * Dieser Baustein baut die Ergebnistabelle für Subnetz-Aufgaben. Er bewertet
 * nichts — aber er ist das Einzige, was von der Bewertung tatsächlich bei der
 * Schülerin ankommt. Ein Fehler hier ist nicht „nur Kosmetik": er sagt ihr
 * etwas Falsches über ihre eigene Arbeit.
 *
 * GEFUNDENER FEHLER, 18.08.2026 — beim Lesen, nicht durch einen Test.
 * Ein ausgelassener Eingabewert erscheint im Ergebnis als `studentValue: null`
 * (so setzt es der GraphRunner ausdrücklich). Die Zellen-Formatierung prüfte
 * aber nur auf `undefined` und den Leerstring — in der Tabelle stand deshalb
 * wörtlich `null [f]`, wo `fehlt [f]` stehen muss.
 */

const schritt = (p: Partial<StepResult>): StepResult => ({
    variableId: 'subnet_a_netid',
    status: 'correct',
    expectedValue: '192.168.1.0',
    studentValue: '192.168.1.0',
    computedValueBasedOnErrors: '192.168.1.0',
    points: 1,
    maxPoints: 1,
    note: ''
} as StepResult);

const ergebnis = (schritte: Partial<StepResult>[]): GradingResult => ({
    taskId: 'aufgabe-1',
    totalPoints: 0,
    maxPoints: schritte.length,
    stepResults: schritte.map(s => ({ ...schritt({}), ...s })) as StepResult[]
});

/** Die Zeile eines Subnetzes aus der erzeugten Tabelle. */
const zeile = (text: string | null, subnetz: string): string =>
    String(text).split('\n').find(z => z.includes(`**Subnetz ${subnetz}**`)) ?? '';

describe('Nicht beantwortete Felder', () => {
    /**
     * DER GEMELDETE FALL. `null` heisst „nicht beantwortet", genau wie
     * `undefined` — nicht „die Schülerin hat das Wort null geschrieben".
     */
    it('schreibt "fehlt" statt "null"', () => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            { variableId: 'subnet_a_netid', status: 'primary_error', studentValue: null, points: 0 }
        ]));

        expect(zeile(t, 'A')).toContain('fehlt');
        expect(zeile(t, 'A')).not.toContain('null');
    });

    it.each([
        ['undefined', undefined],
        ['null', null],
        ['leerer Text', '']
    ])('behandelt %s als nicht beantwortet', (_name, wert) => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            { variableId: 'subnet_a_netid', status: 'primary_error', studentValue: wert as never, points: 0 }
        ]));

        expect(zeile(t, 'A')).toContain('fehlt');
    });

    /** Eine echte Null als Antwort ist etwas anderes als keine Antwort. */
    it('zeigt eine geschriebene Null als Wert an', () => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            { variableId: 'subnet_a_hosts', status: 'primary_error', studentValue: 0, expectedValue: 50, points: 0 }
        ]));

        expect(zeile(t, 'A')).toContain('| 0 [f]');
        expect(zeile(t, 'A')).not.toContain('fehlt');
    });
});

describe('Der Erwartungswert in der Meldung', () => {
    it('nennt den erwarteten Wert bei einem Fehler', () => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            { variableId: 'subnet_a_netid', status: 'primary_error', studentValue: '10.0.0.0', points: 0 }
        ]));

        expect(zeile(t, 'A')).toContain('Erw: 192.168.1.0');
    });

    /**
     * Ein Erwartungswert darf eine Liste GLEICHWERTIGER Alternativen sein. Roh
     * in eine Zeichenkette gegossen wurde daraus `a,b` — das liest sich wie ein
     * einziger, seltsamer Wert. Ausgeschrieben ist erkennbar, dass beides
     * gezählt hätte.
     */
    it('schreibt Alternativen als solche aus', () => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            {
                variableId: 'subnet_a_mask',
                status: 'primary_error',
                studentValue: '/23',
                expectedValue: ['/24', '255.255.255.0'],
                points: 0
            }
        ]));

        expect(zeile(t, 'A')).toContain('/24 oder 255.255.255.0');
    });

    it('faellt ohne Erwartungswert auf "k.A." zurueck', () => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            { variableId: 'subnet_a_netid', status: 'primary_error', studentValue: 'x', expectedValue: null, points: 0 }
        ]));

        expect(zeile(t, 'A')).toContain('k.A.');
    });
});

describe('Kennzeichnung der Schritte', () => {
    it.each([
        ['correct', '[r]'],
        ['consecutive_correct', '[FF]'],
        ['primary_error', '[f]']
    ])('kennzeichnet %s mit %s', (status, zeichen) => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            { variableId: 'subnet_a_netid', status: status as StepResult['status'] }
        ]));

        expect(zeile(t, 'A')).toContain(zeichen);
    });

    /**
     * Ein Folgefehler-Schritt ist RICHTIG gerechnet — nur auf falscher
     * Grundlage. Er darf nicht wie ein Fehler aussehen, sonst wirkt die
     * Korrektur strenger, als sie ist.
     */
    it('zeigt beim Folgefehler keinen Erwartungswert', () => {
        const t = formatPluginFeedback('vlsm', ergebnis([
            { variableId: 'subnet_a_netid', status: 'consecutive_correct', studentValue: '10.0.0.0' }
        ]));

        expect(zeile(t, 'A')).toContain('[FF]');
        expect(zeile(t, 'A')).not.toContain('Erw:');
    });
});

describe('Wann ueberhaupt eine Tabelle entsteht', () => {
    it('baut eine Tabelle fuer Subnetz-Aufgaben', () => {
        const t = formatPluginFeedback('vlsm', ergebnis([{ variableId: 'subnet_a_netid' }]));

        expect(t).toContain('| Subnetz |');
        expect(t).toContain('Netz-ID');
    });

    /**
     * Mathe und Physik bekommen KEINE Subnetz-Tabelle, auch wenn ihre
     * Variablennamen zufaellig einen Unterstrich enthalten. Sonst stuende ueber
     * einer Bruchrechnung „Mathematischer VLSM Abgleich".
     */
    it.each(['math', 'physics', 'general', 'general-science'])(
        'baut fuer die Disziplin "%s" keine Subnetz-Tabelle',
        (discipline) => {
            const graph = { taskId: 't', discipline, variables: [] } as GradingGraph;
            const t = formatPluginFeedback('', ergebnis([{ variableId: 'zaehler_wert' }]), graph);

            expect(t).toBeNull();
        }
    );

    it('liefert ohne Ergebnisliste nichts', () => {
        expect(formatPluginFeedback('vlsm', {} as GradingResult)).toBeNull();
    });
});
