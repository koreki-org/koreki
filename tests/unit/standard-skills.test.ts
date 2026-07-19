import { SKILL_REGISTRY } from '../../src/prompts/skills';
import { STANDARD_SKILL_PROFILES } from '../../src/lib/ai/standard-skills-profiles';

describe('Standard Skills Registry (Layer 1 Unit) 🧪🏮🛡️', () => {
    it('should have all mathematical grading skills registered with correct IDs', () => {
        expect(SKILL_REGISTRY['skill-math-equivalence']).toBeDefined();
        expect(SKILL_REGISTRY['skill-math-equivalence'].metadata.id).toBe('skill-math-equivalence');
        expect(SKILL_REGISTRY['skill-math-equivalence'].metadata.category).toBe('math-science');
        expect(SKILL_REGISTRY['skill-math-equivalence'].promptSnippet).toContain('FORMEL- & ANSATZ-BEWERTUNG');

        expect(SKILL_REGISTRY['skill-math-isolated-grading']).toBeDefined();
        expect(SKILL_REGISTRY['skill-math-isolated-grading'].metadata.id).toBe('skill-math-isolated-grading');
        expect(SKILL_REGISTRY['skill-math-isolated-grading'].metadata.category).toBe('math-science');
        expect(SKILL_REGISTRY['skill-math-isolated-grading'].promptSnippet).toContain('EINSETZUNGS- & RECHNUNGS-BEWERTUNG');

        expect(SKILL_REGISTRY['skill-math-scratchpad']).toBeDefined();
        expect(SKILL_REGISTRY['skill-math-scratchpad'].metadata.id).toBe('skill-math-scratchpad');
        expect(SKILL_REGISTRY['skill-math-scratchpad'].metadata.category).toBe('math-science');
        expect(SKILL_REGISTRY['skill-math-scratchpad'].promptSnippet).toContain('KRITERIEN-DOKUMENTATION & PUNKT-ADDITION');

        expect(SKILL_REGISTRY['skill-consecutive-errors']).toBeDefined();
        expect(SKILL_REGISTRY['skill-consecutive-errors'].metadata.id).toBe('skill-consecutive-errors');
        expect(SKILL_REGISTRY['skill-consecutive-errors'].metadata.category).toBe('math-science');
        expect(SKILL_REGISTRY['skill-consecutive-errors'].promptSnippet).toContain('ERGEBNIS- & FOLGEFEHLER-BEWERTUNG');
    });

    it('should map mathematical grading skills into default system skill profiles', () => {
        const primarySchoolMath = STANDARD_SKILL_PROFILES.find(p => p.name === 'Grundschule Mathematik');
        expect(primarySchoolMath).toBeDefined();
        expect(primarySchoolMath?.activeSkillIds).toContain('skill-math-isolated-grading');
        expect(primarySchoolMath?.activeSkillIds).toContain('skill-math-scratchpad');
        expect(primarySchoolMath?.activeSkillIds).toContain('skill-marks-classic');

        const mintMath = STANDARD_SKILL_PROFILES.find(p => p.name === 'MINT Standard (Allgemein)');
        expect(mintMath).toBeDefined();
        expect(mintMath?.activeSkillIds).toContain('skill-math-equivalence');
        expect(mintMath?.activeSkillIds).toContain('skill-math-isolated-grading');
        expect(mintMath?.activeSkillIds).toContain('skill-math-scratchpad');
    });
});
