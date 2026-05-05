import React, { useState } from 'react';
import { Loader2, Settings } from 'lucide-react';
import AuthGuard from '@/components/guards/AuthGuard';
import AdminLayout from '@/layouts/AdminLayout';
import SettingsModal from '@/components/SettingsModal';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import ComplianceAuditLog from '@/components/admin/ComplianceAuditLog';

// Modular Components
import UserTable from '@/components/admin/UserTable';
import WorkspaceManager from '@/components/admin/WorkspaceManager';
import CostOverview from '@/components/admin/CostOverview';

// Hook
import { useAdminData } from '@/hooks/useAdminData';

export default function AdminDashboard() {
    const {
        users, workspaces, loading, actionLoading, settings,
        privacyLogs, logsLoading, 
        saveSettings, fetchPrivacyLogs, addCredits, assignWorkspace, 
        deleteUser, addWsCredits, updateInviteCode, deleteWorkspace, 
        createWorkspace, setRole, setMembershipRole, setPrivacyLogs
    } = useAdminData();

    const [activeTab, setActiveTab] = useState('users');
    const [showSettings, setShowSettings] = useState(false);
    const [selectedUserLogs, setSelectedUserLogs] = useState<{ userId: string, username: string } | null>(null);

    const handleFetchLogs = (userId: string, username: string) => {
        setSelectedUserLogs({ userId, username });
        fetchPrivacyLogs(userId);
    };

    const exportLogsCSV = () => {
        if (!selectedUserLogs || privacyLogs.length === 0) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + "ID,Action,Timestamp,IP,ConfirmedText\n"
            + privacyLogs.map(l => `${l.id},${l.action},${l.createdAt},${l.ip},"${l.confirmedText.replace(/"/g, '""')}"`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `audit_log_${selectedUserLogs.username}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <AuthGuard requireAdmin>
            <AdminLayout 
                title="Admin-Zentrale"
                headTitle="Admin-Zentrale | Koreki"
                headerRight={(
                    <>
                        <Card className="min-w-[150px] shadow-sm bg-card border-border">
                            <CardContent className="p-4 text-center">
                                <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Nutzer</span>
                                <span className="text-2xl font-bold tracking-tight text-foreground">{users.length}</span>
                            </CardContent>
                        </Card>
                        <Card className="min-w-[150px] shadow-sm border-primary/20 bg-primary/5">
                            <CardContent className="p-4 text-center">
                                <span className="block text-xs font-medium text-primary uppercase tracking-wide mb-1">Partner</span>
                                <span className="text-2xl font-bold tracking-tight text-primary">{workspaces.filter(w=>w.type==='ORGANIZATION').length}</span>
                            </CardContent>
                        </Card>
                    </>
                )}
            >
                <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="users" className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <TabsList className="bg-secondary/50 border border-border p-1.5 rounded-2xl">
                            <TabsTrigger value="users">Benutzer</TabsTrigger>
                            <TabsTrigger value="workspaces">Institute</TabsTrigger>
                            <TabsTrigger value="costs">Kosten</TabsTrigger>
                        </TabsList>
                        
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowSettings(true)}
                            className="gap-2 h-10 rounded-full px-6 bg-card border-border shadow-sm text-foreground hover:bg-secondary transition-all"
                        >
                            <Settings size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider">KI-Einstellungen</span>
                        </Button>
                    </div>

                    <Card className="shadow-sm border-border/50 bg-card overflow-hidden">
                        <CardContent className="p-0">
                            <TabsContent value="users" className="mt-0 animate-fade-in">
                                <UserTable 
                                    users={users}
                                    workspaces={workspaces}
                                    actionLoading={actionLoading}
                                    onAddCredits={addCredits}
                                    onAssignWorkspace={assignWorkspace}
                                    onDeleteUser={deleteUser}
                                    onFetchLogs={handleFetchLogs}
                                    onSetRole={setRole}
                                    onSetMembershipRole={setMembershipRole}
                                />
                            </TabsContent>

                            <TabsContent value="workspaces" className="mt-0 animate-fade-in">
                                <WorkspaceManager 
                                    workspaces={workspaces}
                                    actionLoading={actionLoading}
                                    onCreateWorkspace={createWorkspace}
                                    onAddCredits={addWsCredits}
                                    onUpdateInviteCode={updateInviteCode}
                                    onDeleteWorkspace={(id, name, credits, m) => deleteWorkspace(id, name)}
                                />
                            </TabsContent>

                            <TabsContent value="costs" className="mt-0 animate-fade-in">
                                <CostOverview users={users} settings={settings} />
                            </TabsContent>
                        </CardContent>
                    </Card>
                </Tabs>

                {selectedUserLogs && (
                    <ComplianceAuditLog
                        username={selectedUserLogs.username}
                        logs={privacyLogs}
                        loading={logsLoading}
                        onClose={() => setSelectedUserLogs(null)}
                        onExport={exportLogsCSV}
                    />
                )}

                {showSettings && (
                    <SettingsModal
                        settings={settings}
                        onSave={saveSettings}
                        onClose={() => setShowSettings(false)}
                        isAdminView={true}
                    />
                )}
            </AdminLayout>
        </AuthGuard>
    );
}
