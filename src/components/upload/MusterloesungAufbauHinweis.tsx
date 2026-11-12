import React from 'react';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';

/**
 * Wie eine Musterloesung gegliedert ist.
 * 🌳
 *
 * Hier stand bis zum 11.11.2026 Prosa unter dem Titel „PRO TIPP": „Eine gute
 * Musterloesung ist das Herzstueck. Dokumentieren Sie hier alle Erwartungen und
 * Punkte pro Teilaufgabe." Der Satz sagt, dass es wichtig ist — nicht, wie es
 * aussieht. Dazu zwei Verstoesse: Versalien im Titel (Style Guide §0 verbietet
 * sie in der App) und Siezen, waehrend die App sonst durchgehend duzt.
 *
 * Gezeigt wird deshalb die Gliederung selbst. Koreki kennt genau DREI Ebenen,
 * und jede Klassenarbeit ist eine Kombination daraus:
 *   - Gemeinsamer Rahmen — gilt fuer ALLE Aufgaben (`modelSolutionContext`).
 *   - Stamm — gilt fuer die Teilaufgaben EINER Hauptaufgabe (`hauptaufgaben.ts`).
 *   - Teilaufgabe — die einzelne Frage mit ihren Punkten.
 *
 * EIN Beispiel mit allen drei Ebenen statt drei Beispielen in Reitern: Die drei
 * Ebenen sind eine Grammatik, keine Auswahl. Wer sie nebeneinander sieht,
 * versteht die Regel; wer durch Reiter klickt, sieht dreimal dasselbe.
 *
 * KEINE feste Nummerierung. `groupTasksByMain` in `task-utils.ts` liest den
 * Namen bis zur ersten Zahl und gruppiert „Aufgabe 1a", „1.1" und „A 3.1"
 * gleichermassen richtig. Ein Beispiel, das nur eine Schreibweise zeigt, laedt
 * zu der Frage ein, ob man seine Arbeit umnummerieren muss — man muss nicht,
 * und genau das sagt die letzte Zeile.
 */

/** Eine Zeile im Baum: Name links, Punkte daneben, Erklaerung rechts aussen. */
const Zeile: React.FC<{ name: string; punkte?: string; hinweis?: string }> = ({
    name,
    punkte,
    hinweis
}) => (
    <div className="flex items-baseline gap-2">
        <span className="text-foreground font-semibold">{name}</span>
        {punkte && <span className="text-primary font-semibold shrink-0">{punkte}</span>}
        {hinweis && (
            <span className="text-muted-foreground/70 text-xxs ml-auto shrink-0">{hinweis}</span>
        )}
    </div>
);

/** Eingerueckte Ebene — die Linie links zeigt die Zugehoerigkeit. */
const Ebene: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="ml-2 pl-3 border-l border-muted-foreground/25 space-y-1.5">{children}</div>
);

export const MusterloesungAufbauHinweis: React.FC = () => (
    <KorekiTooltip
        title="Aufbau einer Musterlösung"
        handbuch="musterloesung"
        position="bottom"
        align="left"
        widthClass="w-[22rem]"
        className="inline-flex shrink-0"
        content={
            <div className="space-y-1.5 text-xs">
                <Zeile name="Gemeinsamer Rahmen" hinweis="gilt für alle Aufgaben" />
                <Ebene>
                    <Zeile name="Aufgabe 1" hinweis="Hauptaufgabe" />
                    <Ebene>
                        <Zeile name="Stamm" hinweis="gilt für 1.1 und 1.2" />
                        <Zeile name="Aufgabe 1.1" punkte="4 P" />
                        <Zeile name="Aufgabe 1.2" punkte="6 P" />
                    </Ebene>
                    <Zeile name="Aufgabe 2" punkte="5 P" hinweis="ohne Teilaufgaben" />
                </Ebene>
            </div>
        }
        footer={
            <div className="space-y-1.5 text-xxs text-muted-foreground leading-relaxed">
                <p className="m-0">Je Teilaufgabe: erwartete Lösung und Punkte.</p>
                <p className="m-0">
                    Die Nummerierung übernimmt Koreki aus deiner Arbeit — <strong className="text-foreground font-semibold">1a</strong>,{' '}
                    <strong className="text-foreground font-semibold">1.1</strong> oder{' '}
                    <strong className="text-foreground font-semibold">A1.1</strong>. Du musst nichts umbenennen.
                </p>
            </div>
        }
    />
);
