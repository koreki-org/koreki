import { resolveEngineVerdict, normalizeCriterionSource, isEngineOwned, stepHasSandboxError } from '../../../src/lib/grading/criterion-source';
import type { EngineEvidence } from '../../../src/lib/grading/criterion-source';

/**
 * Urteil der Engine über ein Kriterium (Layer 1)
 * ⚖️🔍
 *
 * Diese Funktion ist die EINZIGE Stelle, an der aus Sandbox-Tatsachen ein
 * Erfüllt/Nicht-erfüllt wird. Prompt-Aufbau und Punktevergabe rufen sie beide
 * auf, damit sie nicht auseinanderlaufen: Was im Prompt als bindend angekündigt
 * wird, ist exakt das, was später gezählt wird.
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026: Das Modul verletzte seine eigene, wörtlich
 * formulierte Regel. Über dem Rechenweg-Pfad stand:
 *
 *   „Nur echte Rechenfehler belasten den Schüler. Ein Schritt, den die Sandbox
 *    nicht parsen konnte, sagt nichts über seine Richtigkeit aus — ihn als
 *    Fehler zu werten hiesse, dem Schüler eine Grenze unserer Auswertung
 *    anzulasten."
 *
 * Der Ergebnis-Pfad daneben nahm alle Sandbox-Fehler, auch Syntax-Fehler. Die
 * Schülerin las damit „Rechenfehler im Rechenweg (Schritte: step_2)" für einen
 * Schritt, den sie richtig gerechnet, unsere Auswertung aber nicht gelesen hat.
 */

const beleg = (p: Partial<EngineEvidence> = {}): EngineEvidence => ({
    ast: [
        { id: 'step_1', original_text: '2 * 3', formula: '2*3', result: 6 },
        { id: 'step_2', original_text: 'x', formula: '4 + 5', result: 9 }
    ],
    sandboxErrors: [],
    perTargetResult: [
        { targetIndex: 0, reached: true, hasCalculationError: false, associatedStepIds: ['step_1', 'step_2'] }
    ],
    ...p
} as unknown as EngineEvidence);

/** Ein Syntax-Fehler ist UNSERE Grenze, kein Fehler der Schülerin. */
const syntaxFehler = 'Syntax-Fehler in step_2 (§§§): Unexpected token';
const rechenFehler = 'Rechenfehler in step_1: Formel ergibt 6, aber Schüler notierte 7';

describe('Syntax-Fehler duerfen niemandem angelastet werden', () => {
    /** DER GEMELDETE FALL — der Ergebnis-Pfad. */
    it('nennt beim Ergebnis-Kriterium nur echte Rechenfehler', () => {
        const urteil = resolveEngineVerdict('proofB', 0, beleg({
            sandboxErrors: [rechenFehler, syntaxFehler],
            perTargetResult: [{ targetIndex: 0, reached: true, hasCalculationError: true, associatedStepIds: ['step_1', 'step_2'] }]
        } as unknown as EngineEvidence));

        expect(urteil.begruendung).toContain('step_1');
        expect(urteil.begruendung).not.toContain('step_2');
        expect(urteil.stepIds).toEqual(['step_1']);
    });

    /** Der Rechenweg-Pfad tat es schon vorher richtig — er muss es weiter tun. */
    it('nennt beim Rechenweg-Kriterium nur echte Rechenfehler', () => {
        const urteil = resolveEngineVerdict('proofA', 0, beleg({
            sandboxErrors: [rechenFehler, syntaxFehler]
        }));

        expect(urteil.stepIds).toEqual(['step_1']);
    });

    /**
     * BEIDE WEGE, EINE REGEL. Wenn ausschliesslich Syntax-Fehler vorliegen,
     * darf kein einziger Schritt als Rechenfehler benannt werden.
     */
    it.each(['proofA', 'proofB'] as const)(
        'belastet bei "%s" niemanden, wenn es nur Syntax-Fehler gibt',
        (source) => {
            const urteil = resolveEngineVerdict(source, 0, beleg({
                sandboxErrors: [syntaxFehler],
                perTargetResult: [{ targetIndex: 0, reached: true, hasCalculationError: false, associatedStepIds: ['step_1', 'step_2'] }]
            } as unknown as EngineEvidence));

            expect(urteil.begruendung).not.toMatch(/Rechenfehler/);
        }
    );
});

