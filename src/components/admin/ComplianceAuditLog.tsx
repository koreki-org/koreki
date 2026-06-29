import React from 'react';
import { X, ClipboardCheck, Info, Clock, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface ComplianceAuditLogProps {
    username: string;
    logs: any[];
    loading: boolean;
    onClose: () => void;
    onExport: () => void;
}

const ComplianceAuditLog: React.FC<ComplianceAuditLogProps> = ({
    username,
    logs,
    loading,
    onClose,
    onExport
}) => {
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <Card className="relative w-full max-w-2xl shadow-2xl border-border animate-fade-up" onClick={e => e.stopPropagation()}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold tracking-tight">Compliance Audit Log</CardTitle>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{username}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </CardHeader>

                <CardContent>
                    <div className="max-h-[400px] overflow-y-auto px-1 space-y-4 mb-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Loader2 size={40} className="mb-4 animate-spin text-primary" />
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Lade Audit-Daten...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
                                <Info className="mx-auto mb-3 text-muted-foreground/50" size={32} />
                                <p className="text-muted-foreground font-medium text-xs uppercase tracking-wide">Keine Einträge vorhanden.</p>
                            </div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/30 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xxs font-bold uppercase tracking-widest rounded-md">{log.action}</span>
                                        <span className="text-xxs font-medium text-muted-foreground flex items-center gap-1">
                                            <Clock size={10} /> {new Date(log.createdAt).toLocaleString('de-DE')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/80 leading-relaxed bg-background/50 border border-border/50 p-3 rounded-lg mb-2 italic">
                                        &quot;{log.confirmedText}&quot;
                                    </p>
                                    <div className="text-xxs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-primary/50" />
                                        Quell-IP: {log.ip || 'Unbekannt'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-border">
                        <p className="text-xxs font-medium text-muted-foreground uppercase tracking-widest">DSGVO-konformes Logging</p>
                        <div className="flex gap-3">
                            {logs.length > 0 && (
                                <Button variant="outline" size="sm" className="font-bold flex items-center gap-2" onClick={onExport}>
                                    <Download size={14} /> CSV Export
                                </Button>
                            )}
                            <Button size="sm" className="font-bold px-8" onClick={onClose}>OK</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ComplianceAuditLog;
