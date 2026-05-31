import { renderHook, act } from '@testing-library/react';
import { useLegalVault } from '../../../src/hooks/useLegalVault';

// Mock fetch globally
global.fetch = jest.fn();

describe('useLegalVault Hook (Industrial Consent Tests) ⚖️🛡️', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, version: '1.1' })
        });
    });

    it('should initialize with no consent and no error', () => {
        const { result } = renderHook(() => useLegalVault(true, 'ws-1'));
        expect(result.current.state.isAccepted).toBe(false);
        expect(result.current.state.isProcessing).toBe(false);
        expect(result.current.state.error).toBeNull();
    });

    it('should allow toggling the consent status', () => {
        const { result } = renderHook(() => useLegalVault(true, 'ws-1'));
        
        act(() => {
            result.current.handlers.toggleAccepted(true);
        });
        expect(result.current.state.isAccepted).toBe(true);

        act(() => {
            result.current.handlers.toggleAccepted(false);
        });
        expect(result.current.state.isAccepted).toBe(false);
    });

    it('should execute consent and call the industrial API endpoint', async () => {
        const onComplete = jest.fn();
        const { result } = renderHook(() => useLegalVault(true, 'ws-123', onComplete));
        
        act(() => {
            result.current.handlers.toggleAccepted(true);
        });

        await act(async () => {
            await result.current.handlers.executeConsent();
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/user/consent-avv', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ workspaceId: 'ws-123' })
        }));

        expect(onComplete).toHaveBeenCalledWith('1.1');
        expect(result.current.state.isProcessing).toBe(false);
    });

    it('should handle system errors during consent execution', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Ungültige Workspace-ID' })
        });

        const { result } = renderHook(() => useLegalVault(true, 'invalid-ws'));
        
        act(() => {
            result.current.handlers.toggleAccepted(true);
        });

        await act(async () => {
            await result.current.handlers.executeConsent();
        });

        expect(result.current.state.error).toBe('Ungültige Workspace-ID');
        expect(result.current.state.isProcessing).toBe(false);
    });

    it('should block execution if consent is not toggled', async () => {
        const { result } = renderHook(() => useLegalVault(false));
        
        await act(async () => {
            await result.current.handlers.executeConsent();
        });

        expect(global.fetch).not.toHaveBeenCalled();
    });
});
