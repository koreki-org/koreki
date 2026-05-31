import { EXPERT_REGISTRY } from '../../src/prompts/expert-profiles';

describe('Expert Profiles Registry (Layer 1 Unit) 🧪🏮🛡️', () => {
    it('should have the mandatory expert profiles registered', () => {
        expect(EXPERT_REGISTRY['id-standard']).toBeDefined();
        expect(EXPERT_REGISTRY['id-standard'].metadata.name).toBe('Allgemeine Korrektur');
        
        expect(EXPERT_REGISTRY['id-math-logic']).toBeDefined();
        expect(EXPERT_REGISTRY['id-math-logic'].metadata.name).toBe('Fachlehrer Mathematik');
    });

    it('should have all profiles marked as system profiles', () => {
        Object.values(EXPERT_REGISTRY).forEach(profile => {
            expect(profile.metadata.isSystem).toBe(true);
        });
    });

    it('should have valid prompt snippets (not empty)', () => {
        Object.values(EXPERT_REGISTRY).forEach(profile => {
            expect(profile.promptSnippet.length).toBeGreaterThan(10);
        });
    });
});
