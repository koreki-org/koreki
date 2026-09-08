import { parseCorrectionResult } from '../../../src/lib/ai/ai-orchestrator';
import { mapMissingTask, mapModelTask } from '../../../src/lib/ai/correction-mapping';
import { alsVertrauen, brauchtPruefung, VERTRAUEN_SCHWELLE } from '../../../src/lib/vertrauen';
import type { AITask, Task } from '../../../src/types';

/**
 * GEMELDET 08.09.2026: Jede Aufgabe trug ein rotes "Ki-Vertrauen: 0 %".
 *
 * Ursache war kein Fehler des Modells, sondern der Rueckfallwert an der
 * Auswertestelle: `alsModellzahl(aiTask.confidence, 0)`. Die Korrektur-Anweisung
 * verlangt `confidence` zweimal — einmal fuer die Arbeit, einmal je Aufgabe —,
 * und kleinere Modelle liefern nur das erste. Der eigene Test-Anbieter des
 * Projekts (tests/e2e/stub-provider.mjs) hat genau diese Form.
 *
 * "Nicht geliefert" und "null" sind zwei verschiedene Aussagen. Nur eine davon
 * stammt vom Modell.
 */
describe('Vertrauenswert ohne Angabe', () => {
    const layout: Task[] = [{ name: 'Aufgabe 1', maxPoints: 5 }];

    describe('alsVertrauen / brauchtPruefung', () => {
        it('macht aus einer fehlenden Angabe keine Null', () => {
            expect(alsVertrauen(undefined)).toBeUndefined();
            expect(alsVertrauen(null)).toBeUndefined();
            expect(alsVertrauen('')).toBeUndefined();
            expect(alsVertrauen('viel')).toBeUndefined();
        });

        it('laesst eine genannte Null eine Null bleiben', () => {
            expect(alsVertrauen(0)).toBe(0);
            expect(alsVertrauen('0')).toBe(0);
        });

        it('sammelt nur genannte Werte unter der Schwelle ein', () => {
            expect(brauchtPruefung(undefined)).toBe(false);
            expect(brauchtPruefung(VERTRAUEN_SCHWELLE)).toBe(false);
            expect(brauchtPruefung(VERTRAUEN_SCHWELLE - 1)).toBe(true);
            expect(brauchtPruefung(0)).toBe(true);
        });
    });

    describe('parseCorrectionResult', () => {
        it('erfindet keinen Wert, wenn das Modell nur den Gesamtwert nennt', () => {
            const antwort = {
                tasks: [{ name: 'Aufgabe 1', pointsObtained: 4, maxPoints: 5, feedback: 'ok' }],
                confidence: 95
            } as unknown as Parameters<typeof parseCorrectionResult>[0];

            const r = parseCorrectionResult(antwort, layout);

            expect(r.tasks[0].confidence).toBeUndefined();
            expect(r.confidence).toBe(95);
        });

        it('reicht einen genannten Wert unveraendert durch', () => {
            const antwort = {
                tasks: [{ name: 'Aufgabe 1', pointsObtained: 4, maxPoints: 5, confidence: 72 }],
                confidence: 80
            } as unknown as Parameters<typeof parseCorrectionResult>[0];

            expect(parseCorrectionResult(antwort, layout).tasks[0].confidence).toBe(72);
        });

        it('laesst auch den Gesamtwert leer, wenn das Modell keinen nennt', () => {
            const antwort = {
                tasks: [{ name: 'Aufgabe 1', pointsObtained: 4, maxPoints: 5, confidence: 91 }]
            } as unknown as Parameters<typeof parseCorrectionResult>[0];

            expect(parseCorrectionResult(antwort, layout).confidence).toBeUndefined();
        });
    });

    describe('die echten Nullen bleiben', () => {
        it('fehlende Aufgabe: 0 ist hier eine Aussage ueber die Auswertung', () => {
            expect(mapMissingTask(layout[0]).task.confidence).toBe(0);
        });

        it('Bremse: eine fehlende Aufgabe zieht den Gesamtwert auf 0', () => {
            const antwort = {
                tasks: [],
                confidence: 95
            } as unknown as Parameters<typeof parseCorrectionResult>[0];

            expect(parseCorrectionResult(antwort, layout).confidence).toBe(0);
        });
    });

    describe('Marker-Deckelung', () => {
        const mitMarker = (confidence?: number): AITask => ({
            name: 'Aufgabe 1',
            pointsObtained: 4,
            confidence,
            content: 'Der Wid(?)erstand'
        } as AITask);

        it('deckelt eine zu hohe Selbsteinschaetzung', () => {
            expect(mapModelTask(layout[0], mitMarker(98)).task.confidence).toBe(VERTRAUEN_SCHWELLE - 1);
        });

        it('erfindet aber keine, wo keine steht', () => {
            const ergebnis = mapModelTask(layout[0], mitMarker(undefined));
            expect(ergebnis.markerIssue).toBe(true);
            expect(ergebnis.task.confidence).toBeUndefined();
        });
    });
});
