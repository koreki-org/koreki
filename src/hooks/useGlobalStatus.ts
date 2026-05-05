import { useCallback } from 'react';
import { User } from '../types';
import { selectFiles } from '../lib/file-utils';

/**
 * Industrial Global Status Hook (Stage 9)
 * 🏮🛡️🏛️
 * Manages header-level interactions and role-based UI logic.
 * Delegated File selection to the unified file-utils bridge.
 */
export const useGlobalStatus = (
    userData: User | null,
    onImportSession?: (file: File) => void,
    onRelinkFiles?: (files: File[]) => void
) => {
    // --- Role Logic ---
    const getRoleLabel = useCallback(() => {
        if (userData?.role === 'ADMIN') return 'Administrator';
        if (userData?.activeWorkspaceType === 'ORGANIZATION') return 'Lehrkraft';
        if (userData?.role === 'EXPERTE') return 'Experte';
        return 'Nutzer';
    }, [userData]);

    const getWorkspaceLabel = useCallback(() => {
        return userData?.activeWorkspaceName || 'Organisation';
    }, [userData]);

    // --- Unified Bridge Actions ---
    const triggerImport = useCallback(async () => {
        if (!onImportSession) return;
        const files = await selectFiles({ 
            multiple: false, 
            accept: ".koreki,.pdf,.jpg,.jpeg,.png" 
        });
        if (files.length > 0) {
            onImportSession(files[0]);
        }
    }, [onImportSession]);

    const triggerRelink = useCallback(async () => {
        if (!onRelinkFiles) return;
        const files = await selectFiles({ 
            multiple: true, 
            accept: ".pdf,.jpg,.jpeg,.png" 
        });
        if (files.length > 0) {
            onRelinkFiles(files);
        }
    }, [onRelinkFiles]);

    return {
        refs: {}, // Refs no longer needed for file inputs
        logic: { getRoleLabel, getWorkspaceLabel },
        actions: { triggerImport, triggerRelink }
    };
};

