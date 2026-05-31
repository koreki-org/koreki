import { checkRateLimit } from '../../src/lib/rate-limit';

/**
 * Pillar 1: In-Memory Rate Limiting Verification
 */
describe('Security: Pillar 1 - Rate Limiting', () => {

    it('should allow requests within the global limit (100 RPM)', async () => {
        // We test a few requests to ensure basic functionality
        for (let i = 0; i < 5; i++) {
            const isAllowed = await checkRateLimit('test-ip-1');
            expect(isAllowed).toBe(true);
        }
    });

    it('should allow requests within the AI limit (10 RPM)', async () => {
        for (let i = 0; i < 3; i++) {
            const isAllowed = await checkRateLimit('test-ip-ai', true);
            expect(isAllowed).toBe(true);
        }
    });

    it('should block requests exceeding the AI limit (11th request)', async () => {
        const ip = 'shady-ip';
        // Consume 10 points
        for (let i = 0; i < 10; i++) {
            await checkRateLimit(ip, true);
        }
        // 11th should fail
        const final = await checkRateLimit(ip, true);
        expect(final).toBe(false);
    });
});
