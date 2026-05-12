import { STANDARD_SKILLS } from '../../src/lib/ai/standard-skills';
import { STANDARD_SKILL_PROFILES } from '../../src/lib/ai/standard-skills-profiles';

describe('Standard Skills Registry (Layer 1 Unit)', () => {
    it('should have all mathematical grading skills registered with correct IDs', () => {
        expect(STANDARD_SKILLS['skill-math-equivalence']).toBeDefined();
        expect(STANDARD_SKILLS['skill-math-equivalence'].id).toBe('skill-math-equivalence');
        expect(STANDARD_SKILLS['skill-math-equivalence'].category).toBe('math-science');
        expect(STANDARD_SKILLS['skill-math-equivalence'].promptSnippet).toContain('MATHEMATISCHE ÄQUIVALENZ');

        expect(STANDARD_SKILLS['skill-math-isolated-grading']).toBeDefined();
        expect(STANDARD_SKILLS['skill-math-isolated-grading'].id).toBe('skill-math-isolated-grading');
        expect(STANDARD_SKILLS['skill-math-isolated-grading'].category).toBe('math-science');
        expect(STANDARD_SKILLS['skill-math-isolated-grading'].promptSnippet).toContain('STRIKTE TRENNUNG VON RECHENWEG UND ENDERGEBNIS');

        expect(STANDARD_SKILLS['skill-math-scratchpad']).toBeDefined();
        expect(STANDARD_SKILLS['skill-math-scratchpad'].id).toBe('skill-math-scratchpad');
        expect(STANDARD_SKILLS['skill-math-scratchpad'].category).toBe('math-science');
        expect(STANDARD_SKILLS['skill-math-scratchpad'].promptSnippet).toContain('AKTIVES NACHRECHNEN IM DENK-RAUM (SCRATCHPAD)');
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
