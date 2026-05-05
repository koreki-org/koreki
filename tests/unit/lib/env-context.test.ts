/** @jest-environment node */

/**
 * Industrial Security Verification: Local Instance Context 🛡️
 */
describe('env-context: isLocalInstance()', () => {
    const originalEnv = process.env;
    const originalWindow = global.window;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        // @ts-ignore
        delete global.window;
    });

    afterAll(() => {
        process.env = originalEnv;
        // @ts-ignore
        global.window = originalWindow;
    });

    it('should return false if no local mode is set', () => {
        process.env.NEXT_PUBLIC_KOREKI_MODE = 'saas';
        const { isLocalInstance } = require('../../../src/lib/env-context');
        expect(isLocalInstance()).toBe(false);
    });

    it('should return true if mode is "desktop"', () => {
        process.env.NEXT_PUBLIC_KOREKI_MODE = 'desktop';
        const { isLocalInstance } = require('../../../src/lib/env-context');
        expect(isLocalInstance()).toBe(true);
    });

    it('should return true if mode is "community" and SINGLE_USER_MODE is enabled', () => {
        process.env.NEXT_PUBLIC_KOREKI_MODE = 'community';
        process.env.NEXT_PUBLIC_SINGLE_USER_MODE = 'true';
        const { isLocalInstance } = require('../../../src/lib/env-context');
        expect(isLocalInstance()).toBe(true);
    });

    it('should return TRUE for community mode even if SINGLE_USER_MODE is disabled (e.g. multi-user server)', () => {
        process.env.NEXT_PUBLIC_KOREKI_MODE = 'community';
        process.env.NEXT_PUBLIC_SINGLE_USER_MODE = 'false';
        const { isLocalInstance } = require('../../../src/lib/env-context');
        expect(isLocalInstance()).toBe(true);
    });

    it('should return FALSE if flag is set but domain is production (Security Lock)', () => {
        process.env.NEXT_PUBLIC_KOREKI_MODE = 'desktop';
        process.env.NEXT_PUBLIC_AUTH_TYPE = 'NONE';
        
        // Plain object mocking works in node environment
        // @ts-ignore
        global.window = { location: { hostname: 'koreki.org' } };
        
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const { isLocalInstance } = require('../../../src/lib/env-context');
        expect(isLocalInstance()).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SECURITY ALERT'));
        
        consoleSpy.mockRestore();
    });

    it('should return FALSE for www production domain', () => {
        process.env.NEXT_PUBLIC_KOREKI_MODE = 'community';
        process.env.NEXT_PUBLIC_SINGLE_USER_MODE = 'true';
        // @ts-ignore
        global.window = { location: { hostname: 'www.koreki.org' } };
        
        const { isLocalInstance } = require('../../../src/lib/env-context');
        expect(isLocalInstance()).toBe(false);
    });
});
