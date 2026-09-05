/**
 * Der Sicherheitsgurt fuer veraenderte Aufgabennamen.
 *
 * ANLASS (02.09.2026). Ein Modell gab den Aufgabennamen "a) Zwei Ursachen" als "a)"
 * zurueck. `mapLayoutTask` sucht ueber den Namen, fand nichts, und eine fachlich
 * vollstaendig richtige Bewertung wurde zu 0 Punkten mit dem Hinweis "Vom System nicht
 * erkannt oder von der KI uebersprungen". Die Gesamtrueckmeldung desselben Laufs lobte
 * die Arbeit — die Lehrkraft haette Lob und Nullen nebeneinander gesehen.
 *
 * DIE ABWAEGUNG. Falsche 0 Punkte sind der teuerste Fehler dieser Datei. Eine FALSCH
 * ZUGEORDNETE Bewertung waere aber noch schlimmer: Sie sieht plausibel aus, und niemand
 * prueft sie nach. Der Gurt greift deshalb nur bei Eindeutigkeit in BEIDE Richtungen —
 * genau eine KI-Aufgabe kommt in Frage, und genau eine Aufgabe der Musterloesung passt
 * auf diese KI-Aufgabe. Im Zweifel bleibt es bei 0 Punkten mit sichtbarem Hinweis.
 *
 * Die Haelfte dieser Tests prueft deshalb, dass NICHT zugeordnet wird.
 */
import { mapLayoutTask } from '../../../src/lib/ai/correction-mapping';
import type { Task } from '../../../src/types';

/** Eine Aufgabe der Musterloesung. */
const layout = (name: string, maxPoints = 2): Task => ({ name, maxPoints } as Task);

/** Eine Aufgabe, wie das Modell sie zurueckgibt. */
const kiAufgabe = (name: string, punkte: number) => ({
    name,
    maxPoints: 2,
    pointsObtained: punkte,
    feedback: 'Gut gemacht.',
    confidence: 95,
    content: ''
});

const NICHT_ERKANNT = 'Vom System nicht erkannt';

describe('Rettung eines veraenderten Aufgabennamens', () => {
    describe('rettet, wo die Zuordnung eindeutig ist', () => {
        it('das Modell kuerzt den Namen auf die Kennung', () => {
            const alles = [layout('a) Zwei Ursachen'), layout('b) Buendnissystem')];
            const ki = [kiAufgabe('a)', 2), kiAufgabe('b)', 1)];

            const { task } = mapLayoutTask(alles[0], ki, alles);

            expect(task.pointsObtained).toBe(2);
            expect(task.feedback).toContain('Gut gemacht.');
            expect(task.feedback).toContain('[KI-FEHLER?]');
        });

        it('das Modell verlaengert den Namen um die Aufgabenstellung', () => {
            const alles = [layout('Aufgabe a)'), layout('Aufgabe b)')];
            const ki = [kiAufgabe('Aufgabe a) Nenne zwei Ursachen', 2), kiAufgabe('Aufgabe b) Erklaere', 1)];

            expect(mapLayoutTask(alles[0], ki, alles).task.pointsObtained).toBe(2);
            expect(mapLayoutTask(alles[1], ki, alles).task.pointsObtained).toBe(1);
        });

        it('das Modell laesst das Wort "Aufgabe" weg', () => {
            const alles = [layout('Aufgabe 1a'), layout('Aufgabe 1b')];
            const ki = [kiAufgabe('1a', 2), kiAufgabe('1b', 0)];

            expect(mapLayoutTask(alles[0], ki, alles).task.pointsObtained).toBe(2);
            expect(mapLayoutTask(alles[1], ki, alles).task.pointsObtained).toBe(0);
        });

        it('der Vertrauenswert der KI bleibt erhalten', () => {
            const alles = [layout('Aufgabe a)')];
            const ki = [kiAufgabe('a)', 2)];

            expect(mapLayoutTask(alles[0], ki, alles).task.confidence).toBe(95);
        });
    });

    describe('rettet NICHT, wo es mehrdeutig waere', () => {
        /**
         * Der gefaehrlichste Fall: "1" ist der Anfang von "11". Ohne die Gegenprobe
         * bekaeme Aufgabe 1 die Bewertung von Aufgabe 11 — oder umgekehrt.
         */
        it('Aufgabe 1 nimmt sich nicht die Bewertung von Aufgabe 11', () => {
            const alles = [layout('Aufgabe 1'), layout('Aufgabe 11')];
            const ki = [kiAufgabe('Aufgabe 11', 2)];

            const { task } = mapLayoutTask(alles[0], ki, alles);

            expect(task.pointsObtained).toBe(0);
            expect(task.feedback).toContain(NICHT_ERKANNT);
        });

        it('zwei KI-Aufgaben kommen in Frage — dann keine', () => {
            const alles = [layout('Aufgabe 1')];
            const ki = [kiAufgabe('Aufgabe 1a', 2), kiAufgabe('Aufgabe 1b', 0)];

            const { task } = mapLayoutTask(alles[0], ki, alles);

            expect(task.pointsObtained).toBe(0);
            expect(task.feedback).toContain(NICHT_ERKANNT);
        });

        it('ein voellig anderer Name wird nicht zugeordnet', () => {
            const alles = [layout('Aufgabe a)')];
            const ki = [kiAufgabe('Aufgabe c)', 2)];

            const { task } = mapLayoutTask(alles[0], ki, alles);

            expect(task.pointsObtained).toBe(0);
            expect(task.feedback).toContain(NICHT_ERKANNT);
        });

        it('ohne KI-Aufgaben bleibt es beim Fehlbefund', () => {
            const alles = [layout('Aufgabe a)')];

            const { task, mappingError } = mapLayoutTask(alles[0], [], alles);

            expect(task.pointsObtained).toBe(0);
            expect(mappingError).toBe(true);
        });

        /** Ein Name, der nur aus Fuellwoertern besteht, hat keinen Kern zum Vergleichen. */
        it('ein leerer Kern rettet nichts', () => {
            const alles = [layout('Aufgabe')];
            const ki = [kiAufgabe('Aufgabe 1', 2)];

            expect(mapLayoutTask(alles[0], ki, alles).task.pointsObtained).toBe(0);
        });
    });

    /**
     * Der exakte Treffer darf durch den Gurt nicht anders behandelt werden als vorher:
     * kein Hinweis, keine Warnung, dieselben Punkte.
     */
    it('laesst den exakten Treffer unberuehrt', () => {
        const alles = [layout('Aufgabe a)')];
        const ki = [kiAufgabe('Aufgabe a)', 2)];

        const { task } = mapLayoutTask(alles[0], ki, alles);

        expect(task.pointsObtained).toBe(2);
        expect(task.feedback).not.toContain('[KI-FEHLER?]');
    });

    /** Ohne die Liste aller Aufgaben verhaelt sich die Funktion wie zuvor. */
    it('bleibt ohne Layout-Liste abwaertskompatibel', () => {
        const { task } = mapLayoutTask(layout('Aufgabe a)'), [kiAufgabe('a)', 2)]);

        expect(task.pointsObtained).toBe(2);
    });
});
