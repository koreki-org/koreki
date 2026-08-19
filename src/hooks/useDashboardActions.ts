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
                // Die Rolle nehmen, die der Server vergeben HAT.
                //
                // GEFUNDEN BEIM LESEN, 19.08.2026: Hier stand fest 'ADMIN'.
                // Die Route vergibt aber 'EXPERTE' und meldet das auch so
                // zurueck (`newRole`). Der Client-Zustand behauptete danach
                // Systemadministrator — und der Zugang zu den
                // System-Einstellungen haengt in AppHeader genau daran.
                //
                // Echte Rechte entstanden dadurch nicht: Die Admin-Routen
                // pruefen die Rolle in der Datenbank (`requireAdmin: 'SYS'`)
                // und antworten mit 403. Der Nutzer sah nach dem Kauf also
                // einen Knopf, der ihn ins Leere fuehrt — bis zum naechsten
                // Neuladen.
                const daten = await res.json().catch(() => null);
                const neueRolle = daten?.newRole ?? 'EXPERTE';
                setUserData((prev: any) => ({ ...prev, role: neueRolle }));
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
