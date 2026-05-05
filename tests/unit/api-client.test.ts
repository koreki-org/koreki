import { validateNetworkTarget } from '../../src/lib/api-client';
import { isLocalInstance } from '../../src/lib/env-context';

jest.mock('../../src/lib/env-context', () => ({
    isLocalInstance: jest.fn()
}));

describe('ApiClient Network Isolation Guard', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('SaaS Mode (Local Off)', () => {
        it('should allow any URL in SaaS mode', () => {
            (isLocalInstance as jest.Mock).mockReturnValue(false);
            
            expect(() => validateNetworkTarget('https://koreki.org/api/user')).not.toThrow();
            expect(() => validateNetworkTarget('https://google.com')).not.toThrow();
        });
    });

    describe('Local Mode (Isolation On)', () => {
        beforeEach(() => {
            (isLocalInstance as jest.Mock).mockReturnValue(true);
        });

        it('should allow relative API calls', () => {
            expect(() => validateNetworkTarget('/api/user')).not.toThrow();
            expect(() => validateNetworkTarget('/api/ai-status')).not.toThrow();
        });

        it('should allow localhost and private network addresses', () => {
            expect(() => validateNetworkTarget('http://localhost:3000/api/user')).not.toThrow();
            expect(() => validateNetworkTarget('http://127.0.0.1:11434/api/generate')).not.toThrow();
            expect(() => validateNetworkTarget('http://192.168.1.50:11434/api/generate')).not.toThrow();
            expect(() => validateNetworkTarget('http://10.0.0.10/api/generate')).not.toThrow();
            expect(() => validateNetworkTarget('http://172.20.0.1/api/generate')).not.toThrow();
        });

        it('should allow whitelisted external domains (Mistral)', () => {
            expect(() => validateNetworkTarget('https://api.mistral.ai/v1/chat/completions')).not.toThrow();
        });

        it('should block calls to SaaS infrastructure (*.koreki.org)', () => {
            expect(() => validateNetworkTarget('https://koreki.org/api/billing')).toThrow(/Koreki Security/);
            expect(() => validateNetworkTarget('https://auth.koreki.org/oidc')).toThrow(/Koreki Security/);
        });

        it('should block calls to unknown external domains', () => {
            expect(() => validateNetworkTarget('https://google.com')).toThrow(/Koreki Security/);
            expect(() => validateNetworkTarget('https://malicious-site.com/api')).toThrow(/Koreki Security/);
        });
    });
});
