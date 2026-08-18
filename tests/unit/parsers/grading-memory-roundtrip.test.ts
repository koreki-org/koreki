import {
    exportGradingMemoryToMarkdown,
    parseMarkdownGradingMemory
} from '../../../src/lib/parsers/markdown-grading-memory-parser';
import type { GradingMemoryCase } from '../../../src/types';

/**
 * Erfahrungsschatz: exportieren und wieder einlesen (Layer 1)
 * 🔁
 *
 * ANLASS, 18.08.2026: Ein Nutzer hat einen bestehenden Erfahrungsschatz
 * exportiert und die Datei wieder abgelegt. Beim Nachstellen kam heraus, dass
 * der Rundlauf DREI Dinge verlor, ohne dass irgendwo ein Fehler auftauchte:
 *
 * 1. Die Aufgabenzuordnung (`taskName`). Die Oberflaeche zeigt sie an
 *    („Fallbeispiel 1 (Aufgabe 1)"), der Export schrieb sie nicht mit. Der
 *    eingelesene Erfahrungsschatz war damit fachlich entkoppelt: seine
 *    Beispiele gaben keiner Aufgabe mehr die Messlatte vor.
 * 2. Die Maximalpunkte. Ohne sie ist „3" bedeutungslos — 3 von 3 ist eine
 *    Musterloesung, 3 von 10 ein Beispiel fuer eine schwache Antwort. Der
 *    Erfahrungsschatz kalibrierte danach in die falsche Richtung.
 * 3. Alles ab der ZWEITEN Zeile einer Begruendung. Eine paedagogische
 *    Begruendung ist ein Absatz, kein Halbsatz.
 *
 * Ein Rundlauf, der still Daten verliert, ist schlimmer als einer, der
 * fehlschlaegt: die Datei sieht heil aus, und niemand vergleicht sie mit dem
 * Original.
 */

const fall = (p: Partial<GradingMemoryCase> = {}): GradingMemoryCase => ({
    id: 'urspruenglich',
    studentText: 'Bei RAID 0 werden die Daten auf mehrere Platten verteilt.',
    taskName: 'Aufgabe 1',
    expectedCorrection: {
        pointsObtained: 3,
        maxPoints: 3,
        correctionNotes: 'Kernaussage getroffen.',
        feedback: 'Fachbegriffe praeziser verwenden.'
    },
    ...p
});

/** Exportieren und sofort wieder einlesen. */
const rundlauf = (name: string, faelle: GradingMemoryCase[]) =>
    parseMarkdownGradingMemory(exportGradingMemoryToMarkdown(name, faelle));

