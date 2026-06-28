import React from 'react';
import { Shield, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { OrgMember } from '@/hooks/useOrgManagement';

interface OrgMemberTableProps {
    members: OrgMember[];
    currentUserId: string | null;
    actionLoading: string | null;
    onToggleRole: (mId: string, currentRole: string) => void;
    onRemoveMember: (mUserId: string, mId: string, username: string) => void;
}

export const OrgMemberTable: React.FC<OrgMemberTableProps> = ({
    members,
    currentUserId,
    actionLoading,
    onToggleRole,
    onRemoveMember
}) => {
    return (
        <Card className="shadow-sm bg-card rounded-3xl overflow-hidden border-none text-foreground">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-secondary/30 border-b border-border">
                            <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Lehrkraft</th>
                            <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Modus</th>
                            <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Rolle im Institut</th>
                            <th className="px-6 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Verbrauch (OCR/KI)</th>
                            <th className="px-8 py-5 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right w-[150px]">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {members.map((m) => (
                            <tr key={m.id} className="hover:bg-secondary/10 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-secondary text-primary flex items-center justify-center font-bold text-xs uppercase tracking-tighter">
                                            {(m.username || '??').substring(0, 2)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{m.username}</span>
                                            <span className="text-xs font-bold text-muted-foreground/60">Beigetreten: {new Date(m.joinedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <Badge 
                                        variant="outline" 
                                        className={cn(
                                            "font-bold text-xs px-2.5 py-0.5 rounded-lg border-none",
                                            m.appMode === 'STANDARD' ? "bg-primary/10 text-primary" : 
                                            m.appMode === 'PURE' ? "bg-primary/10 text-primary" :
                                            "bg-warning/10 text-warning"
                                        )}
                                    >
                                        {m.appMode}
                                    </Badge>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs font-bold text-foreground border border-border">
                                        {m.workspaceRole === 'Org-Verwalter' ? '🏢⚙️ Org-Verwalter' : '🏫 Lehrkraft'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-sm font-bold text-foreground">{m.ocrUsed}</span>
                                        <span className="text-xs font-bold text-muted-foreground/40">/</span>
                                        <span className="text-sm font-bold text-foreground">{m.correctionUsed}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right w-[150px]">
                                    <div className="flex gap-2 justify-end">
                                        {m.id !== currentUserId && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn(
                                                        "h-9 w-9 rounded-xl transition-all",
                                                        m.workspaceRole === 'Org-Verwalter' ? "text-primary bg-secondary" : "text-muted-foreground hover:text-primary hover:bg-secondary"
                                                    )}
                                                    title={m.workspaceRole === 'Org-Verwalter' ? "Zum Lehrer herabstufen" : "Zum Verwalter befördern"}
                                                    onClick={() => onToggleRole(m.membershipId, m.workspaceRole)}
                                                    disabled={actionLoading === m.membershipId}
                                                >
                                                    {actionLoading === m.membershipId ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                                    title="Aus Organisation entfernen"
                                                    onClick={() => onRemoveMember(m.id, m.membershipId, m.username)}
                                                    disabled={actionLoading === m.membershipId}
                                                >
                                                    {actionLoading === m.membershipId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};
