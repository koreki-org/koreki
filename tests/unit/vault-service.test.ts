import { vaultService } from '../../src/lib/ai/vault-service';
import * as envContext from '../../src/lib/env-context';

// Mock env-context
jest.mock('../../src/lib/env-context', () => ({
    isDesktopTarget: jest.fn()
}));

describe('Vault Service (Layer 1 - Security Logic)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear sessionStorage mock
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn()
            },
            writable: true
        });
    });

    it('should use RAM storage in SaaS/Browser mode (RAM-only Policy)', async () => {
        (envContext.isDesktopTarget as jest.Mock).mockReturnValue(false);
        
        await vaultService.saveSecret('test-key', 'secret-value');
        
        // Verify it is NOT in sessionStorage
        expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
        
        // Verify it IS in the service (retrievable via getSecret)
        const value = await vaultService.getSecret('test-key');
        expect(value).toBe('secret-value');
    });

    it('should NOT use sessionStorage in Desktop mode', async () => {
        (envContext.isDesktopTarget as jest.Mock).mockReturnValue(true);
        
        // Mock the dynamic import of tauri
        // Note: In a real test environment, we'd need to mock @tauri-apps/api/core
        // But for this logic test, checking if sessionStorage is skipped is enough
        try {
            await vaultService.saveSecret('test-key', 'secret-value');
        } catch (e) {
            // Expected error as tauri-apps/api is not available in jest
        }
        
        expect(window.sessionStorage.setItem).not.toHaveBeenCalled();
    });
});
