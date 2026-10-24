/**
 * Der Stamm einer Hauptaufgabe (lib/hauptaufgaben.ts).
 *
 * ANLASS (24.10.2026). Bei zwei echten Klassenarbeiten fehlte der Text zwischen
 * Hauptaufgabe und erster Teilaufgabe in der Musterlösung, die an die Korrektur geht.
 * Die Analyse kannte für ihn keinen Platz. Geprüft wird hier, dass er von der Analyse
 * bis in die Musterlösung kommt — und dort genau EINMAL steht.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { Task } from '@/types';
import { uebernimmHauptaufgaben, hauptaufgabenVon, setzeStamm, stammUeberschrift } from '@/lib/hauptaufgaben';
import { composeModelSolution, joinTaskSections } from '@/lib/task-utils';

const analyse = {
    hauptaufgaben: [
        { name: 'Aufgabe 1', stamm: 'Ausgangslage A für alle Teilaufgaben.' },
        { name: 'Aufgabe 2', stamm: '   ' }
    ],
    tasks: [
        { name: 'Aufgabe 1a', maxPoints: 2, content: 'Frage 1a', hauptaufgabe: 'Aufgabe 1' },
        { name: 'Aufgabe 1b', maxPoints: 2, content: 'Frage 1b', hauptaufgabe: 'Aufgabe 1' },
        { name: 'Aufgabe 2a', maxPoints: 3, content: 'Frage 2a', hauptaufgabe: 'Aufgabe 2' },
        { name: 'Aufgabe 3', maxPoints: 4, content: 'Frage 3', hauptaufgabe: null },
        { name: 'Aufgabe 4a', maxPoints: 1, content: 'Frage 4a', hauptaufgabe: 'Aufgabe 9' }
    ]
};

const zaehle = (text: string, teil: string) => text.split(teil).length - 1;

describe('Stamm einer Hauptaufgabe', () => {
    const tasks = uebernimmHauptaufgaben(analyse.tasks as unknown as Task[], analyse.hauptaufgaben);

    it('hängt den Stamm an jede Teilaufgabe seiner Hauptaufgabe', () => {
        expect(tasks[0].hauptaufgabe).toEqual({ name: 'Aufgabe 1', stamm: 'Ausgangslage A für alle Teilaufgaben.' });
        expect(tasks[1].hauptaufgabe).toEqual(tasks[0].hauptaufgabe);
    });

    it('lässt leere Stämme, fehlende Verweise und Verweise ins Leere folgenlos', () => {
        expect(tasks[2].hauptaufgabe).toBeUndefined();
        expect(tasks[3].hauptaufgabe).toBeUndefined();
        expect(tasks[4].hauptaufgabe).toBeUndefined();
    });

    it('übernimmt nichts, wenn die Analyse keine Hauptaufgaben liefert', () => {
        const ohne = uebernimmHauptaufgaben(analyse.tasks as unknown as Task[], undefined);
        expect(ohne.every(t => t.hauptaufgabe === undefined)).toBe(true);
    });

    it('setzt den Stamm in der Musterlösung genau einmal, direkt vor die erste Teilaufgabe', () => {
        const text = composeModelSolution('', tasks.map(t => t.content || ''), tasks);
        expect(zaehle(text, 'Ausgangslage A für alle Teilaufgaben.')).toBe(1);
        expect(zaehle(text, stammUeberschrift('Aufgabe 1'))).toBe(1);
        expect(text.indexOf(stammUeberschrift('Aufgabe 1'))).toBeLessThan(text.indexOf('### Aufgabe 1a ###'));
        expect(text.indexOf('### Aufgabe 1a ###')).toBeLessThan(text.indexOf('### Aufgabe 1b ###'));
    });

    it('ändert an Arbeiten ohne Stämme nichts', () => {
        const alt = [{ name: 'A', content: 'x' }, { name: 'B', content: 'y' }] as Task[];
        expect(joinTaskSections(['x', 'y'], alt)).toBe('### A ###\nx\n\n### B ###\ny');
    });

    it('ändert den Stamm bei allen Teilaufgaben zugleich und nur dort', () => {
        const neu = setzeStamm(tasks, 'Aufgabe 1', 'Geändert.');
        expect(neu[0].hauptaufgabe?.stamm).toBe('Geändert.');
        expect(neu[1].hauptaufgabe?.stamm).toBe('Geändert.');
        expect(neu[3]).toBe(tasks[3]);
        expect(hauptaufgabenVon(neu)).toEqual([{ name: 'Aufgabe 1', stamm: 'Geändert.' }]);
    });

    /**
     * Wächter: Analyse-Regel und Übernahme sprechen dieselbe Sprache. Benennt jemand
     * die Felder in der Regel um, ohne `uebernimmHauptaufgaben` mitzuziehen, kommt
     * kein Stamm mehr an — ohne Fehler, ohne Warnung.
     */
    it('die Analyse-Regel verlangt genau die Felder, die die Übernahme liest', () => {
        const regel = fs.readFileSync(path.join(__dirname, '../../src/prompts/core/default/analyze-and-clean/system.md'), 'utf-8');
        expect(regel).toMatch(/"hauptaufgaben":\s*\[/);
        expect(regel).toMatch(/"stamm":/);
        expect(regel).toMatch(/"hauptaufgabe":/);
    });
});
