import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AppSettings, WaehlbarerAppModus } from '../types';
import { Button } from './ui/Button';
import { isLocalInstance, isKeycloakAuth } from '@/lib/env-context';
import packageJson from '../../package.json';

// Sub-Components
import { PrivacySection, AIProviderSection, AccountSection, DangerZoneSection } from './settings/SettingsSections';

// Hooks
import { useSystemSettings } from '../hooks/useSystemSettings';
import { useDialogA11y, useEscapeKey } from '@/hooks/useDialogA11y';

// Rueckfrage vor der Loeschung
import ConfirmationModal from './ConfirmationModal';

const TITLE_ID = 'settings-modal-title';

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
        deleteConfirmOpen,
        requestDeleteAccount,
        cancelDeleteAccount,
        inviteCode,
        setInviteCode,
        joinLoading,
        handleDeleteAccount,
        handleJoinOrganization,
        updateSettings
    } = useSystemSettings(onSave);

    // Solange die Loesch-Rueckfrage oben liegt, ruhen Fokusfalle und Escape
    // dieses Dialogs: sonst kaempfen zwei Fallen um denselben Tabulator und ein
    // einziger Tastendruck schliesst beide Ebenen auf einmal.
    const { mounted, dialogRef } = useDialogA11y<HTMLDivElement>(!deleteConfirmOpen);
    useEscapeKey(!deleteConfirmOpen, onClose);

    const isDesktop = isLocalInstance();
    const isUserAdmin = isAdminView || (isLocalInstance() && !isKeycloakAuth()) || userRole === 'ADMIN';

    if (!mounted) return null;

    return createPortal(
        <>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-fade-in">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={TITLE_ID}
                tabIndex={-1}
                className="relative w-full max-w-[550px] bg-white rounded-hero shadow-glass border border-border max-h-[85vh] flex flex-col overflow-hidden text-foreground focus:outline-none"
            >
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
                    <h2 id={TITLE_ID} className="text-2xl font-bold tracking-tight text-foreground">{isUserAdmin ? 'Einstellungen' : 'Konto'}</h2>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-4">

                {/* Systemeinstellungen bleiben Admins vorbehalten. Fuer alle anderen enthaelt
                    der Dialog ausschliesslich die Konto-Loeschung: sie muss ohne Admin
                    erreichbar sein (DSGVO Art. 17, Recht auf Loeschung), und genau dafuer
                    ist das Zahnrad im AppHeader fuer jeden Nutzer sichtbar. Diese Auswahl
                    ist Darstellung, keine Absicherung — die Rolle prueft der Server
                    unabhaengig davon selbst (siehe /api/admin/settings). */}
                {!isAdminView && isUserAdmin && (
                    <PrivacySection 
                        appMode={appMode}
                        avvAccepted={avvAccepted}
                        onModeChange={onModeChange || (() => {})}
                        settings={settings}
                        onSave={(upd) => updateSettings(upd, settings)}
                    />
                )}

                {isUserAdmin && (
                    <AIProviderSection 
                        settings={settings}
                        onSave={(upd) => updateSettings(upd, settings, isUserAdmin)}
                        isAdmin={isUserAdmin}
                    />
                )}

                {!isAdminView && !isDesktop && (
                    <>
                        {isUserAdmin && (
                            <AccountSection 
                                username={username || 'Benutzer'}
                                role={userRole || 'USER'}
                                inviteCode={inviteCode}
                                setInviteCode={setInviteCode}
                                onJoin={handleJoinOrganization}
                                joinLoading={joinLoading}
                            />
                        )}
                        <DangerZoneSection 
                            onDelete={requestDeleteAccount}
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

        <ConfirmationModal
            isOpen={deleteConfirmOpen}
            title="Konto unwiderruflich löschen"
            message={
                <>
                    Möchten Sie Ihr Konto wirklich unwiderruflich löschen? Alle Daten sowie
                    verbleibende Credits verfallen sofort und können weder erstattet noch
                    wiederhergestellt werden.
                </>
            }
            onConfirm={handleDeleteAccount}
            onCancel={cancelDeleteAccount}
        />
        </>,
        document.body
    );
};

export default SettingsModal;
