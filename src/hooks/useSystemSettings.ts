import { useState } from 'react';
import { AppSettings } from '@/types';
import { apiClient } from '@/lib/api-client';
import { isLocalInstance } from '@/lib/env-context';

export const useSystemSettings = (onSave: (newSettings: AppSettings) => void) => {
    const [delLoading, setDelLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
            'Möchtest du dein Konto wirklich unwiderruflich löschen?\n\nACHTUNG: Alle Daten sowie verbleibende Credits verfallen sofort und können nicht erstattet oder wiederhergestellt werden!'
        );

        if (!confirmDelete) return;

        setDelLoading(true);
        try {
            const res = await apiClient.post('/api/user/delete', {});
            if (res.ok) {
                // Redirect to sign-out to clear local cookie and prevent auto-recreation
                window.location.href = '/api/logto/sign-out';
            } else {
                const data = await res.json();
                alert(data.message || 'Fehler beim Löschen des Kontos.');
                setDelLoading(false);
            }
        } catch (err) {
            alert('Ein Netzwerkfehler ist aufgetreten.');
            setDelLoading(false);
        }
    };

    const handleJoinOrganization = async () => {
        if (!inviteCode.trim()) return;
        setJoinLoading(true);
        try {
            const res = await apiClient.post('/api/workspaces/join', {
                inviteCode: inviteCode.trim()
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Erfolgreich beigetreten: ${data.workspaceName}`);
                window.location.reload();
            } else {
                alert(data.message || 'Fehler beim Beitreten.');
            }
        } catch (err) {
            alert('Netzwerkfehler.');
        } finally {
            setJoinLoading(false);
        }
    };

    const updateSettings = async (updates: Partial<AppSettings>, currentSettings: AppSettings, isAdmin?: boolean) => {
        const merged = { ...currentSettings, ...updates };
        onSave(merged);
        
        // If we have admin privileges in local/community mode, save routing settings globally
        if (isAdmin && isLocalInstance()) {
            try {
                await apiClient.post('/api/admin/global-ai-settings', merged);
            } catch (err) {
                console.error('Failed to save global AI settings:', err);
            }
        }
    };

    return {
        delLoading,
        inviteCode,
        setInviteCode,
        joinLoading,
        handleDeleteAccount,
        handleJoinOrganization,
        updateSettings
    };
};
