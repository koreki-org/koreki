import React from 'react';
import { User, Shield, Gem, ClipboardCheck, Trash2, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Dropdown from '@/components/ui/Dropdown';
import { cn } from '@/lib/utils';
import { DbUser, Workspace } from '@/types';

interface UserTableProps {
    users: DbUser[];
    workspaces: Workspace[];
    actionLoading: string | null;
    onAssignWorkspace: (userId: string, wsId: string) => void;
    onAddCredits: (userId: string) => void;
    onFetchLogs: (userId: string, username: string) => void;
    onDeleteUser: (userId: string, username: string) => void;
    onSetRole: (userId: string, role: string) => void;
    onSetMembershipRole: (userId: string, wsId: string, role: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({
    users,
    workspaces,
    actionLoading,
    onAssignWorkspace,
    onAddCredits,
    onFetchLogs,
    onDeleteUser,
    onSetRole,
    onSetMembershipRole
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-secondary/30 border-b border-border/50">
                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nutzer</th>
                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Workspace Mapping</th>
                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Modus</th>
                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Status / Rolle</th>
                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Guthaben</th>
                        <th className="px-8 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Aktionen</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {users.map((u) => {
                        const orgMembership = u.memberships?.find(m => m.workspace?.type === 'ORGANIZATION');
                        const hasOrgMembership = !!orgMembership;
                        const personalWsId = u.memberships?.find(m => m.workspace?.type === 'PERSONAL')?.workspace?.id;
                        
                        const effectiveActiveWsId = hasOrgMembership ? orgMembership.workspace.id : (u.activeWorkspaceId || personalWsId);
                        const activeMembership = u.memberships?.find(m => m.workspace?.id === effectiveActiveWsId) || (u.memberships?.length > 0 ? u.memberships[0] : null);
                        const activeWs = activeMembership?.workspace;
                        
                        const userWorkspaceOptions = [
                            { value: personalWsId || '', label: 'Privater Account (B2C)', icon: <User size={14} className="text-muted-foreground"/> },
                            ...workspaces.filter(ws => ws.type === 'ORGANIZATION').map(ws => ({
                                value: ws.id,
                                label: ws.name,
                                icon: <Building2 size={14} className="text-primary"/>
                            }))
                        ];

                        let roleLabel = "Nutzer 👤";
                        let badgeStyles = "bg-secondary/50 text-muted-foreground border-border";
                        
                        if (u.role === 'ADMIN') {
                            roleLabel = "System-Admin 👑";
                            badgeStyles = "bg-warning/10 text-warning border-warning/20";
                        } else if (u.role === 'EXPERTE') {
                            roleLabel = "Privat-Experte 💎";
                            badgeStyles = "bg-primary/15 text-primary border-primary/30";
                        } else if (hasOrgMembership) {
                            const role = orgMembership.role;
                            if (role === 'ADMIN' || role === 'OWNER') {
                                roleLabel = "Org-Verwalter 🏢⚙️";
                                badgeStyles = "bg-primary/10 text-primary border-primary/20";
                            } else {
                                roleLabel = "Lehrkraft 🏫";
                                badgeStyles = "bg-primary/5 text-primary/80 border-primary/10";
                            }
                        }

                        return (
                            <tr key={u.id} className="hover:bg-secondary/10 transition-colors group">
                                <td className="px-8 py-4 text-sm font-bold text-foreground">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center text-muted-foreground">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <span>{u.username}</span>
                                            <span className="block text-xxs text-muted-foreground font-mono">{u.id.substring(0, 8)}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    {u.role === 'ADMIN' ? (
                                        <span className="text-xxs uppercase tracking-widest text-muted-foreground/40 italic">Global Governance</span>
                                    ) : (
                                        <div className="relative">
                                            <Dropdown
                                                value={effectiveActiveWsId || personalWsId || ''}
                                                onValueChange={(val) => onAssignWorkspace(u.id, val)}
                                                options={userWorkspaceOptions}
                                                disabled={actionLoading === u.id || hasOrgMembership}
                                                className="max-w-[240px] bg-card"
                                            />
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-4 text-center">
                                    <Badge variant="outline" className={cn(
                                        "text-xxs uppercase font-bold px-2 py-0.5",
                                        u.appMode === 'PURE' && "bg-primary/10 text-primary",
                                        u.appMode === 'STANDARD' && "bg-primary/10 text-primary",
                                        u.appMode === 'TRIAL' && "bg-warning/10 text-warning"
                                    )}>
                                        {u.appMode}
                                    </Badge>
                                </td>
                                <td className="px-8 py-4 text-center">
                                    <Badge variant="outline" className={cn("text-xxs uppercase font-bold px-2 py-1 flex items-center justify-center gap-1 min-w-[120px] rounded-full border-none", badgeStyles)}>
                                        {roleLabel}
                                    </Badge>
                                </td>
                                <td className="px-8 py-4 text-center font-bold">{activeWs?.credits || 0}</td>
                                <td className="px-8 py-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                        {hasOrgMembership && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onSetMembershipRole(u.id, orgMembership.workspace.id, orgMembership.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}>
                                                <Shield size={16} />
                                            </Button>
                                        )}
                                        {u.role !== 'ADMIN' && activeWs?.type === 'PERSONAL' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onSetRole(u.id, u.role === 'EXPERTE' ? 'USER' : 'EXPERTE')}>
                                                <Gem size={16} />
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" className="h-8 border-primary/20" onClick={() => onAddCredits(u.id)} disabled={actionLoading === u.id}>
                                            {actionLoading === u.id ? <Loader2 size={14} className="animate-spin" /> : <span className="font-bold">+10</span>}
                                        </Button>
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onFetchLogs(u.id, u.username)}>
                                            <ClipboardCheck size={16} />
                                        </Button>
                                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/20 hover:bg-destructive hover:text-white" onClick={() => onDeleteUser(u.id, u.username)} disabled={u.role === 'ADMIN'}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default UserTable;
