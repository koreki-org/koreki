import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';
import { meldeFehler } from '@/lib/notify';
import { askConfirmation } from '@/lib/confirm-dialog';

export interface OrgMember {
    id: string;
    membershipId: string;
    username: string;
    systemRole: string;
    workspaceRole: string;
    appMode: string;
    ocrUsed: number;
    correctionUsed: number;
    joinedAt: string;
}

export interface WorkspaceInfo {
    id: string;
    name: string;
    credits: number;
    inviteCode: string;
    avvAccepted: boolean;
    createdAt: string;
}

export const useOrgManagement = () => {
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showAvvModal, setShowAvvModal] = useState(false);
    const router = useRouter();

    const fetchData = useCallback(async () => {
        try {
            const { workspaceId } = router.query;
            let fetchUrl = '/api/org-admin';
            if (workspaceId) {
                fetchUrl += `?workspaceId=${workspaceId}`;
            }

            const res = await apiClient.get(fetchUrl);
            if (res.status === 403 || res.status === 401) {
                router.push('/app');
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members);
                setWorkspace(data.workspace);
                setCurrentUserId(data.currentUserId);
                
                // Block access if organization AVV is missing 
                // BUT: Allow System Admins (role === 'ADMIN') to bypass
                const isSystemAdmin = data.currentUserRole === 'ADMIN';
                
                if (!data.workspace.avvAccepted && !isSystemAdmin) {
                    setShowAvvModal(true);
                } else {
                    setShowAvvModal(false);
                }
            }
        } catch (err) {
            console.error("Failed to load org data", err);
        } finally {
            setLoading(false);
        }
    }, [router.query.workspaceId, router]);

    useEffect(() => {
        if (router.isReady) {
            fetchData();
        }
    }, [router.isReady, fetchData]);

    const handleUpdateCode = async () => {
        if (!workspace) return;
        if (!(await askConfirmation({
            title: 'Neuen Beitritts-Code erzeugen',
            message: 'Möchtest du wirklich einen neuen Beitritts-Code für dein Institut generieren?\n\nACHTUNG: Der ALTE Code wird dadurch sofort ungültig!'
        }))) return;

        setActionLoading('update-code');
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const fullCode = `JOIN-${randomCode}`;

        try {
            const res = await apiClient.post('/api/org-admin/update-code', { 
                workspaceId: workspace.id, inviteCode: fullCode 
            });
            if (res.ok) {
                await fetchData();
            } else {
                const data = await res.json();
                meldeFehler(data.message || "Fehler beim Aktualisieren");
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveMember = async (memberUserId: string, mId: string, username: string) => {
        if (!(await askConfirmation({
            title: 'Mitglied entfernen',
            message: `Möchtest du ${username} wirklich aus deinem Institut entfernen?\n\nDer Lehrer wird automatisch auf TRIAL zurückgestuft und verliert den Zugriff auf das Schul-Budget.`
        }))) return;

        setActionLoading(mId);
        try {
            const res = await apiClient.post('/api/org-admin/remove-member', { 
                membershipId: mId, targetUserId: memberUserId 
            });
            if (res.ok) {
                await fetchData();
            } else {
                const data = await res.json();
                meldeFehler(data.message || "Fehler beim Entfernen");
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleRole = async (mId: string, currentRole: string) => {
        setActionLoading(mId);
        const targetRole = currentRole === 'Org-Verwalter' ? 'MEMBER' : 'ADMIN';
        
        try {
            const res = await apiClient.post('/api/org-admin/toggle-role', { 
                membershipId: mId, targetRole 
            });
            if (res.ok) {
                await fetchData();
            } else {
                const data = await res.json();
                meldeFehler(data.message || "Fehler beim Rollenwechsel");
            }
        } finally {
            setActionLoading(null);
        }
    };

    return {
        members,
        workspace,
        currentUserId,
        loading,
        actionLoading,
        showAvvModal,
        setShowAvvModal,
        fetchData,
        handleUpdateCode,
        handleRemoveMember,
        handleToggleRole
    };
};
