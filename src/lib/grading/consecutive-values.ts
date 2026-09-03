/**
 * Folgefehler ueber Aufgabengrenzen hinweg.
 *
 * WARUM ES DIESE DATEI GIBT. `evaluateCalcTrace` bekommt den Rechenweg einer
 * Aufgabe und ihr eigenes Ziel — mehr nicht. Aufgabe a) und Aufgabe b) sind
 * getrennte Aufgaben mit je eigenem `targetGoal`. Die Sandbox hat damit kein
 * Gedaechtnis ueber Aufgabengrenzen und kann zwei voellig verschiedene Faelle
 * nicht auseinanderhalten:
 *
 *   1. Der Schueler uebernimmt seinen EIGENEN falschen Wert aus a) und rechnet
 *      damit in b) einwandfrei weiter. Ein Fehler, einmal zu bestrafen.
 *   2. Der Schueler schreibt einen in der AUFGABE GEGEBENEN Wert falsch ab.
 *      Das ist ein zweiter, eigener Fehler.
 *
 * Beide sehen fuer die Sandbox gleich aus: Ziel verfehlt, Arithmetik sauber.
 * Ohne die Unterscheidung faellt Fall 1 doppelt zur Last — gemessen am
 * 02.09.2026 an sechs Rechenaufgaben, vier davon schlechter als ohne Sandbox.
 *
 * Die Graph-Engine kennt diesen Zustand laengst als `consecutive_correct`
 * ("FOLGEFEHLER OK") — siehe `GraphRunner.ts`. Diese Datei bringt der
 * Rechenkette bei, was der Graph schon kann; das Vokabular bleibt dasselbe.
 *
 * WAS HIER BEWUSST NICHT PASSIERT. Der Graph rechnet mit dem Schuelerwert NACH,
 * statt eine Zahl zu suchen — das waere robuster. Es setzt aber die Formel der
 * Musterloesung voraus, und die hat die Rechenkette nicht: Ein `TargetGoal`
 * kennt nur den ZIELWERT. Deshalb bleibt hier der Abgleich ueber den Zahlenwert,
 * mit den Einschraenkungen, die unten benannt sind.
 */
import type { CalcTraceResult, StudentASTStep } from './calc-trace-types';
import { TOLERANCE, isWithinTolerance } from './numeric-tolerance';

/** Ein Zahlenwert, den der Schueler in einer frueheren Aufgabe selbst erzeugt hat. */
export interface FruehererWert {
    /** Name der Aufgabe, aus der er stammt — steht spaeter in der Begruendung. */
    aufgabe: string;
    wert: number;
}

/**
 * Trivialwerte, die als Uebernahme nicht taugen.
 *
 * 0 und 1 stehen in beinahe jeder Rechnung; 2 und 10 in sehr vielen. Wuerde man
 * sie mitzaehlen, faende sich fast immer eine "Uebernahme" und die Kulanz
 * griffe auch dort, wo sie nicht hingehoert. Die Grenze ist eine Abwaegung,
 * keine Wahrheit: Sie laesst lieber einen echten Folgefehler durchrutschen, als
 * einen eigenstaendigen Fehler zu verzeihen.
 */
const TRIVIAL = new Set([0, 1, 2, 10, 100, 1000]);

const istBrauchbar = (wert: unknown): wert is number =>
    typeof wert === 'number' && Number.isFinite(wert) && !TRIVIAL.has(Math.abs(wert));

/**
 * Die Zwischenergebnisse einer Aufgabe, deren Ziel der Schueler VERFEHLT hat.
 *
 * Nur verfehlte Aufgaben liefern etwas: Wer sein Ziel getroffen hat, gibt keinen
 * Fehler weiter, den man verzeihen muesste.
 */
export function falscheWerteAus(aufgabe: string, ergebnis: CalcTraceResult | undefined): FruehererWert[] {
    if (!ergebnis || ergebnis.isGoalReached) return [];
    const gesehen = new Set<number>();
    const werte: FruehererWert[] = [];
    for (const schritt of ergebnis.ast ?? []) {
        if (!istBrauchbar(schritt.result) || gesehen.has(schritt.result)) continue;
        gesehen.add(schritt.result);
        werte.push({ aufgabe, wert: schritt.result });
    }
    return werte;
}

/** Die Zahlen, die als Operanden in einer Formel stehen. */
function zahlenIn(formel: string): number[] {
    const treffer = formel.match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/g) ?? [];
    return treffer.map(Number).filter(n => Number.isFinite(n));
}

/**
 * Steckt einer der frueheren falschen Werte in diesen Rechenschritten?
 *
 * Gibt den ERSTEN Treffer zurueck; fuer die Begruendung genuegt einer.
 */
export function findeUebernahme(
    schritte: StudentASTStep[],
    frueher: FruehererWert[]
): FruehererWert | undefined {
    if (frueher.length === 0) return undefined;
    for (const schritt of schritte) {
        for (const zahl of zahlenIn(schritt.formula ?? '')) {
            const treffer = frueher.find(f => isWithinTolerance(zahl, f.wert, TOLERANCE));
            if (treffer) return treffer;
        }
    }
    return undefined;
}
