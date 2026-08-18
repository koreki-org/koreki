import { GraphRunner } from '../../../src/lib/grading/GraphRunner';
import { TOLERANCE } from '../../../src/lib/grading/numeric-tolerance';
import type { GradingGraph, VariableDefinition } from '../../../src/lib/grading/types';

/**
 * Toleranz im Bewertungsgraphen (Layer 1)
 * ⚖️🔢
 *
 * GEFUNDENER FEHLER, 18.08.2026 — beim Lesen von GraphRunner.ts, nicht durch
 * einen Test.
 *
 * Das Prompt-Schema erlaubt dem Modell ausdrücklich `tolerance: null`. Der
 * Graph-Aufbau übernimmt die Zahl nur, wenn eine da ist — die Kennzeichnung
 * `validationType: 'tolerance'` bleibt aber stehen. `checkMatch` prüfte auf
 * `tolerance !== undefined` und fiel sonst auf EXAKTE Gleichheit zurück.
 *
 * Folge: Die Lehrkraft hat für einen Schritt Spielraum vorgesehen, die
 * Schülerin bekam trotzdem null Punkte für eine gerundete Antwort. Lautlos —
 * das Ergebnis sieht plausibel aus, es steht nur eine Null, wo eine Eins
 * stehen müsste.
 */

const variable = (p: Partial<VariableDefinition>): VariableDefinition => ({
    id: 'a',
    type: 'input',
    validationType: 'exact',
    maxPoints: 1,
    ...p
} as VariableDefinition);

const graph = (variables: VariableDefinition[]): GradingGraph => ({
    taskId: 'aufgabe-1',
    discipline: 'mathematics',
    variables
});

const punkte = (g: GradingGraph, antworten: Record<string, number | string>) =>
    GraphRunner.grade(g, antworten).stepResults[0];

describe('Toleranz ohne Zahl', () => {
    /**
     * DER GEMELDETE FALL. Beide Schritte sind als „tolerance" gekennzeichnet
     * und haben denselben Erwartungswert; die Schülerin gibt beide Male
     * dasselbe an. Vor der Reparatur gab es einmal einen Punkt und einmal
     * keinen.
     */
    it('bewertet mit und ohne angegebene Zahl gleich', () => {
        const mitZahl = graph([variable({ validationType: 'tolerance', tolerance: 0.05, defaultValue: 3.3333 })]);
        const ohneZahl = graph([variable({ validationType: 'tolerance', defaultValue: 3.3333 })]);

        expect(punkte(mitZahl, { a: 3.33 }).points).toBe(1);
        expect(punkte(ohneZahl, { a: 3.33 }).points).toBe(1);
        expect(punkte(ohneZahl, { a: 3.33 }).status).toBe('correct');
    });

    /** Der Rückfall nutzt denselben Spielraum wie die Rechenketten-Engine. */
    it('nutzt den gemeinsamen voreingestellten Spielraum', () => {
        const g = graph([variable({ validationType: 'tolerance', defaultValue: 100 })]);

        // Genau auf der Grenze gilt noch.
        expect(punkte(g, { a: 100 * (1 + TOLERANCE) }).points).toBe(1);
        // Knapp darüber nicht mehr.
        expect(punkte(g, { a: 100 * (1 + TOLERANCE) + 0.1 }).points).toBe(0);
    });

    /**
     * Eine ausdrücklich angegebene Zahl gewinnt weiterhin — auch eine
     * strengere. Der Rückfall darf keine Kulanz erfinden, wo die Lehrkraft
     * Genauigkeit verlangt hat.
     *
     * Zur Lesart der Zahl: ein Wert unter 1.0 zählt ZUSÄTZLICH als Bruchteil.
     * `0.001` heisst also „höchstens 0,001 absolut ODER 0,1 % relativ" — bei
     * einem Erwartungswert von 100 sind das 0,1. Wer hier ein Verhältnis
     * erwartet und eine absolute Schranke meint, verschätzt sich um Faktor 100.
     */
    it('laesst eine angegebene strengere Zahl gelten', () => {
        const streng = graph([variable({ validationType: 'tolerance', tolerance: 0.001, defaultValue: 100 })]);

        // 0,5 % daneben — ausserhalb beider Lesarten.
        expect(punkte(streng, { a: 100.5 }).points).toBe(0);
        // 0,05 % daneben — innerhalb der relativen Lesart.
        expect(punkte(streng, { a: 100.05 }).points).toBe(1);
        // Mit dem voreingestellten Spielraum waere sogar 100,5 noch richtig —
        // die angegebene Zahl ist also wirklich strenger.
        const locker = graph([variable({ validationType: 'tolerance', defaultValue: 100 })]);
        expect(punkte(locker, { a: 100.5 }).points).toBe(1);
    });

    /** „exact" bleibt exakt — der Rückfall gilt nur für „tolerance". */
    it('ruehrt die exakte Pruefung nicht an', () => {
        const exakt = graph([variable({ validationType: 'exact', defaultValue: 3.3333 })]);

        expect(punkte(exakt, { a: 3.33 }).points).toBe(0);
        expect(punkte(exakt, { a: 3.3333 }).points).toBe(1);
    });

    /**
     * Der Spielraum wirkt in beide Richtungen und auch bei negativen
     * Erwartungswerten — Differenzen kommen in Rechenwegen vor.
     */
    it('wirkt in beide Richtungen und bei negativen Werten', () => {
        const g = graph([variable({ validationType: 'tolerance', defaultValue: -200 })]);

        expect(punkte(g, { a: -204 }).points).toBe(1);
        expect(punkte(g, { a: -196 }).points).toBe(1);
        expect(punkte(g, { a: -150 }).points).toBe(0);
    });

    /** Auch eine als Text gelieferte Zahl muss den Spielraum bekommen. */
    it('nimmt eine Zahl in Textform an', () => {
        const g = graph([variable({ validationType: 'tolerance', defaultValue: 3.3333 })]);

        expect(punkte(g, { a: ' 3.33 ' }).points).toBe(1);
    });
});
