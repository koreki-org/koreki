import {
    DERIVED_SKILL_PROFILE_NAME,
    planSkillProfileSync,
    type SkillProfileLike
} from '../../src/lib/skill-profile-sync';

/**
 * Diese Entscheidung stand zweimal in ModelSolutionCard — einmal fuer Desktop
 * (localStorage), einmal fuer SaaS (API). Beide Zweige unterschieden sich nur
 * im Ziel, nicht in der Regel. Genau solche doppelt geschriebenen Regeln
 * driften; bei der Anbieter-Verbindung war das die Ursache einer Luecke.
 */
describe('planSkillProfileSync', () => {
    const skill = { name: 'Bruchrechnen', promptSnippet: '...' };

    describe('eigenes Profil', () => {
        const own: SkillProfileLike = {
            id: 'p-1',
            name: 'Mathe Sek I',
            isSystem: false,
            activeSkillIds: ['skill-a', 'skill-b'],
            customSkills: { 'skill-a': { name: 'A' } }
        };

        it('ergaenzt statt zu ersetzen', () => {
            const plan = planSkillProfileSync({
                activeProfile: own,
                skillId: 'skill-neu',
                skill,
                fallbackSkillIds: ['ignoriert']
            });

            expect(plan.action).toBe('update');
            expect(plan.name).toBe('Mathe Sek I');
            expect(plan.activeSkillIds).toEqual(['skill-a', 'skill-b', 'skill-neu']);
            expect(plan.customSkills).toEqual({
                'skill-a': { name: 'A' },
                'skill-neu': skill
            });
        });

        it('nimmt eine bereits enthaltene ID nicht ein zweites Mal auf', () => {
            const plan = planSkillProfileSync({
                activeProfile: own,
                skillId: 'skill-a',
                skill,
                fallbackSkillIds: []
            });

            expect(plan.activeSkillIds).toEqual(['skill-a', 'skill-b']);
        });

        it('ueberschreibt die Definition eines gleichnamigen Skills', () => {
            const plan = planSkillProfileSync({
                activeProfile: own,
                skillId: 'skill-a',
                skill,
                fallbackSkillIds: []
            });

            expect(plan.customSkills['skill-a']).toBe(skill);
        });

        it('kommt mit fehlenden Listen zurecht', () => {
            const plan = planSkillProfileSync({
                activeProfile: { id: 'p-2', name: 'Leer', isSystem: false },
                skillId: 'skill-neu',
                skill,
                fallbackSkillIds: ['ignoriert']
            });

            expect(plan.activeSkillIds).toEqual(['skill-neu']);
            expect(plan.customSkills).toEqual({ 'skill-neu': skill });
        });
    });

    describe('System-Profil', () => {
        const system: SkillProfileLike = {
            id: 'std-mathe',
            name: 'Standard Mathematik',
            isSystem: true,
            activeSkillIds: ['skill-x', 'skill-y']
        };

        it('schreibt niemals in die Vorlage, sondern leitet eine Kopie ab', () => {
            const plan = planSkillProfileSync({
                activeProfile: system,
                skillId: 'skill-neu',
                skill,
                fallbackSkillIds: ['fallback']
            });

            // Eine Vorlage muss fuer alle gleich bleiben.
            expect(plan.action).toBe('create');
            expect(plan.name).toBe(DERIVED_SKILL_PROFILE_NAME);
        });

        it('uebernimmt die Skills der Vorlage in die Kopie', () => {
            const plan = planSkillProfileSync({
                activeProfile: system,
                skillId: 'skill-neu',
                skill,
                fallbackSkillIds: ['fallback']
            });

            expect(plan.activeSkillIds).toEqual(['skill-x', 'skill-y', 'skill-neu']);
        });

        it('laesst die Vorlage unveraendert', () => {
            planSkillProfileSync({
                activeProfile: system,
                skillId: 'skill-neu',
                skill,
                fallbackSkillIds: []
            });

            expect(system.activeSkillIds).toEqual(['skill-x', 'skill-y']);
        });
    });

    describe('kein Profil', () => {
        it('setzt auf die uebergebenen Ersatz-Skills auf', () => {
            const plan = planSkillProfileSync({
                activeProfile: null,
                skillId: 'skill-neu',
                skill,
                fallbackSkillIds: ['default-1', 'default-2']
            });

            expect(plan.action).toBe('create');
            expect(plan.activeSkillIds).toEqual(['default-1', 'default-2', 'skill-neu']);
            expect(plan.customSkills).toEqual({ 'skill-neu': skill });
        });

        it('behandelt undefined wie ein fehlendes Profil', () => {
            const plan = planSkillProfileSync({
                activeProfile: undefined,
                skillId: 'skill-neu',
                skill,
                fallbackSkillIds: []
            });

            expect(plan.action).toBe('create');
            expect(plan.activeSkillIds).toEqual(['skill-neu']);
        });
    });
});