describe('Die drei Engine-Kriterien', () => {
    it('bestaetigt ein erreichtes Ziel ohne Rechenfehler', () => {
        const urteil = resolveEngineVerdict('proofB', 0, beleg());

        expect(urteil.erfuellt).toBe(true);
        expect(urteil.begruendung).toMatch(/Zielwert erreicht/);
    });

    /**
     * GEAENDERT AM 04.09.2026. Hier stand "lehnt ein nicht erreichtes Ziel ab" mit
     * derselben Lage, aber der Erwartung `begruendung: /nicht erreicht/`.
     *
     * Ein verfehltes Ziel allein traegt dieses Urteil nicht mehr: Hat die Schuelerin
     * ihren eigenen Rechenweg fehlerfrei ausgefuehrt, tritt die Sandbox zurueck
     * (siehe den Block "Zielwert verfehlt, eigener Rechenweg sauber" weiter unten).
     * Bindend abgelehnt wird nur noch, was sie auch belegen kann — ein Verrechner
     * im eigenen Weg oder gar kein nachvollziehbarer Rechenweg.
     */
    it('lehnt ein nicht erreichtes Ziel ohne tragfaehigen Rechenweg ab', () => {
        const urteil = resolveEngineVerdict('proofB', 0, beleg({
            ast: [{ id: 'step_1', original_text: 'x = 5', formula: 'x', result: 5 }],
            perTargetResult: [{ targetIndex: 0, reached: false, hasCalculationError: false, associatedStepIds: [] }]
        } as unknown as EngineEvidence));

        expect(urteil.erfuellt).toBe(false);
        expect(urteil.begruendung).toMatch(/nicht erreicht/);
    });


    /**
     * Ein nacktes Ergebnis („2.5 GHz") ist kein Rechenweg. Ohne eigene Rechnung
     * kann der Rechenweg-Punkt nicht vergeben werden.
     */
    it('vergibt den Rechenweg-Punkt nicht fuer abgeschriebene Zahlen', () => {
        const urteil = resolveEngineVerdict('proofA', 0, beleg({
            ast: [{ id: 'step_1', original_text: '2.5 GHz', formula: '2.5', result: 2.5 }]
        } as unknown as EngineEvidence));

        expect(urteil.erfuellt).toBe(false);
        expect(urteil.begruendung).toMatch(/Kein nachvollziehbarer Rechenweg/);
    });

    /**
     * Der Rechenweg wird gegen den EIGENEN Zettel geprüft, nicht gegen die
     * Musterlösung: Wer das Ziel verfehlt, hat trotzdem einen Rechenweg — und
     * der ist prüfbar.
     */
    it('bewertet den Rechenweg auch bei verfehltem Ziel', () => {
        const urteil = resolveEngineVerdict('proofA', 0, beleg({
            perTargetResult: [{ targetIndex: 0, reached: false, hasCalculationError: false, associatedStepIds: [] }]
        } as unknown as EngineEvidence));

        expect(urteil.erfuellt).toBe(true);
        expect(urteil.begruendung).toMatch(/fehlerfrei gerechnet/);
    });
});

describe('Schritt-Zuordnung', () => {
    /**
     * Mit Wortgrenzen — sonst passte „step_1" auch auf „step_10" und ab zehn
     * Schritten landeten Rechenfehler beim falschen Schritt.
     */
    it('verwechselt step_1 nicht mit step_10', () => {
        const fehler = ['Rechenfehler in step_10: ...'];

        expect(stepHasSandboxError('step_10', fehler)).toBe(true);
        expect(stepHasSandboxError('step_1', fehler)).toBe(false);
    });
});

describe('Zustaendigkeit eines Kriteriums', () => {
    it('respektiert ein ausdruecklich gesetztes source', () => {
        expect(normalizeCriterionSource({ id: 'werte_einsetzen', label: 'Werte', source: 'llm' })).toBe('llm');
        expect(normalizeCriterionSource({ id: 'irgendwas', label: 'x', source: 'proofA' })).toBe('proofA');
    });

    /**
     * Ohne gueltiges `source` entscheidet das Modell — auch dann, wenn die
     * Bezeichnung nach Werteeinsetzung klingt. Die frueher hier greifende
     * Wortsuche ist mit `proofValues` entfallen (03.09.2026).
     */
    it('weist Einsetzungs-Kriterien nicht mehr am Namen der Engine zu', () => {
        expect(normalizeCriterionSource({ id: 'einsetzen', label: '' })).toBe('llm');
        expect(normalizeCriterionSource({ id: 'x', label: 'Werte korrekt eingesetzt' })).toBe('llm');
    });

    /** Im Zweifel entscheidet das Modell, nicht die Engine. */
    it('faellt im Zweifel auf das Modell zurueck', () => {
        expect(normalizeCriterionSource({ id: 'begruendung', label: 'Fachliche Begründung' })).toBe('llm');
        expect(normalizeCriterionSource({ id: 'x', label: 'y', source: 'unsinn' })).toBe('llm');
    });

    it('trennt Engine-Kriterien von Modell-Kriterien', () => {
        expect(isEngineOwned('llm')).toBe(false);
        (['proofA', 'proofB'] as const).forEach(s => expect(isEngineOwned(s)).toBe(true));
    });
});