describe('Rundlauf ohne Datenverlust', () => {
    it('behaelt alle Fallbeispiele', () => {
        const fuenf = Array.from({ length: 5 }, (_, i) =>
            fall({ studentText: `Antwort ${i + 1}`, taskName: `Aufgabe ${i + 1}` }));

        expect(rundlauf('Erfahrungsschatz-Raid(13.05.2026)', fuenf).cases).toHaveLength(5);
    });

    it('behaelt den Namen', () => {
        expect(rundlauf('Erfahrungsschatz-Raid(13.05.2026)', [fall()]).name)
            .toBe('Erfahrungsschatz-Raid(13.05.2026)');
    });

    /** REGRESSION 1: die Aufgabenzuordnung. */
    it('behaelt die Aufgabenzuordnung', () => {
        expect(rundlauf('T', [fall({ taskName: 'Aufgabe 2b' })]).cases[0].taskName)
            .toBe('Aufgabe 2b');
    });

    /** REGRESSION 2: die Maximalpunkte. */
    it('behaelt Punkte UND Maximalpunkte', () => {
        const zurueck = rundlauf('T', [fall({
            expectedCorrection: { pointsObtained: 3, maxPoints: 10, correctionNotes: 'x' }
        })]).cases[0];

        expect(zurueck.expectedCorrection.pointsObtained).toBe(3);
        expect(zurueck.expectedCorrection.maxPoints).toBe(10);
    });

    /** REGRESSION 3: mehrzeilige Begruendung. */
    it('behaelt eine mehrzeilige Begruendung vollstaendig', () => {
        const absatz = 'Die Kernaussage stimmt.\nDer Nachteil fehlt allerdings.\nDaher Abzug.';

        expect(rundlauf('T', [fall({
            expectedCorrection: { pointsObtained: 3, correctionNotes: absatz }
        })]).cases[0].expectedCorrection.correctionNotes).toBe(absatz);
    });

    it('behaelt eine mehrzeilige Rueckmeldung vollstaendig', () => {
        const absatz = 'Erste Anmerkung.\nZweite Anmerkung.';

        expect(rundlauf('T', [fall({
            expectedCorrection: { pointsObtained: 1, correctionNotes: 'x', feedback: absatz }
        })]).cases[0].expectedCorrection.feedback).toBe(absatz);
    });

    it('behaelt einen mehrzeiligen Schuelertext', () => {
        const text = 'Zeile eins.\n\nZeile drei nach einer Leerzeile.';

        expect(rundlauf('T', [fall({ studentText: text })]).cases[0].studentText).toBe(text);
    });

    /**
     * REGRESSION 4. Schreibt eine Lehrkraft die Blockmarke in eine
     * Beispielantwort — etwa beim Erlaeutern genau dieses Formats —, endete der
     * Block beim Einlesen an der falschen Stelle. Das Fallbeispiel verschwand
     * dann ERSATZLOS, ohne Meldung.
     */
    it('uebersteht die Blockmarke im freien Text', () => {
        const gemein = 'Das Format nutzt [CASE_END] als Ende.';
        const zurueck = rundlauf('T', [fall({ studentText: gemein }), fall()]);

        expect(zurueck.cases).toHaveLength(2);
        expect(zurueck.cases[0].studentText).toBe(gemein);
    });

    it('uebersteht die Blockmarke auch in der Begruendung', () => {
        const gemein = 'Sie hat [CASE_START] woertlich abgeschrieben.';
        const zurueck = rundlauf('T', [fall({
            expectedCorrection: { pointsObtained: 0, correctionNotes: gemein }
        })]);

        expect(zurueck.cases).toHaveLength(1);
        expect(zurueck.cases[0].expectedCorrection.correctionNotes).toBe(gemein);
    });
});

describe('Vertraeglichkeit mit aelteren Dateien', () => {
    /**
     * Erfahrungsschaetze, die vor dem 18.08.2026 exportiert wurden, haben weder
     * Aufgabe noch Maximalpunkte. Sie muessen weiter lesbar bleiben — sonst
     * waere die Reparatur schlimmer als der Fehler.
     */
    const alt = `---
name: "Alter Schatz"
type: "grading_memory"
version: "1.0.0"
---

[CASE_START]
## Fallbeispiel 1

### Schülerantwort:
Alte Antwort.

### Erwartete Korrektur:
- Punkte: 2
- Begründung: Alte Begründung.
- Feedback: Alte Rückmeldung.
[CASE_END]
`;

    it('liest eine Datei ohne Aufgabe und Maximalpunkte', () => {
        const zurueck = parseMarkdownGradingMemory(alt);

        expect(zurueck.name).toBe('Alter Schatz');
        expect(zurueck.cases).toHaveLength(1);
        expect(zurueck.cases[0].studentText).toBe('Alte Antwort.');
        expect(zurueck.cases[0].expectedCorrection.pointsObtained).toBe(2);
        expect(zurueck.cases[0].expectedCorrection.correctionNotes).toBe('Alte Begründung.');
        expect(zurueck.cases[0].taskName).toBeUndefined();
        expect(zurueck.cases[0].expectedCorrection.maxPoints).toBeUndefined();
    });

    it('kommt mit Windows-Zeilenenden zurecht', () => {
        const zurueck = parseMarkdownGradingMemory(alt.replace(/\n/g, '\r\n'));

        expect(zurueck.cases).toHaveLength(1);
        expect(zurueck.cases[0].expectedCorrection.pointsObtained).toBe(2);
    });

    /** Eine kaputte Punktzahl darf nicht zu `NaN` in der Bewertung werden. */
    it('faellt bei unlesbarer Punktzahl auf 0 zurueck', () => {
        const kaputt = alt.replace('- Punkte: 2', '- Punkte: drei');

        expect(parseMarkdownGradingMemory(kaputt).cases[0].expectedCorrection.pointsObtained).toBe(0);
    });

    it('liefert bei einer Datei ohne Fallbeispiele eine leere Liste', () => {
        expect(parseMarkdownGradingMemory('Nur Text, kein Format.').cases).toEqual([]);
    });
});
