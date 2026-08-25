import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { DbUser, Workspace, AppSettings } from '../types';
import { apiClient } from '@/lib/api-client';
import { meldeFehler } from '@/lib/notify';
import { askConfirmation } from '@/lib/confirm-dialog';

export const useAdminData = () => {
    const [users, setUsers] = useState<DbUser[]>([]);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [settings, setSettings] = useState<AppSettings>({
        provider: 'mistral'
    });
    const [privacyLogs, setPrivacyLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const router = useRouter();

    const fetchData = useCallback(async () => {
        try {
            const userRes = await apiClient.get('/api/user');
            const userData = await userRes.json();
            if (!userData.loggedIn || userData.user.role !== 'ADMIN') {
                router.push('/');
                return;
            }

            const usersResponse = await apiClient.get('/api/admin/users');
            if (usersResponse.ok) {
                const data = await usersResponse.json();
                setUsers(Array.isArray(data) ? data : []);
            }

            const wsResponse = await apiClient.get('/api/admin/workspaces');
            if (wsResponse.ok) {
                const data = await wsResponse.json();
                setWorkspaces(Array.isArray(data) ? data : []);
            }

            const settingsResponse = await apiClient.get('/api/admin/settings');
            if (settingsResponse.ok) {
                const sData = await settingsResponse.json();
                setSettings(prev => ({
                    ...prev,
                    ocrCostPerMillion: sData.ocrPricePerMillion || prev.ocrCostPerMillion,
                    ocrInputCostPerMillion: sData.ocrInputPricePerMillion || prev.ocrInputCostPerMillion,
                    ocrOutputCostPerMillion: sData.ocrOutputPricePerMillion || prev.ocrOutputCostPerMillion,
                    correctionCostPerMillion: sData.correctionPricePerMillion || prev.correctionCostPerMillion,
                    correctionInputCostPerMillion: sData.correctionInputPricePerMillion || prev.correctionInputCostPerMillion,
                    correctionOutputCostPerMillion: sData.correctionOutputPricePerMillion || prev.correctionOutputCostPerMillion,
                    ocrBudget: sData.ocrBudget || prev.ocrBudget,
                    correctionBudget: sData.correctionBudget || prev.correctionBudget,
                    correctionPrompt: sData.correctionPrompt || prev.correctionPrompt
                } as any));
            }
        } catch (err) {
            console.error("Admin Load Error:", err);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        const loadSettings = async () => {
            const saved = localStorage.getItem('koreki_settings');
            let mergedSettings: AppSettings = { provider: 'mistral' };
            
            if (saved) {
                try {
                    mergedSettings = { ...mergedSettings, ...JSON.parse(saved) };
                } catch (e) {
                    console.error("Failed to load local settings", e);
                }
            }

            // Industrial Hardening: Load secrets from Vault, NOT localStorage
            try {
                const { vaultService } = await import('../lib/ai/vault-service');
                const mKey = await vaultService.getSecret('koreki-mistral-key');
                const oKey = await vaultService.getSecret('koreki-openai-key');
                
                if (mKey) mergedSettings.mistralKey = mKey;
                if (oKey) mergedSettings.openaiKey = oKey;
            } catch (e) {
                console.error("Vault load error:", e);
            }

            setSettings(prev => ({ ...prev, ...mergedSettings }));
        };

        loadSettings();
    }, []);

    useEffect(() => {
        if (router.isReady) {
            fetchData();
        }
    }, [router.isReady, fetchData]);

    const saveSettings = async (newSettings: AppSettings) => {
        setSettings(newSettings);
        
        // Industrial Privacy: Strip sensitive keys before persisting to localStorage
        const { mistralKey, openaiKey, ...safeSettings } = newSettings as any;
        localStorage.setItem('koreki_settings', JSON.stringify(safeSettings));
        
        try {
            await apiClient.post('/api/admin/settings', safeSettings);
        } catch (err) {
            console.error("Failed to sync global settings", err);
        }
    };

    const fetchPrivacyLogs = async (userId: string) => {
        setLogsLoading(true);
        try {
            const res = await apiClient.get(`/api/admin/privacy-logs?userId=${userId}`);
            if (res.ok) setPrivacyLogs(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLogsLoading(false);
        }
    };

    const addCredits = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await apiClient.post('/api/admin/users', { 
                userId, action: 'add-credits', amount: 10 
            });
            if (res.ok) await fetchData();
            else {
                const errorData = await res.json();
                meldeFehler(`Fehler: ${errorData.message}`);
            }
        } finally {
            setActionLoading(null);
        }
    };

    const assignWorkspace = async (userId: string, workspaceId: string) => {
        setActionLoading(userId);
        try {
            const res = await apiClient.post('/api/admin/users', { 
                userId, action: 'assign-workspace', workspaceId 
            });
            if (res.ok) await fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (userId: string, username: string) => {
        if (!(await askConfirmation({
            title: 'Nutzer löschen',
            message: `Nutzer "${username}" wirklich löschen?`
        }))) return;
        setActionLoading(userId);
        try {
            const res = await apiClient.post('/api/admin/users', { 
                userId, action: 'delete-user' 
            });
            if (res.ok) await fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const addWsCredits = async (workspaceId: string) => {
        setActionLoading(workspaceId);
        try {
            const res = await apiClient.post('/api/admin/workspaces', { 
                workspaceId, action: 'add-credits', amount: 10 
            });
            if (res.ok) await fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const updateInviteCode = async (wsId: string) => {
        if (!(await askConfirmation({
            title: 'Neuen Beitritts-Code erzeugen',
            message: 'Der bisherige Code wird dadurch ungültig. Fortfahren?'
        }))) return;
        setActionLoading(wsId);
        const fullCode = `JOIN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        try {
            await apiClient.post('/api/admin/workspaces', { 
                workspaceId: wsId, action: 'set-invite-code', inviteCode: fullCode 
            });
            await fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const deleteWorkspace = async (workspaceId: string, name: string) => {
        if (!(await askConfirmation({
            title: 'Organisation löschen',
            message: `Organisation "${name}" wirklich löschen?`
        }))) return;
        setActionLoading(workspaceId);
        try {
            await apiClient.post('/api/admin/workspaces', { 
                workspaceId, action: 'delete' 
            });
            await fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const createWorkspace = async (name: string, type: 'ORGANIZATION' | 'PERSONAL') => {
        try {
            const res = await apiClient.post('/api/admin/workspaces', { 
                name, type, credits: 0 
            });
            if (res.ok) await fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const setRole = async (userId: string, role: string) => {
        setActionLoading(userId);
        try {
            await apiClient.post('/api/admin/users', { 
                userId, action: 'set-role', role 
            });
            await fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    const setMembershipRole = async (userId: string, workspaceId: string, role: string) => {
        setActionLoading(userId);
        try {
            await apiClient.post('/api/admin/users', { 
                userId, action: 'set-membership-role', workspaceId, role 
            });
            await fetchData();
        } finally {
            setActionLoading(null);
        }
    };

    return {
        users, workspaces, loading, actionLoading, settings, 
        privacyLogs, logsLoading, 
        saveSettings, fetchPrivacyLogs, addCredits, assignWorkspace, 
        deleteUser, addWsCredits, updateInviteCode, deleteWorkspace, 
        createWorkspace, setRole, setMembershipRole, setPrivacyLogs
    };
};