/**
 * Der dritte Zustand: die Sandbox tritt zurueck.
 * ⚖️🤷
 *
 * ANLASS (04.09.2026). Verfehlt eine Schuelerin den Zielwert der Musterloesung,
 * hat aber ihren EIGENEN Rechenweg fehlerfrei ausgefuehrt, ist das die Signatur
 * eines Folgefehlers: Wer sich in a) verrechnet und in b) mit dem falschen Wert
 * sauber weiterrechnet, verfehlt das Ziel zwangslaeufig.
 *
 * Es ist aber auch die Signatur einer falschen METHODE, die sauber gerechnet
 * wurde. Beides auseinanderzuhalten setzt den Rechenweg der Musterloesung
 * voraus, den ein Rechenziel nicht enthaelt.
 *
 * Bis zum 04.09.2026 urteilte die Sandbox hier bindend "nicht erfuellt" — und
 * kein Modell konnte das korrigieren, auch der Skill "Folgefehler-Tracking"
 * nicht. Gemessen an einer Physik-Aufgabe: Die Schuelerin rechnete in b) mit
 * ihrem eigenen falschen v fehlerfrei weiter und verlor den Punkt trotzdem.
 *
 * DIE REGEL. Ein bindendes Urteil, das die Sandbox nicht belegen kann, ist
 * schlechter als gar keines. Sie reicht ihre Tatsachen weiter und laesst das
 * Modell entscheiden — dieselbe Regel, nach der `proofValues` entfallen ist.
 */
describe('Zielwert verfehlt, eigener Rechenweg sauber', () => {
    /** Kein Rechenfehler in den eigenen Schritten, Ziel trotzdem nicht erreicht. */
    const folgefehlerLage = beleg({
        sandboxErrors: [],
        perTargetResult: [
            { targetIndex: 0, reached: false, hasCalculationError: false, associatedStepIds: ['step_1', 'step_2'] }
        ]
    } as unknown as EngineEvidence);

    it('entscheidet nicht, sondern legt es dem Modell vor', () => {
        const urteil = resolveEngineVerdict('proofB', 0, folgefehlerLage);

        expect(urteil.unentschieden).toBe(true);
        expect(urteil.begruendung).toContain('Folgefehler');
    });

    /**
     * `erfuellt` bleibt `false`. Ein Aufrufer, der das neue Feld nicht kennt,
     * verhaelt sich wie bisher und verschenkt keine Punkte.
     */
    it('verschenkt keine Punkte an Aufrufer, die den Zustand nicht kennen', () => {
        expect(resolveEngineVerdict('proofB', 0, folgefehlerLage).erfuellt).toBe(false);
    });

    /**
     * Die Gegenprobe. Wer sich in der EIGENEN Rechnung verrechnet hat, faellt
     * bindend durch — dort ist die Sandbox im Recht und tritt nicht zurueck.
     */
    it('bleibt bindend, wenn der eigene Rechenweg einen Verrechner enthaelt', () => {
        const urteil = resolveEngineVerdict('proofB', 0, beleg({
            sandboxErrors: [rechenFehler],
            perTargetResult: [
                { targetIndex: 0, reached: false, hasCalculationError: false, associatedStepIds: ['step_1', 'step_2'] }
            ]
        } as unknown as EngineEvidence));

        expect(urteil.unentschieden).toBeFalsy();
        expect(urteil.erfuellt).toBe(false);
    });

    /**
     * Die zweite Gegenprobe, und die wichtigere: Ein leeres Blatt darf nicht als
     * "moeglicher Folgefehler" durchgehen. `bewerteRechenweg` verlangt einen
     * nachvollziehbaren Rechenschritt — ohne den gibt es nichts zurueckzutreten.
     */
    it('tritt bei einem leeren Rechenweg nicht zurueck', () => {
        const urteil = resolveEngineVerdict('proofB', 0, beleg({
            ast: [],
            sandboxErrors: [],
            perTargetResult: [
                { targetIndex: 0, reached: false, hasCalculationError: false, associatedStepIds: [] }
            ]
        } as unknown as EngineEvidence));

        expect(urteil.unentschieden).toBeFalsy();
        expect(urteil.erfuellt).toBe(false);
    });

    /** Ein erreichter Zielwert bleibt erfuellt — der neue Zweig darf ihn nicht abfangen. */
    it('laesst einen erreichten Zielwert unberuehrt', () => {
        const urteil = resolveEngineVerdict('proofB', 0, beleg());

        expect(urteil.erfuellt).toBe(true);
        expect(urteil.unentschieden).toBeFalsy();
    });
});
