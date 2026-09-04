import React from 'react';

/**
 * Was die beiden Sandbox-Beweise bedeuten — in der Sprache der Lehrkraft.
 *
 * Der technische Block darunter ist urspruenglich fuer das Sprachmodell geschrieben
 * (`formatCalcTraceForPrompt`) und benutzt dessen Vokabular: "Proof A", "Proof B",
 * "AST". Eine Lehrkraft sieht diese Woerter zum ersten Mal, wenn sie den Block
 * oeffnet — und findet nirgends, was sie heissen.
 *
 * Bewusst eine TABELLE und kein Fliesstext: Gefragt ist nicht, wie die Engine
 * arbeitet, sondern was aus einer Kombination FOLGT. Das ist eine Zuordnung, und
 * Zuordnungen liest man als Tabelle schneller als als Absatz.
 *
 * Bewusst KEIN Tooltip: Der Inhalt passt nicht in einen, und auf dem Tablet — wo
 * korrigiert wird — erscheint ein Tooltip erst nach Antippen. Wer den Block
 * geoeffnet hat, ist ohnehin schon hier.
 *
 * Gilt nur fuer die Rechenkette. Der Bewertungsgraph (PANG/AGS) kennt diese beiden
 * Beweise nicht und bekommt deshalb keine Legende untergeschoben, die auf ihn nicht
 * zutrifft.
 */

/** Eine Zeile der Folgen-Tabelle. */
const FOLGEN: { a: string; b: string; folge: string; betont?: boolean }[] = [
    { a: '✓', b: '✓', folge: 'Punkt — durch Nachrechnen belegt' },
    { a: '✗', b: '—', folge: 'kein Punkt — die Rechnung enthält einen Verrechner' },
    {
        a: '✓',
        b: '✗',
        folge: 'Koreki entscheidet nicht. Richtig gerechnet, Ziel verfehlt — das kann ein '
            + 'Folgefehler aus einer früheren Teilaufgabe sein oder ein falscher Ansatz. '
            + 'Diese Frage geht mit ihrer Begründung an die KI; deren Punktzahl zählt dann.',
        betont: true
    }
];

export const CalcTraceLegende: React.FC = () => (
    <div className="mb-4 pb-4 border-b border-primary/10 font-sans">
        <dl className="space-y-1 mb-3">
            <div className="flex gap-2">
                <dt className="font-semibold text-primary shrink-0 w-[4.5rem]">Proof A</dt>
                <dd className="text-muted-foreground">Der eigene Rechenweg stimmt in sich — unabhängig von Ihrer Musterlösung.</dd>
            </div>
            <div className="flex gap-2">
                <dt className="font-semibold text-primary shrink-0 w-[4.5rem]">Proof B</dt>
                <dd className="text-muted-foreground">Der Zielwert aus Ihrer Musterlösung steht am Ende da.</dd>
            </div>
        </dl>

        <div className="space-y-1.5">
            {FOLGEN.map(z => (
                <div key={z.a + z.b} className="flex gap-2 items-baseline">
                    <span className="shrink-0 w-[4.5rem] font-semibold text-primary tabular-nums">
                        A {z.a}  B {z.b}
                    </span>
                    <span className={z.betont ? 'text-foreground' : 'text-muted-foreground'}>
                        {z.folge}
                    </span>
                </div>
            ))}
        </div>
    </div>
);
