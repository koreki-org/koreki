import { useState, useCallback } from 'react';
import { logger } from '../lib/logger';

/**
 * Industrial Legal Vault Hook (Stage 12 - Simplified) ⚖️🛡️
 * Manages the transition to checkbox-based AVV compliance.
 */
export const useLegalVault = (
    isOrganization: boolean,
    workspaceId?: string,
    onComplete?: (version?: string) => void
) => {
    const [isAccepted, setIsAccepted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeConsent = useCallback(async () => {
        if (!isAccepted) return;
        setIsProcessing(true);
        setError(null);

        try {
            // Industrial API Call: Multi-tenant aware 🏗️
            const res = await fetch('/api/user/consent-avv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    workspaceId: isOrganization ? workspaceId : null 
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (onComplete) onComplete(data.version);
            } else {
                const data = await res.json();
                setError(data.error || 'Fehler bei der Zustimmung.');
            }
        } catch (err) {
            logger.error("AVV Consent error:", err);
            setError('Systemfehler beim Speichern der AVV-Zustimmung.');
        } finally {
            setIsProcessing(false);
        }
    }, [isAccepted, isOrganization, workspaceId, onComplete]);

    const toggleAccepted = (val: boolean) => setIsAccepted(val);

    return {
        state: { isAccepted, isProcessing, error },
        handlers: { executeConsent, toggleAccepted }
    };
};
