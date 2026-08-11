import {
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
