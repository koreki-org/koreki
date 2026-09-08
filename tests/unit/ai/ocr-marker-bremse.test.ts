import { parseCorrectionResult } from '../../../src/lib/ai/ai-orchestrator';
import { baueSchuelertext, abschnittDerAufgabe, hatOcrMarkerFuerAufgabe } from '../../../src/lib/schuelertext';
import { VERTRAUEN_SCHWELLE } from '../../../src/lib/vertrauen';
import type { Task } from '../../../src/types';

/**
 * Die OCR-Bremse: Steht im abgeschickten Text noch ein "(?)", darf die KI ihre
 * eigene Sicherheit nicht ueber die Schwelle setzen.
 *
 * GEFUNDEN 08.09.2026: Die Regel las `content` aus der ANTWORT des Modells —
 * ein Feld, das die Korrektur-Anweisung nie abfragt. Sie griff damit nur, wenn
 * ein Modell den Schuelertext zufaellig mitschickte.
 *
 * Die Gegenprobe ist genauso wichtig: Eine VOR dem Lauf reparierte Aufgabe darf
 * die Bremse nicht mehr ausloesen. Sonst wuerde die Sorgfalt der Lehrkraft
 * bestraft statt belohnt.
 */
describe('OCR-Bremse liest den abgeschickten Text', () => {
    const layout: Task[] = [
        { name: 'Aufgabe 1', maxPoints: 5 },
        { name: 'Aufgabe 2', maxPoints: 5 }
    ];

    const antwortMitVertrauen = (wert: number) => ({
        tasks: layout.map(t => ({ name: t.name, pointsObtained: 4, maxPoints: 5, confidence: wert })),
        confidence: wert
    }) as unknown as Parameters<typeof parseCorrectionResult>[0];

    describe('Abschnitte lesen', () => {
        it('findet den Text einer Aufgabe zwischen den Koepfen', () => {
            const text = baueSchuelertext([
                { name: 'Aufgabe 1', content: 'erste Antwort' },
                { name: 'Aufgabe 2', content: 'zweite Antwort' }
            ] as Task[]);

            expect(abschnittDerAufgabe(text, 'Aufgabe 1')).toContain('erste Antwort');
            expect(abschnittDerAufgabe(text, 'Aufgabe 1')).not.toContain('zweite Antwort');
            expect(abschnittDerAufgabe(text, 'Aufgabe 3')).toBeUndefined();
        });

        it('wertet ohne Koepfe den ganzen Text — die vorsichtige Antwort', () => {
            expect(hatOcrMarkerFuerAufgabe('roher Scan mit Wid(?)erstand', 'Aufgabe 1')).toBe(true);
            expect(hatOcrMarkerFuerAufgabe('roher Scan ohne alles', 'Aufgabe 1')).toBe(false);
        });

        it('ohne Text gibt es nichts zu bremsen', () => {
            expect(hatOcrMarkerFuerAufgabe(undefined, 'Aufgabe 1')).toBe(false);
        });
    });

    describe('Wirkung auf den Vertrauenswert', () => {
        it('bremst die Aufgabe MIT Marker — und nur die', () => {
            const schuelertext = baueSchuelertext([
                { name: 'Aufgabe 1', content: 'Der Wid(?)erstand betraegt 5 Ohm' },
                { name: 'Aufgabe 2', content: 'Die Spannung betraegt 10 Volt' }
            ] as Task[]);

            const r = parseCorrectionResult(antwortMitVertrauen(98), layout, schuelertext);

            expect(r.tasks[0].confidence).toBe(VERTRAUEN_SCHWELLE - 1);
            expect(r.tasks[1].confidence).toBe(98);
            expect(r.confidence).toBe(0);
        });

        it('laesst eine VOR dem Lauf reparierte Aufgabe in Ruhe', () => {
            const schuelertext = baueSchuelertext([
                { name: 'Aufgabe 1', content: 'Der Widerstand betraegt 5 Ohm' },
                { name: 'Aufgabe 2', content: 'Die Spannung betraegt 10 Volt' }
            ] as Task[]);

            const r = parseCorrectionResult(antwortMitVertrauen(98), layout, schuelertext);

            expect(r.tasks[0].confidence).toBe(98);
            expect(r.tasks[1].confidence).toBe(98);
            expect(r.confidence).toBe(98);
        });

        it('greift auch dann, wenn niemand den Schuelertext durchreicht', () => {
            // Der alte Weg: das Modell schickt den Text von sich aus mit.
            const antwort = {
                tasks: [
                    { name: 'Aufgabe 1', pointsObtained: 4, confidence: 98, content: 'Wid(?)erstand' },
                    { name: 'Aufgabe 2', pointsObtained: 4, confidence: 98 }
                ]
            } as unknown as Parameters<typeof parseCorrectionResult>[0];

            expect(parseCorrectionResult(antwort, layout).tasks[0].confidence).toBe(VERTRAUEN_SCHWELLE - 1);
        });
    });
});
