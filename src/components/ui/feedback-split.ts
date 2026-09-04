/**
 * Zerlegt den gespeicherten Rueckmeldetext in seine drei Bestandteile.
 *
 * Eigene Datei, weil es reine Zeichenketten-Logik ist — kein JSX, kein Zustand.
 * In der Komponente stand sie der Groessengrenze im Weg und wurde ausserdem von
 * `lib/pdf-utils.ts` importiert, das damit eine UI-Komponente laden musste, nur um
 * den paedagogischen Teil zu bekommen.
 */
import type { FeedbackEngine } from './feedback-engine-labels';
import { NICHT_NACHGERECHNET } from '@/lib/grading/calc-trace-feedback';

interface SplitFeedback {
    technical?: string;
    /** Nur gesetzt, wenn `technical` vorhanden ist. */
    engine?: FeedbackEngine;
    /**
     * Die Sandbox hat NICHTS nachgerechnet — sie fand keinen Rechenausdruck.
     *
     * Das gehoert in die UEBERSCHRIFT, nicht nur in den aufgeklappten Text: Die
     * Beschriftung verspricht "Die Rechenkette hat die Aufgabe nachgerechnet", und
     * genau dann stimmt das nicht. Wer den Block nicht oeffnet, glaubt sonst an
     * einen Beweis, den es nicht gibt.
     */
    nichtNachgerechnet?: boolean;
    pedagogical: string;
}

/**
 * Parses and splits raw feedback text into technical engine blocks (PANG/AGS)
 * and didactical/pedagogical feedback.
 */
export function splitFeedback(text: string): SplitFeedback {
    if (!text) return { pedagogical: "" };

    const pangIndex = text.indexOf('[⚙️ PANG Engine');
    const agsIndex = text.indexOf('[⚙️ AGS Engine');
    const calcIndex = text.indexOf('[📐 CalcTrace Engine');
    
    let engineIndex = -1;
    let engine: FeedbackEngine | undefined;
    if (pangIndex !== -1) {
        engineIndex = pangIndex;
        engine = 'PANG';
    } else if (agsIndex !== -1) {
        engineIndex = agsIndex;
        engine = 'AGS';
    } else if (calcIndex !== -1) {
        engineIndex = calcIndex;
        engine = 'CalcTrace';
    }

    if (engineIndex === -1) {
        return { pedagogical: text };
    }

    const remainingText = text.slice(engineIndex);
    
    // Look for a standalone divider to split technical from pedagogical feedback
    // We must include newlines so we don't accidentally split markdown tables (|:---|)
    const dividerIndex = remainingText.indexOf('\n---\n');
    
    let technical = "";
    let pedagogical = "";

    if (dividerIndex !== -1) {
        technical = remainingText.slice(0, dividerIndex).trim();
        let afterDivider = remainingText.slice(dividerIndex + 5).trim();
        if (afterDivider.startsWith('[KI-Pädagogische Einschätzung]')) {
            afterDivider = afterDivider.slice('[KI-Pädagogische Einschätzung]'.length).trim();
        }
        pedagogical = afterDivider;
    } else {
        const kiIndex = remainingText.indexOf('[KI-Pädagogische Einschätzung]');
        if (kiIndex !== -1) {
            technical = remainingText.slice(0, kiIndex).trim();
            pedagogical = remainingText.slice(kiIndex + '[KI-Pädagogische Einschätzung]'.length).trim();
        } else {
            technical = remainingText.trim();
            pedagogical = "";
        }
    }

    const prefix = text.slice(0, engineIndex).trim();
    if (prefix) {
        pedagogical = prefix + "\n\n" + pedagogical;
    }

    // Die Markerzeile selbst ("[📐 CalcTrace Engine - …]") faellt weg: Welche Engine
    // gerechnet hat, steht als eigener Wert in `engine` — und die Oberflaeche macht
    // daraus die Ueberschrift des Aufklappers. Sie ein zweites Mal als erste
    // Textzeile zu zeigen, wiederholt nur die Zeile darueber. Im gespeicherten
    // Feedback bleibt der Marker unberuehrt; er wird zum Erkennen gebraucht.
    const technicalOhneMarker = technical.replace(/^\[[^\]\n]*Engine[^\]\n]*\]\s*\n?/, '');

    return {
        technical: technicalOhneMarker.trim() || undefined,
        engine: technical ? engine : undefined,
        nichtNachgerechnet: technical.includes(NICHT_NACHGERECHNET),
        pedagogical: pedagogical
    };
}
