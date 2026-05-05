import { Users, CreditCard, KeyRound, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WorkspaceInfo } from '@/hooks/useOrgManagement';

interface OrgStatsProps {
    membersCount: number;
    workspace: WorkspaceInfo | null;
    actionLoading: string | null;
    onUpdateCode: () => void;
}

export const OrgStats: React.FC<OrgStatsProps> = ({ 
    membersCount, 
    workspace, 
    actionLoading, 
    onUpdateCode 
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm bg-card group">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-secondary text-primary rounded-xl group-hover:scale-110 transition-transform">
                            <Users size={20} />
                        </div>
                        <Badge variant="outline" className="bg-secondary/50 border-primary/20 text-primary font-bold">Kollegium</Badge>
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-1">{membersCount}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lehrkräfte registriert</div>
                </CardContent>
            </Card>

            <Card className="shadow-sm bg-card group">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-secondary text-primary rounded-xl group-hover:scale-110 transition-transform">
                            <CreditCard size={20} />
                        </div>
                        <Badge variant="outline" className="bg-secondary/50 border-primary/20 text-primary font-bold">Guthaben</Badge>
                    </div>
                    <div className="text-3xl font-bold text-foreground mb-1">{workspace?.credits}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verfügbare Credits</div>
                </CardContent>
            </Card>

            <Card className="shadow-sm bg-card group border-none">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-secondary text-primary rounded-xl group-hover:scale-110 transition-transform">
                            <KeyRound size={20} />
                        </div>
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2 text-primary font-bold hover:bg-secondary"
                            onClick={onUpdateCode}
                            disabled={actionLoading === 'update-code'}
                        >
                            {actionLoading === 'update-code' ? <Loader2 size={14} className="animate-spin" /> : 'Neu generieren'}
                        </Button>
                    </div>
                    <div className="text-3xl font-mono font-bold text-foreground mb-1 tracking-tight">
                        {workspace?.inviteCode || '---'}
                    </div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Aktiver Beitritts-Code</div>
                </CardContent>
            </Card>
        </div>
    );
};
