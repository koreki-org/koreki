import { SKILL_REGISTRY } from '../../src/prompts/skills';
import {
    STANDARD_SKILL_PROFILES,
    DEFAULT_SKILL_PROFILE_ID,
    DEFAULT_SKILL_PROFILE_NAME,
    getDefaultSkillIds
} from '../../src/lib/ai/standard-skills-profiles';
import { resolveProfileRef } from '../../src/lib/services/profile-naming';

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

    /**
     * 🏮 Die Slugs sind die einzige Kennung, auf die sich eine gespeicherte
     * Auswahl modusübergreifend berufen kann: In SaaS liegt die Vorlage als
     * Datenbankzeile, in Community und Desktop als Registry-Eintrag. Ändert
     * jemand einen Slug, zeigt die gespeicherte Auswahl bestehender Nutzer ins
     * Leere und die Korrektur läuft still mit dem Standard-Set weiter.
     */
    describe('Feste Kennungen der System-Vorlagen', () => {
        it('vergibt jeder Vorlage einen eindeutigen, stabilen Slug', () => {
            const ids = STANDARD_SKILL_PROFILES.map(p => p.id);

            expect(ids).toEqual([
                'system-grundschule-mathematik',
                'system-mint-standard',
                'system-bayern-standard',
                'system-sprachen-geistes-standard',
                'system-kulante-bewertung'
            ]);
            expect(new Set(ids).size).toBe(ids.length);
            expect(ids.every(id => id.startsWith('system-'))).toBe(true);
        });

        it('hält den früher fest verdrahteten Standard-Verweis gültig', () => {
            // 'system-mint-standard' stand vor den Slugs als Magic String im
            // Governance-Hook und steckt daher im Bestand vieler Nutzer.
            expect(DEFAULT_SKILL_PROFILE_ID).toBe('system-mint-standard');
            expect(resolveProfileRef(STANDARD_SKILL_PROFILES, 'system-mint-standard')?.name)
                .toBe(DEFAULT_SKILL_PROFILE_NAME);
        });

        it('löst Altbestand über den Namen auf, bevorzugt aber die Kennung', () => {
            // Altbestand: Für Vorlagen ohne ID wurde der NAME gespeichert.
            expect(resolveProfileRef(STANDARD_SKILL_PROFILES, DEFAULT_SKILL_PROFILE_NAME)?.id)
                .toBe(DEFAULT_SKILL_PROFILE_ID);

            // Eine Kennung gewinnt gegen einen zufällig gleichnamigen Eintrag —
            // sonst könnte ein Nutzerprofil eine Vorlage verdecken.
            const profiles = [
                { id: 'local-1', name: 'Doppelt' },
                { id: 'gesucht', name: 'Anders' },
                { id: 'local-2', name: 'gesucht' }
            ];
            expect(resolveProfileRef(profiles, 'gesucht')?.id).toBe('gesucht');
        });

        it('leitet die Startauswahl neuer Profile aus der Kennung ab', () => {
            expect(getDefaultSkillIds()).toEqual(
                STANDARD_SKILL_PROFILES.find(p => p.id === DEFAULT_SKILL_PROFILE_ID)?.activeSkillIds
            );
            expect(getDefaultSkillIds().length).toBeGreaterThan(0);
        });
    });
});
