import {
    applySkillToggle,
    parseSkillList,
    removeSkillAndDependents,
    type SkillLike
} from '../../../src/lib/skills/skill-selection';

/**
 * Die Auswahlregel stand im Rumpf von SkillsModules und war nur ueber das
 * Rendern der gesamten Einstellungsseite erreichbar. Sie entscheidet darueber,
 * welche Anweisungen die KI spaeter bekommt.
 */
describe('skill-selection', () => {
    /** Nachbau der ausgelieferten Skills, soweit fuer die Regeln relevant. */
    const registry: SkillLike[] = [
        { id: 'skill-marks-classic', conflictsWith: 'skill-marks-bayern, skill-marks-nrw' },
        { id: 'skill-marks-bayern', conflictsWith: 'skill-marks-nrw' },
        { id: 'skill-marks-nrw', conflictsWith: 'skill-marks-bayern' },
        { id: 'skill-feedback-general', requires: 'skill-marks-classic' },
        { id: 'skill-standalone' }
    ];

    const toggle = (skillId: string, activeSkillIds: string[], allSkills = registry) =>
        applySkillToggle({ skillId, activeSkillIds, allSkills });

    describe('parseSkillList', () => {
        it('deutet die kommagetrennte Form aus dem Frontmatter', () => {
            expect(parseSkillList('a, b ,c')).toEqual(['a', 'b', 'c']);
        });

        it('deutet die Array-Form aus gespeicherten Profilen', () => {
            expect(parseSkillList(['a', 'b'])).toEqual(['a', 'b']);
        });

        it('liefert bei fehlender Angabe eine leere Liste', () => {
            expect(parseSkillList(undefined)).toEqual([]);
            expect(parseSkillList(null)).toEqual([]);
            expect(parseSkillList('')).toEqual([]);
        });
    });

    describe('Anhaken', () => {
        it('nimmt den Skill auf', () => {
            expect(toggle('skill-standalone', [])).toEqual(['skill-standalone']);
        });

        it('nimmt die Voraussetzung mit auf', () => {
            const result = toggle('skill-feedback-general', []);

            expect(result).toContain('skill-feedback-general');
            expect(result).toContain('skill-marks-classic');
        });

        it('verdraengt widersprechende Skills', () => {
            const result = toggle('skill-marks-bayern', ['skill-marks-nrw']);

            expect(result).toContain('skill-marks-bayern');
            expect(result).not.toContain('skill-marks-nrw');
        });

        it('ignoriert unbekannte Skills', () => {
            expect(toggle('gibt-es-nicht', ['skill-standalone'])).toEqual(['skill-standalone']);
        });
    });

    describe('Abhaken', () => {
        it('entfernt den Skill', () => {
            expect(toggle('skill-standalone', ['skill-standalone'])).toEqual([]);
        });

        it('entfernt auch, was ihn vorausgesetzt hat', () => {
            const result = toggle('skill-marks-classic', ['skill-marks-classic', 'skill-feedback-general']);

            expect(result).not.toContain('skill-marks-classic');
            expect(result).not.toContain('skill-feedback-general');
        });

        it('folgt der Abhaengigkeit ueber mehrere Stufen', () => {
            const chain: SkillLike[] = [
                { id: 'c' },
                { id: 'b', requires: 'c' },
                { id: 'a', requires: 'b' }
            ];

            // Frueher lief nur EIN Durchgang: `b` fiel weg, `a` blieb stehen.
            expect(applySkillToggle({ skillId: 'c', activeSkillIds: ['a', 'b', 'c'], allSkills: chain }))
                .toEqual([]);
        });
    });

    /**
     * Der eigentliche Anlass fuer dieses Modul — zwei Luecken, die erst beim
     * Herausloesen sichtbar wurden.
     *
     * 1. Ein Ausschluss ist seinem Wesen nach gegenseitig, steht in den
     *    Skill-Dateien aber nur EINSEITIG: marks-classic nennt marks-bayern,
     *    umgekehrt nicht. Gelesen wurde nur die Liste des neu angehakten
     *    Skills — Bayern anhaken liess Classic also stehen.
     * 2. Die Zusicherung "kein Skill ohne seine Voraussetzungen" galt nur beim
     *    Abhaken, nicht beim Verdraengen durch einen Konflikt.
     */
    describe('Zusicherung: Ausschluss wirkt in beide Richtungen', () => {
        it('entfernt Classic, wenn Bayern angehakt wird', () => {
            // Bayern nennt Classic NICHT — der Ausschluss steht nur bei Classic.
            const result = toggle('skill-marks-bayern', ['skill-marks-classic']);

            expect(result).toContain('skill-marks-bayern');
            expect(result).not.toContain('skill-marks-classic');
        });

        it('entfernt Bayern, wenn Classic angehakt wird', () => {
            const result = toggle('skill-marks-classic', ['skill-marks-bayern']);

            expect(result).toContain('skill-marks-classic');
            expect(result).not.toContain('skill-marks-bayern');
        });

        it('laesst nie zwei Notenschluessel gleichzeitig aktiv', () => {
            const schluessel = ['skill-marks-classic', 'skill-marks-bayern', 'skill-marks-nrw'];

            const result = toggle('skill-marks-nrw', ['skill-marks-classic']);

            expect(result.filter(id => schluessel.includes(id))).toEqual(['skill-marks-nrw']);
        });
    });

    describe('Zusicherung: kein Skill ohne seine Voraussetzung', () => {
        it('haelt auch, wenn die Voraussetzung durch einen Konflikt weicht', () => {
            const vorher = ['skill-marks-classic', 'skill-feedback-general'];

            const result = toggle('skill-marks-bayern', vorher);

            expect(result).not.toContain('skill-marks-classic');
            // Ohne die Kaskade blieb dieser Skill aktiv, obwohl seine
            // Voraussetzung gerade entfernt wurde.
            expect(result).not.toContain('skill-feedback-general');
        });

        it('laesst unbeteiligte Skills unangetastet', () => {
            const result = toggle('skill-marks-bayern', [
                'skill-marks-classic',
                'skill-feedback-general',
                'skill-standalone'
            ]);

            expect(result).toContain('skill-standalone');
        });
    });

    describe('removeSkillAndDependents', () => {
        it('laesst die Liste unveraendert, wenn der Skill gar nicht aktiv ist', () => {
            expect(removeSkillAndDependents(['skill-standalone'], 'skill-marks-nrw', registry))
                .toEqual(['skill-standalone']);
        });

        it('kommt mit unbekannten aktiven IDs zurecht', () => {
            expect(removeSkillAndDependents(['fremd', 'skill-standalone'], 'skill-standalone', registry))
                .toEqual(['fremd']);
        });
    });
});
