import { baueFeedbackZeilen } from '../../../src/lib/excel/export-content';
import { entferneSkillAusProfil } from '../../../src/lib/skills/skill-dedup';
import type { StudentResult } from '../../../src/lib/excel/types';

/**
 * Zwei Bloecke, die zweimal dastanden (Layer 1)
 * 👯
 *
 * Beide wurden am 18.08.2026 herausgezogen, als der Duplikat-Waechter um den
 * Blick INNERHALB einer Datei erweitert wurde. Diese Datei haelt fest, was
 * dabei gleich bleiben musste.
 */

const arbeit = (tasks?: { name?: string; feedback?: string }[]): StudentResult => ({
    studentFirstName: 'Alex',
    studentLastName: 'Muster',
    studentName: 'Alex Muster',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analysis: { expertProfile: 'Physik', overallFeedback: 'Solide.', tasks } as any,
    grade: '2'
});

describe('baueFeedbackZeilen', () => {
    /**
     * Die Angaben zur Person stehen nur in der ERSTEN Zeile, damit das Blatt
     * lesbar bleibt und nicht bei jeder Aufgabe denselben Namen zeigt.
     */
    it('nennt Name und Expertise nur in der ersten Zeile', () => {
        const zeilen = baueFeedbackZeilen(arbeit([
            { name: 'Aufgabe 1', feedback: 'gut' },
            { name: 'Aufgabe 2', feedback: 'knapp' }
        ]));

        expect(zeilen).toHaveLength(2);
        expect(zeilen[0]['Nachname']).toBe('Muster');
        expect(zeilen[0]['KI-Expertise']).toBe('Physik');
        expect(zeilen[0]['Gesamtfeedback']).toBe('Solide.');
        expect(zeilen[1]['Nachname']).toBe('');
        expect(zeilen[1]['KI-Expertise']).toBe('');
        expect(zeilen[1]['Aufgabe']).toBe('Aufgabe 2');
    });

    /**
     * Ohne Aufgaben bleibt EINE Zeile mit Strichen. Faellt sie weg, fehlt die
     * Arbeit im Export ganz — und die Lehrkraft merkt nicht, dass sie fehlt.
     */
    it('laesst eine Arbeit ohne Aufgaben nicht verschwinden', () => {
        const zeilen = baueFeedbackZeilen(arbeit([]));
        expect(zeilen).toHaveLength(1);
        expect(zeilen[0]['Nachname']).toBe('Muster');
        expect(zeilen[0]['Aufgabe']).toBe('-');
    });

    it('behandelt fehlende Aufgabenliste wie eine leere', () => {
        expect(baueFeedbackZeilen(arbeit(undefined))).toHaveLength(1);
    });

    it('setzt fuer eine unbenannte Aufgabe eine Nummer ein', () => {
        const zeilen = baueFeedbackZeilen(arbeit([{ feedback: 'ok' }]));
        expect(zeilen[0]['Aufgabe']).toBe('Aufgabe 1');
    });

    it('faellt ohne Namen auf "Unbekannt" zurueck', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zeilen = baueFeedbackZeilen({ analysis: {} } as any);
        expect(zeilen[0]['Nachname']).toBe('Unbekannt');
    });

    /**
     * Die Spalten muessen fuer Einzel- und Sammelexport DIESELBEN sein — das war
     * der Grund, diese Funktion ueberhaupt herauszuziehen.
     */
    it('liefert immer dieselben sechs Spalten', () => {
        const spalten = [
            'Nachname', 'Vorname', 'KI-Expertise',
            'Gesamtfeedback', 'Aufgabe', 'Feedback zur Aufgabe'
        ];
        expect(Object.keys(baueFeedbackZeilen(arbeit([{ name: 'A' }]))[0])).toEqual(spalten);
        expect(Object.keys(baueFeedbackZeilen(arbeit([]))[0])).toEqual(spalten);
    });
});

describe('entferneSkillAusProfil', () => {
    const profil = {
        activeSkillIds: ['skill-a', 'skill-b'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customSkills: { 'skill-a': { name: 'A' } as any, 'skill-b': { name: 'B' } as any }
    };

    /**
     * BEIDES muss weg. Bleibt die Kennung in `activeSkillIds` stehen, verweist
     * das Profil auf einen Skill, den es nicht mehr gibt — die Instruktion
     * faellt beim naechsten Korrekturlauf stillschweigend weg, ohne dass
     * irgendwo etwas fehlschlaegt.
     */
    it('nimmt Definition UND Kennung heraus', () => {
        const neu = entferneSkillAusProfil(profil, 'skill-a');
        expect(neu.customSkills!['skill-a']).toBeUndefined();
        expect(neu.activeSkillIds).toEqual(['skill-b']);
    });

    it('laesst die uebrigen Skills unberuehrt', () => {
        const neu = entferneSkillAusProfil(profil, 'skill-a');
        expect(neu.customSkills!['skill-b']).toEqual({ name: 'B' });
    });

    /** Der Aufrufer erkennt am Identitaetsvergleich, ob er speichern muss. */
    it('gibt ein unbeteiligtes Profil unveraendert zurueck', () => {
        expect(entferneSkillAusProfil(profil, 'skill-fremd')).toBe(profil);
    });

    it('raeumt auch auf, wenn nur die Kennung ohne Definition dasteht', () => {
        const verwaist = { activeSkillIds: ['skill-x'], customSkills: {} };
        expect(entferneSkillAusProfil(verwaist, 'skill-x').activeSkillIds).toEqual([]);
    });

    it('veraendert das uebergebene Profil nicht', () => {
        entferneSkillAusProfil(profil, 'skill-a');
        expect(profil.activeSkillIds).toEqual(['skill-a', 'skill-b']);
        expect(profil.customSkills['skill-a']).toBeDefined();
    });

    it('kommt mit fehlenden Feldern zurecht', () => {
        expect(entferneSkillAusProfil({}, 'skill-a')).toEqual({});
    });
});
