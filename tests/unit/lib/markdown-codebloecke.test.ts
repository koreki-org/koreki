/**
 * @jest-environment node
 */
// Node statt jsdom: Dort ist `File` echt und kann `.text()` — wie in zip-abgaben.test.ts.
import { ausserhalbVonCode, alsCodeblock } from '../../../src/lib/markdown-codebloecke';
import { buendleAbgabe, dateiKopf } from '../../../src/lib/abgabe-buendeln';

/**
 * Codebloecke erzeugen und vor der Vorverarbeitung der Anzeige schuetzen.
 * 🧱
 *
 * Anlass (15.11.2026): Python-Code aus einer ZIP-Abgabe kam mit Einrueckung bei
 * der KI an, die Anzeige machte daraus Fliesstext — `#` wurde Ueberschrift,
 * `__init__` fett, jede Einrueckung verschwand. Die Pruefung hier steht fuer
 * zwei Dinge: Was in einem Block steht, kommt ZEICHENGLEICH zurueck. Und was
 * ausserhalb steht, wird weiter aufbereitet wie bisher.
 */

/** Ein Bearbeiter, der jede Zeile sichtbar veraendert — so faellt jede Beruehrung auf. */
const markiere = (prosa: string) => prosa.split('\n').map(z => `>>${z}`).join('\n');

describe('ausserhalbVonCode', () => {
    it('laesst Code zeichengleich stehen und bereitet nur den Text drumherum auf', () => {
        const text = [
            'Meine Loesung:',
            '```python',
            'def kosten(km):',
            '    if km <= 50:',
            '        return liste[i]',
            '```',
            'Fertig.'
        ].join('\n');

        expect(ausserhalbVonCode(text, markiere)).toBe([
            '>>Meine Loesung:',
            '```python',
            'def kosten(km):',
            '    if km <= 50:',
            '        return liste[i]',
            '```',
            '>>Fertig.'
        ].join('\n'));
    });

    it('bereitet Text ohne Zaun als Ganzes auf, wie bisher', () => {
        expect(ausserhalbVonCode('a\nb', markiere)).toBe('>>a\n>>b');
    });

    it('kennt auch Tilden-Zaeune', () => {
        const text = '~~~\n# kein Titel\n~~~';
        expect(ausserhalbVonCode(text, markiere)).toBe(text);
    });

    it('schliesst nur mit demselben Zeichen und mindestens gleicher Laenge', () => {
        // Ein ``` im Inneren eines ````-Blocks ist Inhalt, kein Ende.
        // Genau so setzt `alsCodeblock` Code, der selbst Backticks enthaelt.
        const text = ['````md', '```', 'innen', '```', '````', 'danach'].join('\n');
        expect(ausserhalbVonCode(text, markiere)).toBe(
            ['````md', '```', 'innen', '```', '````', '>>danach'].join('\n')
        );
    });

    it('schuetzt bei offenem Zaun den Rest — so liest ihn auch Markdown', () => {
        const text = 'vorher\n```\nx = [i]\nnoch Code';
        expect(ausserhalbVonCode(text, markiere)).toBe('>>vorher\n```\nx = [i]\nnoch Code');
    });

    it('erhaelt Leerzeilen zwischen zwei Bloecken', () => {
        const text = '```\na\n```\n\n```\nb\n```';
        expect(ausserhalbVonCode(text, p => p)).toBe(text);
    });
});

describe('alsCodeblock', () => {
    it('setzt Quelltext mit Sprache zwischen Zaeune', () => {
        expect(alsCodeblock('x = 1', 'python')).toBe('```python\nx = 1\n```');
    });

    it('schneidet abschliessende Leerzeilen ab, behaelt aber die Einrueckung', () => {
        expect(alsCodeblock('if a:\n    b()\n\n', 'python')).toBe('```python\nif a:\n    b()\n```');
    });

    it('waehlt einen laengeren Zaun, wenn der Code selbst Backticks enthaelt', () => {
        // Sonst beendete `print("```")` den Block mitten im Programm.
        const code = 'print("```")';
        expect(alsCodeblock(code, 'python')).toBe('````python\nprint("```")\n````');
    });

    it('bekommt beim Buendeln nur Quelltext — Text und Markdown sollen gedeutet werden', async () => {
        const abgabe = await buendleAbgabe('lena', [
            new File(['# Meine Notizen'], 'notizen.md', { type: 'text/markdown' }),
            new File(['x = 1'], 'loesung.py', { type: 'text/plain' })
        ]);
        expect(await abgabe!.datei.text()).toBe(
            `${dateiKopf('notizen.md')}\n# Meine Notizen\n\n${dateiKopf('loesung.py')}\n\`\`\`python\nx = 1\n\`\`\``
        );
    });

    it('uebersteht den Weg durch die Anzeige unveraendert', () => {
        const code = '# Kommentar\nclass K:\n    def __init__(self):\n        self.x = d[k] | e[k] | f[k] | g[k]\n$y = $a + $b;';
        const block = alsCodeblock(code, 'python');
        expect(ausserhalbVonCode(block, markiere)).toBe(block);
    });
});
