import React from 'react';
import { useRouter } from 'next/router';
import { School, Building2, KeyRound, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Workspace } from '@/types';

interface WorkspaceManagerProps {
    workspaces: Workspace[];
    actionLoading: string | null;
    onCreateWorkspace: (name: string, type: 'ORGANIZATION' | 'PERSONAL') => void;
    onAddCredits: (wsId: string) => void;
    onUpdateInviteCode: (wsId: string) => void;
    onDeleteWorkspace: (wsId: string, name: string, credits: number, members: number) => void;
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
    workspaces,
    actionLoading,
    onCreateWorkspace,
    onAddCredits,
    onUpdateInviteCode,
    onDeleteWorkspace
}) => {
    const router = useRouter();
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <Card className="bg-secondary/30 border-border/50 shadow-none p-6 rounded-3xl">
                <CardHeader className="p-0 mb-6">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                        <School size={24} />
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground">Institut anlegen</CardTitle>
                    <CardDescription className="text-muted-foreground">Erstelle eine neue Organisationseinheit.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <form className="space-y-6" onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const name = (form.elements.namedItem('wsName') as HTMLInputElement).value;
                        onCreateWorkspace(name, 'ORGANIZATION');
                        form.reset();
                    }}>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bezeichnung</label>
                            <Input 
                                name="wsName"
                                placeholder="z.B. Koreki University"
                                required
                                className="rounded-xl h-11 bg-card border-border border-2 focus:border-primary transition-all"
                            />
                        </div>
                        <Button type="submit" className="w-full font-bold h-12 rounded-full bg-primary hover:bg-primary-hover text-white shadow-md shadow-primary/20 transition-all">
                            Partner anlegen
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-border/50 shadow-none bg-card rounded-3xl overflow-hidden">
                <CardHeader className="p-6 border-b border-border/50">
                    <CardTitle className="text-lg font-semibold">Bestehende Institute</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-secondary/30 border-b border-border/50">
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Budget</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Code</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {workspaces.filter(w => w.type === 'ORGANIZATION').map((ws) => (
                                    <tr key={ws.id} className="hover:bg-secondary/10 font-medium transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold flex items-center gap-2 text-foreground">
                                            <Building2 size={14} className="text-primary"/>
                                            {ws.name}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-bold text-primary">{ws.credits} Credits</td>
                                        <td className="px-6 py-4 text-center">
                                            {ws.inviteCode ? (
                                                <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-md">
                                                    {ws.inviteCode}
                                                </Badge>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/50 italic">Kein Code</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="outline" size="sm" className="h-8 w-8 rounded-full" onClick={() => router.push(`/org-admin?workspaceId=${ws.id}`)} title="God-Mode">
                                                    <ShieldCheck size={14} />
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-8 w-8 rounded-full" onClick={() => onUpdateInviteCode(ws.id)} disabled={actionLoading === ws.id}>
                                                    {actionLoading === ws.id ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-8 w-12 rounded-full" onClick={() => onAddCredits(ws.id)} disabled={actionLoading === ws.id}>
                                                    {actionLoading === ws.id ? <Loader2 size={14} className="animate-spin" /> : <span className="font-bold text-xs">+10</span>}
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-8 text-destructive border-destructive/20 hover:bg-destructive hover:text-white rounded-full px-3" onClick={() => onDeleteWorkspace(ws.id, ws.name, ws.credits, ws.memberships?.length || 0)} disabled={actionLoading === ws.id}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WorkspaceManager;
