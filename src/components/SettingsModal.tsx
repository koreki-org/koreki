import React from 'react';
import { X } from 'lucide-react';
import { AppSettings, WaehlbarerAppModus } from '../types';
import { Button } from './ui/Button';
import { isLocalInstance, isKeycloakAuth } from '@/lib/env-context';
import packageJson from '../../package.json';

// Sub-Components
import { PrivacySection, AIProviderSection, AccountSection, DangerZoneSection } from './settings/SettingsSections';

// Hooks
import { useSystemSettings } from '../hooks/useSystemSettings';

interface SettingsModalProps {
    settings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
    onClose: () => void;
    userRole?: string;
    isAdminView?: boolean;
    appMode?: 'STANDARD' | 'PURE' | 'TRIAL' | 'UNSET';
    avvAccepted?: boolean;
    onModeChange?: (mode: WaehlbarerAppModus) => void;
    username?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    settings,
    onSave,
    onClose,
    userRole,
    isAdminView = false,
    appMode = 'STANDARD',
    avvAccepted = false,
    onModeChange,
    username
}) => {
    const {
        delLoading,
        inviteCode,
        setInviteCode,
        joinLoading,
        handleDeleteAccount,
        handleJoinOrganization,
        updateSettings
    } = useSystemSettings(onSave);

    const isDesktop = isLocalInstance();
    const isUserAdmin = isAdminView || (isLocalInstance() && !isKeycloakAuth()) || userRole === 'ADMIN';

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-in fade-in duration-300">
            <div className="relative w-full max-w-[550px] bg-white rounded-hero shadow-glass border border-border max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 text-foreground">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute h-auto top-4 right-4 z-10 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all duration-200"
                    onClick={onClose}
                >
                    <X size={20} />
                </Button>

                {/* Header - Fixed */}
                <div className="flex justify-start items-center p-8 pb-4">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Einstellungen</h2>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

                {!isAdminView && (
                    <PrivacySection 
                        appMode={appMode}
                        avvAccepted={avvAccepted}
                        onModeChange={onModeChange || (() => {})}
                        settings={settings}
                        onSave={(upd) => updateSettings(upd, settings)}
                    />
                )}

                <AIProviderSection 
                    settings={settings}
                    onSave={(upd) => updateSettings(upd, settings, isUserAdmin)}
                    isAdmin={isUserAdmin}
                />

                {!isAdminView && !isDesktop && (
                    <>
                        <AccountSection 
                            username={username || 'Benutzer'}
                            role={userRole || 'USER'}
                            inviteCode={inviteCode}
                            setInviteCode={setInviteCode}
                            onJoin={handleJoinOrganization}
                            joinLoading={joinLoading}
                        />
                        <DangerZoneSection 
                            onDelete={handleDeleteAccount}
                            loading={delLoading}
                        />
                    </>
                )}

                </div>

                {/* Footer - Fixed */}
                <div className="flex justify-between items-center p-8 pt-4 border-t border-border/50 bg-white rounded-b-hero">
                    <span className="text-xs text-muted-foreground font-medium font-sans">
                        Koreki<span className="text-primary">.</span> v{packageJson.version}
                    </span>
                    <Button onClick={onClose} className="px-8 font-bold shadow-lg shadow-primary/20 rounded-xl h-12">
                        Schließen
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
