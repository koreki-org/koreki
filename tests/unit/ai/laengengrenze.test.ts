import { parseCorrectionResult } from '../../../src/lib/ai/ai-orchestrator';
import {
    ABGESCHNITTEN_HINWEIS,
    istLaengenabbruch,
    vermerkeAbbruch
} from '../../../src/lib/ai/laengengrenze';
import { Task, AIAnalysisResult } from '../../../src/types';

/**
 * Antwort an der Laengengrenze abgeschnitten (Layer 1)
 * ✂️
 *
 * ANLASS, 13.11.2026: Eine Korrektur mit 13 Teilaufgaben wurde von Ollama nach
 * Aufgabe 3.3 abgeschnitten (`done_reason: length`). Koreki zeigte die sechs
 * geschriebenen Aufgaben und nannte die uebrigen „Vom System nicht erkannt" —
 * erkannt waren sie, es fehlte der Platz. Die Teilantwort soll bleiben
 * (Entscheidung 18.08.2026), aber ehrlich beschriftet werden, und die Aufgabe,
 * an der abgeschnitten wurde, darf keine Null bekommen, die wie ein Urteil aussieht.
 */

const layout: Task[] = ['A1', 'A2', 'A3', 'A4'].map(name => ({ name, maxPoints: 4, content: '' }));

/** Was nach `repairTruncatedJson` von einer Antwort uebrig ist, die in A3 abbrach. */
const teilantwort = (): AIAnalysisResult => ({
    tasks: [
        { name: 'A1', pointsObtained: 4, confidence: 95, feedback: 'Richtig.' },
        { name: 'A2', pointsObtained: 2, confidence: 90, feedback: 'Halb.' },
        // Notizen begonnen, Punkte nie geschrieben — das Zod-Gate machte daraus 0.
        { name: 'A3', correctionNotes: '[Kriterien-Bewertung]' } as AIAnalysisResult['tasks'][number]
    ]
});

describe('istLaengenabbruch', () => {
    it('erkennt die Laengengrenze aller drei Anbieter', () => {
        expect(istLaengenabbruch('length')).toBe(true);        // Ollama, OpenAI, Mistral
        expect(istLaengenabbruch('model_length')).toBe(true);  // Mistral: Modellfenster voll
    });

    it('nimmt regulaere Enden und fehlende Angaben nicht als Abbruch', () => {
        expect(istLaengenabbruch('stop')).toBe(false);
        expect(istLaengenabbruch(undefined)).toBe(false);
        expect(istLaengenabbruch(null)).toBe(false);
    });
});

describe('vermerkeAbbruch', () => {
    it('vermerkt den Abbruch am Ergebnis', () => {
        expect(vermerkeAbbruch({ tasks: [] }, 'length')).toEqual({ tasks: [], antwortAbgeschnitten: true });
    });

    it('laesst eine vollstaendige Antwort unveraendert', () => {
        const ergebnis = { tasks: [] };
        expect(vermerkeAbbruch(ergebnis, 'stop')).toBe(ergebnis);
    });

    it('laesst Ergebnisse, die kein Objekt sind, wie sie sind', () => {
        expect(vermerkeAbbruch('Text', 'length')).toBe('Text');
        expect(vermerkeAbbruch(null, 'length')).toBeNull();
    });
});

describe('parseCorrectionResult bei abgeschnittener Antwort', () => {
    const abgeschnitten = () => parseCorrectionResult({ ...teilantwort(), antwortAbgeschnitten: true }, layout);

    it('behaelt die vollstaendig geschriebenen Aufgaben', () => {
        const [a1, a2] = abgeschnitten().tasks;
        expect(a1.pointsObtained).toBe(4);
        expect(a2.pointsObtained).toBe(2);
        expect(a1.feedback).toBe('Richtig.');
    });

    /** Die angefangene Aufgabe bekommt keine Null, die wie ein Urteil aussieht. */
    it('wertet die angefangene Aufgabe nicht, sondern benennt den Abbruch', () => {
        const a3 = abgeschnitten().tasks[2];
        expect(a3.feedback).toBe(ABGESCHNITTEN_HINWEIS);
        expect(a3.confidence).toBe(0);
    });

    it('nennt fehlende Aufgaben abgeschnitten statt „nicht erkannt"', () => {
        const a4 = abgeschnitten().tasks[3];
        expect(a4.feedback).toBe(ABGESCHNITTEN_HINWEIS);
        expect(a4.feedback).not.toMatch(/nicht erkannt/);
    });

    it('zieht die Bremse fuer die ganze Arbeit', () => {
        expect(abgeschnitten().confidence).toBe(0);
    });

    /** Der Vermerk ist verbraucht — ein zweiter Durchlauf darf nicht noch eine Aufgabe verwerfen. */
    it('wendet die Regel nur einmal an', () => {
        const einmal = abgeschnitten();
        expect(einmal.antwortAbgeschnitten).toBeUndefined();
    });

    /** Ohne Abbruch bleibt alles beim Alten: dann hat das Modell die Aufgabe ausgelassen. */
    it('aendert ohne Abbruch nichts', () => {
        const normal = parseCorrectionResult(teilantwort(), layout);
        expect(normal.tasks[3].feedback).toMatch(/nicht erkannt/);
        expect(normal.tasks[2].feedback).not.toBe(ABGESCHNITTEN_HINWEIS);
    });
});
