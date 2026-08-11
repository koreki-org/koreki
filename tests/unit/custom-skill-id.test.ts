import {
    buildAutoSkillName,
    buildAutoSkillPrefix,
    resolveCustomSkillId,
    slugifySkillName,
    type CustomSkillLike
} from '../../src/lib/custom-skill-id';
import type { Task } from '../../src/types';

/**
 * Diese Regeln verhindern, dass zu einer Aufgabe mehrere Skill-Karten
 * entstehen. Sie steckten in einer 1200-Zeilen-Komponente und waren nur ueber
 * das Rendern der ganzen Karte erreichbar — also faktisch ungeprueft.
 */
describe('resolveCustomSkillId', () => {
    const suffix = () => '9999';
    const task = (over: Partial<Task> = {}): Task => ({ name: 'Aufgabe 1', ...over } as Task);

    it('behaelt die ID, an der die Aufgabe bereits haengt', () => {
        const id = resolveCustomSkillId({
            name: 'Ganz anderer Name',
            customSkills: {},
            currentTask: task({ taskType: 'custom-skill-bestehend-1234' }),
            taskIdx: 0
        }, suffix);

        expect(id).toBe('custom-skill-bestehend-1234');
    });

    it('verwendet einen vorhandenen Skill mit demselben Namen weiter', () => {
        const customSkills: Record<string, CustomSkillLike> = {
            'custom-skill-bruchrechnen-0001': { name: 'Bruchrechnen' }
        };

        const id = resolveCustomSkillId({
            name: '  bruchRECHNEN  ',
            customSkills,
            currentTask: task(),
            taskIdx: 0
        }, suffix);

        // Gross-/Kleinschreibung und Leerraum duerfen keinen zweiten Eintrag erzeugen.
        expect(id).toBe('custom-skill-bruchrechnen-0001');
    });

    it('findet den automatisch erzeugten Skill derselben Aufgabe wieder', () => {
        const customSkills: Record<string, CustomSkillLike> = {
            'custom-skill-auto-0001': { name: 'Auto_aufgabe-1_2026-08-11_0905' }
        };

        const id = resolveCustomSkillId({
            name: 'Neuer Name',
            customSkills,
            currentTask: task({ name: 'Aufgabe 1' }),
            taskIdx: 0
        }, suffix);

        expect(id).toBe('custom-skill-auto-0001');
    });

    it('verwechselt Aufgabe 1 nicht mit Aufgabe 12', () => {
        const customSkills: Record<string, CustomSkillLike> = {
            'custom-skill-auto-0012': { name: 'Auto_aufgabe-12_2026-08-11_0905' }
        };

        const id = resolveCustomSkillId({
            name: 'Neuer Name',
            customSkills,
            currentTask: task({ name: 'Aufgabe 1' }),
            taskIdx: 0
        }, suffix);

        // Der Praefix muss exakt oder mit '_' getrennt passen — sonst erbte
        // Aufgabe 1 den Skill von Aufgabe 12.
        expect(id).toBe('custom-skill-neuer-name-9999');
    });

    it('bildet eine neue ID, wenn nichts passt', () => {
        const id = resolveCustomSkillId({
            name: 'Rechnen mit Größen!',
            customSkills: {},
            currentTask: task(),
            taskIdx: 0
        }, suffix);

        expect(id).toBe('custom-skill-rechnen-mit-gr-en-9999');
    });

    it('haelt die Reihenfolge ein: bestehende Aufgaben-ID schlaegt Namenstreffer', () => {
        const customSkills: Record<string, CustomSkillLike> = {
            'custom-skill-namensgleich-0001': { name: 'Bruchrechnen' }
        };

        const id = resolveCustomSkillId({
            name: 'Bruchrechnen',
            customSkills,
            currentTask: task({ taskType: 'custom-skill-schon-da-4321' }),
            taskIdx: 0
        }, suffix);

        expect(id).toBe('custom-skill-schon-da-4321');
    });

    it('ignoriert Eintraege ohne verwertbaren Namen', () => {
        const customSkills: Record<string, CustomSkillLike> = {
            'kaputt-1': {},
            'kaputt-2': { name: undefined },
            'kaputt-3': { name: 42 as unknown as string }
        };

        expect(() => resolveCustomSkillId({
            name: 'Neu',
            customSkills,
            currentTask: task(),
            taskIdx: 0
        }, suffix)).not.toThrow();
    });

    it('kommt ohne Aufgabe zurecht und nutzt die Position als Ersatznamen', () => {
        expect(buildAutoSkillPrefix(undefined, 4)).toBe('auto_aufgabe-5');

        const id = resolveCustomSkillId({
            name: 'Neu',
            customSkills: { x: { name: 'Auto_aufgabe-5_2026' } },
            currentTask: undefined,
            taskIdx: 4
        }, suffix);

        expect(id).toBe('x');
    });
});

