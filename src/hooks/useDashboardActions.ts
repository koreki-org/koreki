import { useCallback } from 'react';
import { AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';

export const useDashboardActions = (
    userData: any,
    setUserData: React.Dispatch<React.SetStateAction<any>>,
    settings: AppSettings,
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>,
    fetchAiStatus: () => void
) => {
    
    const saveSettings = useCallback((newSettings: AppSettings) => {
        setSettings(newSettings);
        // Persist logic can go here or in app.tsx
    }, [setSettings]);

    const handleModeSelect = useCallback(async (mode: 'STANDARD' | 'PURE' | 'TRIAL') => {
        try {
            const res = await apiClient.post('/api/user/update-mode', { mode });
            if (res.ok) {
                setUserData((prev: any) => ({ ...prev, appMode: mode }));
                fetchAiStatus();
            }
        } catch (err) {
            console.error("Mode update error:", err);
        }
    }, [setUserData, fetchAiStatus]);

    const handleUnlockExpert = useCallback(async () => {
        try {
            const res = await apiClient.post('/api/user/unlock-expert', {});
            if (res.ok) {
                setUserData((prev: any) => ({ ...prev, role: 'ADMIN' }));
            }
        } catch (err) {
            console.error("Expert unlock error:", err);
        }
    }, [setUserData]);

    return {
        saveSettings,
        handleModeSelect,
        handleUnlockExpert
    };
};
