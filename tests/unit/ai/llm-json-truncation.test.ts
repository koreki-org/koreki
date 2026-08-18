import { parseLlmJson, wirktAbgeschnitten, repairTruncatedJson } from '../../../src/lib/ai/llm-json';

/**
 * Abschneide-Erkennung gegen unmaskierte Anführungszeichen (Layer 1)
 * ✂️🧩
 *
 * GEFUNDEN BEIM LESEN, 18.08.2026. `wirktAbgeschnitten` zählt die
 * Anführungszeichen auf dem UNREPARIERTEN Text — also bevor
 * `escapeInnerQuotes` die unmaskierten Zitate im Fließtext geschlossen hat.
 *
 * Ein einziges unmaskiertes Anführungszeichen macht die Zählung ungerade. Die
 * vollständige Antwort gilt dann als abgeschnitten, `repairTruncatedJson`
 * hängt ihr Klammern an, die sie gar nicht braucht — und danach ist nichts
 * mehr zu retten. Die GESAMTE Korrektur schlägt fehl, obwohl dieselbe Antwort
 * ohne diese Stufe sauber durchgeht.
 *
 * Der Auslöser muss nichts Exotisches sein. Eine Zoll-Angabe reicht:
 *
 *     "feedback": "Der Schüler notierte 5" statt 5 cm."
 *
 * Diese Datei hält beide Eigenschaften gleichzeitig fest — sie sind der
 * eigentliche Punkt, denn die naheliegende Reparatur (Abschneide-Stufe
 * einfach weglassen) opfert die zweite:
 *
 *   1. Eine vollständige, aber "schmutzige" Antwort überlebt.
 *   2. Eine ECHT abgeschnittene Antwort wird weiterhin gerettet — teilweise
 *      statt gar nicht.
 */

const schmutzig = '{"tasks":[{"name":"A1","pointsObtained":3,"feedback":"Der Schüler notierte 5" statt 5 cm."},'
    + '{"name":"A2","pointsObtained":5,"feedback":"Korrekt gelöst."}]}';

interface Antwort {
    tasks: { name: string; pointsObtained: number; feedback?: string }[];
}

describe('Vollstaendige Antwort mit unmaskiertem Anfuehrungszeichen', () => {
    /** DER BEFUND: vorher warf das hier und die ganze Korrektur war verloren. */
    it('geht nicht verloren, nur weil ein Zitat offen steht', () => {
        const ergebnis = parseLlmJson<Antwort>(schmutzig);

        expect(ergebnis.tasks).toHaveLength(2);
        expect(ergebnis.tasks.map(t => t.pointsObtained)).toEqual([3, 5]);
    });

    /**
     * Die Fehldeutung selbst bleibt bestehen — sie zu beheben hieße, den
     * Zähler über den reparierten Text laufen zu lassen, und der entsteht erst
     * später. Festgehalten wird deshalb, dass sie folgenlos ist: nicht die
     * Erkennung wurde geändert, sondern ihre Verbindlichkeit.
     */
    it('wird von der Erkennung weiterhin falsch eingeschaetzt — folgenlos', () => {
        expect(wirktAbgeschnitten(schmutzig)).toBe(true);
        expect(() => parseLlmJson<Antwort>(schmutzig)).not.toThrow();
    });
});

describe('Echt abgeschnittene Antwort', () => {
    /**
     * Für eine Korrektur ist das der Unterschied zwischen "acht von zehn
     * Aufgaben bewertet" und "gar nichts". Diese Eigenschaft darf die
     * Reparatur oben nicht kosten.
     */
    it('wird weiterhin gerettet, was vor dem Abbruch stand', () => {
        const abgeschnitten = '{"tasks":[{"name":"A1","pointsObtained":3,"feedback":"Sehr gut ge';
        const ergebnis = parseLlmJson<Antwort>(abgeschnitten);

        expect(ergebnis.tasks).toHaveLength(1);
        expect(ergebnis.tasks[0].name).toBe('A1');
        expect(ergebnis.tasks[0].pointsObtained).toBe(3);
    });

    it('behaelt die vollstaendig gelieferten Aufgaben vor dem Abbruch', () => {
        const abgeschnitten = '{"tasks":[{"name":"A1","pointsObtained":3},{"name":"A2","pointsObtained":2},{"name":"A3","points';
        const ergebnis = parseLlmJson<Antwort>(abgeschnitten);

        expect(ergebnis.tasks.map(t => t.name)).toEqual(['A1', 'A2']);
    });

    /** Die Reparatur selbst bleibt unangetastet — hier direkt geprüft. */
    it('schliesst offene Klammern und verwirft das angefangene Feld', () => {
        expect(repairTruncatedJson('{"tasks":[{"name":"A1","pointsObtained":3,"feedback":"Gut ge'))
            .toBe('{"tasks":[{"name":"A1","pointsObtained":3}]}');
    });
});

describe('Sauberes JSON bleibt unberuehrt', () => {
    it('wird ohne jede Reparatur gelesen', () => {
        const sauber = '{"tasks":[{"name":"A1","pointsObtained":3,"feedback":"Die klassische \\"Falle\\" erkannt."}]}';
        const ergebnis = parseLlmJson<Antwort>(sauber);

        expect(ergebnis.tasks[0].feedback).toBe('Die klassische "Falle" erkannt.');
    });
});
