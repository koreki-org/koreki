import { CorrectionSchema } from '../../src/lib/validation';

describe('Validation tests', () => {

    it('should validate a correct payload', () => {
        const payload = {
            modelSolution: 'Musterlösung',
            studentText: 'Schülerantwort',
            settings: { provider: 'mistral' }
        };
        const res = CorrectionSchema.safeParse(payload);
        expect(res.success).toBe(true);
    });

    it('should fail if modelSolution is missing', () => {
        const payload = {
            modelSolution: '',
            studentText: 'Schülerantwort',
            settings: { provider: 'mistral' }
        };
        const res = CorrectionSchema.safeParse(payload);
        expect(res.success).toBe(false);
        if (!res.success) {
            expect(res.error.issues[0].message).toBe('Musterlösung fehlt');
        }
    });

    it('should fail if studentText is too long', () => {
        const payload = {
            modelSolution: 'Musterlösung',
            studentText: 'A'.repeat(10001),
            settings: { provider: 'mistral' }
        };
        const res = CorrectionSchema.safeParse(payload);
        expect(res.success).toBe(false);
    });

    it('should allow optional fields', () => {
        const payload = {
            modelSolution: 'Musterlösung',
            studentText: 'Schülerantwort',
            settings: { provider: 'mistral', model: 'large' },
            pageCount: 2,
            documentType: 'scanned'
        };
        const res = CorrectionSchema.safeParse(payload);
        expect(res.success).toBe(true);
    });
});
