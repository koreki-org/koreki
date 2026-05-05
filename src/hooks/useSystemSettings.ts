import { useState } from 'react';
import { AppSettings } from '@/types';
import { apiClient } from '@/lib/api-client';

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

    const updateSettings = (updates: Partial<AppSettings>, currentSettings: AppSettings) => {
        onSave({ ...currentSettings, ...updates });
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
