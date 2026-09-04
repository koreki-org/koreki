/**
 * Waechter: Wo die Sandbox nichts nachgerechnet hat, darf sie nichts behaupten.
 * 🧮🚫
 *
 * ANLASS (04.09.2026). Eine Schuelerin schrieb "2 ml in 30 min, das sind 4 ml/h" —
 * die Rechnung steht in WORTEN. Die Extraktion machte daraus `formula: "4"`: kein
 * Operator, also nichts, was die Sandbox nachvollziehen koennte.
 *
 * Zwei Fehler kamen dadurch zusammen:
 *
 * 1. Der Beweistext meldete "✓ Ja — jeder Schritt ergibt genau das, was daneben
 *    steht." Wo nichts gerechnet wird, entsteht kein Widerspruch — und das Ausbleiben
 *    eines Fehlers las sich als Bestaetigung. Die Lehrkraft bekam eine Zusicherung,
 *    die niemand geprueft hatte.
 * 2. Die Ueberschrift des Aufklappers verspricht "Die Rechenkette hat die Aufgabe
 *    nachgerechnet". Wer den Block nicht oeffnet, glaubt an einen Beweis, den es
 *    nicht gibt.
 *
 * DIE REGEL. Findet die Sandbox keinen nachrechenbaren Ausdruck, sagt sie das —
 * im Text UND in der Ueberschrift. Sie behauptet weder "richtig" noch "falsch".
 *
 * Die Erkennung laeuft ueber `NICHT_NACHGERECHNET`, eine gemeinsame Konstante:
 * `formatCalcTraceFeedback` schreibt sie, `splitFeedback` sucht sie. Zwei Literale
 * wuerden auseinanderlaufen, und der Indikator verschwaende stumm.
 */
import { evaluateCalcTrace, formatCalcTraceFeedback, NICHT_NACHGERECHNET } from '@/lib/grading/CalcTrace';
import { splitFeedback } from '@/components/ui/feedback-split';
import type { StudentASTStep, TargetGoal } from '@/lib/grading/calc-trace-types';

jest.mock('@/lib/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), debug: jest.fn(), info: jest.fn() },
}));

/** Der Anlassfall: Die Rechnung steht in Worten, die Extraktion liefert nur die Zahl. */
const nurEineZahl: StudentASTStep[] = [
    { id: 'step_1', original_text: '2 ml in 30 min, das sind 4 ml/h.', formula: '4', result: 4, unit: 'ml/h' }
];
const ziel: TargetGoal = { targetValue: '20', unit: 'ml/h', maxPoints: 2 };

const beweis = (ast: StudentASTStep[], t: TargetGoal = ziel) =>
    formatCalcTraceFeedback(evaluateCalcTrace(ast, t), t);

describe('Rechenweg ohne nachrechenbaren Ausdruck', () => {
    it('behauptet nicht, jeder Schritt sei bestaetigt', () => {
        const text = beweis(nurEineZahl);

        expect(text).toContain(NICHT_NACHGERECHNET);
        expect(text).not.toMatch(/jeder Schritt ergibt genau das/);
    });

    /**
     * Der Satz muss die Verwechslung ausdruecklich ausraeumen: "nicht nachgerechnet"
     * heisst NICHT "nicht gerechnet". Ohne diesen Zusatz liest die Lehrkraft einen
     * Vorwurf gegen die Schuelerin, wo eine Grenze unserer Auswertung steht.
     */
    it('haelt fest, dass das kein Vorwurf an die Schuelerin ist', () => {
        expect(beweis(nurEineZahl)).toMatch(/heißt NICHT, dass nicht gerechnet wurde/);
    });

    it('meldet den Zustand an die Ueberschrift', () => {
        const feedback = `[📐 CalcTrace Engine - Mathematischer Abgleich]\n${beweis(nurEineZahl)}`;

        expect(splitFeedback(feedback).nichtNachgerechnet).toBe(true);
    });
});

describe('Rechenweg mit nachrechenbarem Ausdruck', () => {
    /** Die Gegenprobe: Wo wirklich gerechnet wurde, darf der Hinweis NICHT erscheinen. */
    const echteRechnung: StudentASTStep[] = [
        { id: 'step_1', original_text: '2 / 30 * 60 = 4', formula: '(2 / 30) * 60', result: 4, unit: 'ml/h' }
    ];

    it('bestaetigt den Rechenweg wie bisher', () => {
        const text = beweis(echteRechnung);

        expect(text).not.toContain(NICHT_NACHGERECHNET);
        expect(text).toMatch(/jeder Schritt ergibt genau das/);
    });

    it('setzt die Ueberschrift nicht auf den Warnzustand', () => {
        const feedback = `[📐 CalcTrace Engine - Mathematischer Abgleich]\n${beweis(echteRechnung)}`;

        expect(splitFeedback(feedback).nichtNachgerechnet).toBe(false);
    });

    /**
     * Und ein echter Verrechner bleibt ein echter Verrechner — der neue Zweig darf
     * ihn nicht verschlucken.
     */
    it('meldet einen Verrechner weiterhin als solchen', () => {
        const falsch: StudentASTStep[] = [
            { id: 'step_1', original_text: '18 / 3 = 9', formula: '18 / 3', result: 9 }
        ];
        const text = beweis(falsch, { targetValue: '6', maxPoints: 2 });

        expect(text).not.toContain(NICHT_NACHGERECHNET);
        expect(text).toMatch(/Verrechner/);
    });
});