describe('slugifySkillName', () => {
    it('ersetzt Sonderzeichen und schneidet Randstriche ab', () => {
        expect(slugifySkillName('  Größen & Einheiten!  ')).toBe('gr-en-einheiten');
    });
});

/**
 * Der eigentliche Vertrag: was der Batch-Lauf als Namen vergibt, muss die
 * Aufloesung spaeter als Auto-Skill DERSELBEN Aufgabe wiedererkennen. Sonst
 * legt der naechste Durchgang eine zweite Karte fuer dieselbe Aufgabe an.
 *
 * Beide Seiten lagen frueher weit auseinander — der Name entstand in
 * ModelSolutionCard, der Vergleich hier. Dass es funktionierte, hing daran,
 * dass beide kleinschreiben.
 */
describe('buildAutoSkillName im Zusammenspiel mit resolveCustomSkillId', () => {
    const now = new Date(2026, 7, 11, 9, 5);
    const task = (over: Partial<Task> = {}): Task => ({ name: 'Aufgabe 1', ...over } as Task);

    it('folgt dem Muster Auto_<Aufgabe>_<Datum>_<Zeit>', () => {
        expect(buildAutoSkillName(task({ name: 'Aufgabe 1' }), 0, now))
            .toBe('Auto_Aufgabe-1_2026-08-11_0905');
    });

    it('faellt ohne Aufgabennamen auf die Position zurueck', () => {
        expect(buildAutoSkillName(undefined, 4, now)).toBe('Auto_Aufgabe-5_2026-08-11_0905');
    });

    it('wird von resolveCustomSkillId derselben Aufgabe wiedererkannt', () => {
        const current = task({ name: 'Aufgabe 3' });
        const generated = buildAutoSkillName(current, 2, now);

        const id = resolveCustomSkillId({
            name: 'Ein voellig anderer Name',
            customSkills: { 'custom-skill-vorhanden-0001': { name: generated } },
            currentTask: current,
            taskIdx: 2
        }, () => 'NEU');

        // Wiederverwendung statt zweiter Karte.
        expect(id).toBe('custom-skill-vorhanden-0001');
    });

    it('wird NICHT einer anderen Aufgabe zugeordnet', () => {
        const generated = buildAutoSkillName(task({ name: 'Aufgabe 3' }), 2, now);

        const id = resolveCustomSkillId({
            name: 'Neuer Skill',
            customSkills: { 'custom-skill-fremd-0001': { name: generated } },
            currentTask: task({ name: 'Aufgabe 4' }),
            taskIdx: 3
        }, () => 'NEU');

        expect(id).toBe('custom-skill-neuer-skill-NEU');
    });

    it('haelt den Vertrag auch bei Sonderzeichen im Aufgabennamen', () => {
        const current = task({ name: 'Aufgabe 2b) Größen & Einheiten' });
        const generated = buildAutoSkillName(current, 1, now);

        expect(generated.toLowerCase()).toContain(buildAutoSkillPrefix(current, 1));

        const id = resolveCustomSkillId({
            name: 'Anderer Name',
            customSkills: { 'custom-skill-sonder-0001': { name: generated } },
            currentTask: current,
            taskIdx: 1
        }, () => 'NEU');

        expect(id).toBe('custom-skill-sonder-0001');
    });
});
