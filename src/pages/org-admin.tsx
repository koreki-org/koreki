import React, { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useRouter } from 'next/router';
import { Loader2, Info, KeyRound, AlertTriangle, Shield, Eye, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import AuthGuard from '@/components/guards/AuthGuard';

// Sub-Components
import { OrgStats } from '@/components/org/OrgStats';
import { OrgMemberTable } from '@/components/org/OrgMemberTable';
import { OrgModals } from '@/components/org/OrgModals';

// Hooks
import { useOrgManagement } from '@/hooks/useOrgManagement';

export default function OrgAdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('members');

    // --- INDUSTRIAL MODULARIZATION (STAGE 3) ---
    const {
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
    } = useOrgManagement();

    return (
        <AuthGuard>
            <AdminLayout 
                title="Schul-Verwaltung"
                institution={workspace?.name}
                backLabel="Zurück zur App"
            >
                <OrgModals 
                    workspace={workspace}
                    showAvvModal={showAvvModal}
                    setShowAvvModal={setShowAvvModal}
                    onComplete={fetchData}
                    onCancel={() => router.push('/app')}
                />

                {/* Stats Overview */}
                <OrgStats 
                    membersCount={members.length}
                    workspace={workspace}
                    actionLoading={actionLoading}
                    onUpdateCode={handleUpdateCode}
                />

                {/* Main Content Area */}
                <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="members" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-secondary/50 border border-border p-1.5 rounded-2xl">
                            <TabsTrigger value="members" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Mitglieder</TabsTrigger>
                            <TabsTrigger value="info" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">Informationen</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="members">
                        <OrgMemberTable 
                            members={members}
                            currentUserId={currentUserId}
                            actionLoading={actionLoading}
                            onToggleRole={handleToggleRole}
                            onRemoveMember={handleRemoveMember}
                        />
                    </TabsContent>

                    <TabsContent value="info">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Info Card 1: Verwaltung */}
                            <Card className="bg-card rounded-3xl p-8 border-none shadow-sm">
                                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                    <Info size={20} className="text-primary" />
                                    Hinweise zur Verwaltung
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0 font-bold">1</div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm mb-1">Budget-Hoheit</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">Alle Lehrer Ihrer Schule verbrauchen das zentrale Guthaben des Instituts. Aktuell sind noch <strong>{workspace?.credits} Credits</strong> verfügbar.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0 font-bold">2</div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm mb-1">Onboarding</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">Neue Lehrkräfte können sich über den Code <strong>{workspace?.inviteCode}</strong> in ihren Einstellungen selbst hinzufügen.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 font-bold">3</div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm mb-1">Sicherheit beim Löschen</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">Wenn Sie ein Mitglied entfernen, verliert dieses sofort alle Rechte am Schul-Expert-Default.</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* Info Card 2: Beitritts-Regeln */}
                            <Card className="bg-card rounded-3xl p-8 border-none shadow-sm">
                                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                    <KeyRound size={20} className="text-primary" />
                                    Beitritts-Regeln
                                </h3>
                                <div className="bg-secondary/30 p-6 rounded-2xl border border-border flex flex-col items-center">
                                    <div className="p-4 bg-card shadow-sm rounded-2xl mb-4 border border-border">
                                        <KeyRound size={32} className="text-primary" />
                                    </div>
                                    <h4 className="text-2xl font-mono font-bold text-foreground tracking-wider mb-2">{workspace?.inviteCode}</h4>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Aktiver Schul-Schlüssel</p>
                                    <Button 
                                        variant="outline" 
                                        className="w-full rounded-xl font-bold bg-card border-border hover:bg-secondary"
                                        onClick={handleUpdateCode}
                                        disabled={actionLoading === 'update-code'}
                                    >
                                        Code neu generieren
                                    </Button>
                                </div>
                                <div className="mt-8 p-4 bg-primary/10 rounded-2xl border border-primary/20 flex gap-4">
                                    <AlertTriangle className="text-primary shrink-0" size={18} />
                                    <p className="text-xs text-primary font-medium leading-relaxed">
                                        <strong>Hinweis:</strong> Sobald Sie den Code regenerieren, ist der alte Schlüssel sofort ungültig. Bereits beigetretene Mitglieder bleiben jedoch erhalten.
                                    </p>
                                </div>
                            </Card>
                            {/* Info Card 3: Rechtliches & AVV */}
                            <Card className="bg-card rounded-3xl p-8 border-none shadow-sm md:col-span-2">
                                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                                    <Shield size={20} className="text-blue-600" />
                                    Rechtssicherheit & AVV
                                </h3>
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-blue-50/50 border border-blue-100">
                                    <div className="items-start gap-4 flex">
                                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                                            <Shield size={24} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">Auftragsverarbeitungsvertrag (AVV)</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed max-w-[450px]">
                                                Ihr Institut hat dem AVV (Art. 28 DSGVO) am {workspace?.createdAt ? new Date(workspace.createdAt).toLocaleDateString() : '—'} digital zugestimmt. 
                                                Dieses Dokument ist die Rechtsgrundlage für die Nutzung von Koreki in Ihrer Schule.
                                            </p>
                                            
                                            {workspace?.avvAccepted && (
                                                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                                    <CheckCircle size={14} /> Audit-Log Status: Verifiziert
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button 
                                        className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-2xl font-black gap-2 shadow-lg shadow-blue-500/20"
                                        onClick={() => router.push('/app/compliance/avv')}
                                    >
                                        Anzeigen & Drucken <Eye size={20} />
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </AdminLayout>
        </AuthGuard>
    );
}
