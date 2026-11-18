import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, LogOut, Sparkles, FileUp, Camera, PlusCircle } from 'lucide-react';
import Logo from '../Logo';
import { AppSeitenleiste } from './AppSeitenleiste';
import { profilEintraege } from './profil-eintraege';
import { Button } from '../ui/Button';
import { HeaderBadges } from './HeaderBadges';
import { NeueVersionHinweis } from './NeueVersionHinweis';
import { HilfeMenu } from './HilfeMenu';
import { DemoMenu } from './DemoMenu';
import type { DemoArt } from '@/lib/demo/demoHandschrift';
import { useGlobalStatus } from '../../hooks/useGlobalStatus';
import { isLocalInstance, isKeycloakAuth, getAuthType } from '../../lib/env-context';
import { User } from '../../types';
import { cn } from '@/lib/utils';
import { useSeitenleisteStore } from '@/hooks/store/useSeitenleisteStore';
import { useWechsleAnsicht } from '@/hooks/useFokusArbeit';

interface HeaderProps {
    userData: User | null;
    upgrading: boolean;
    onUpgrade: () => void;
    onShowSettings: () => void;
    onShowPrompts?: () => void;
    onShowSkills?: () => void;
    onShowAiParams?: () => void;
    onShowGradingMemory?: () => void;
    onLogout: () => void;
    onLoadDemo: (art: DemoArt) => void;
    onShowHelp: () => void;
    onUnlockExpert?: () => void;
    onImportSession?: (file: File) => void;
    onRelinkFiles?: (files: File[]) => void;
    isImportedSession?: boolean;
    hasMissingFiles?: boolean;
    activeProfileName?: string;
    activeSkillsProfileName?: string;
    activeAiProfileName?: string;
    activeGradingMemoryName?: string;
    hasActiveWork?: boolean;
}

/** Tooltip fuer die Knoepfe der Konto-Zeile — per Portal, damit die Seitenleiste ihn nicht abschneidet. */
export const HeaderPortalTooltip: React.FC<{
    children: React.ReactNode;
    title: string;
    description?: string;
}> = ({ children, title, description }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, oben: false });
    const triggerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Unten in der Seitenleiste ist unter dem Ausloeser kein Platz: dann darueber.
            const oben = rect.bottom + 80 > window.innerHeight;
            setCoords({ top: oben ? rect.top - 8 : rect.bottom + 8, left: Math.max(rect.left + rect.width / 2, 120), oben });
        }
        setIsHovered(true);
    };

    return (
        <div 
            ref={triggerRef}
            className="relative shrink-0 flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
            {mounted && isHovered && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed z-[9999] bg-white/95 backdrop-blur-md border border-border/50 px-3.5 py-2.5 rounded-xl shadow-2xl animate-overlay-in pointer-events-none whitespace-nowrap"
                    style={{ top: coords.top, left: coords.left, transform: coords.oben ? 'translate(-50%, -100%)' : 'translateX(-50%)' }}
                >
                    <p className="text-primary font-bold text-xs">{title}</p>
                    {description && <p className="text-muted-foreground text-xs mt-0.5">{description}</p>}
                </div>,
                document.body
            )}
        </div>
    );
};

/**
 * Industrial App Header (Stage 9 - Optimized Single Row)
 * 🏮🛡️🏛️
 * Encapsulates the entire navigation, tenancy, active profiles, and actions on a single, clean desktop row.
 */
const Header: React.FC<HeaderProps> = ({
    userData,
    upgrading,
    onUpgrade,
    onShowSettings,
    onShowPrompts,
    onShowSkills,
    onShowAiParams,
    onShowGradingMemory,
    onLogout,
    onLoadDemo,
    onShowHelp,
    onUnlockExpert,
    onImportSession,
    onRelinkFiles,
    isImportedSession,
    hasMissingFiles,
    activeProfileName,
    activeSkillsProfileName,
    activeAiProfileName,
    activeGradingMemoryName,
    hasActiveWork
}) => {
    const { refs, logic, actions } = useGlobalStatus(userData, onImportSession, onRelinkFiles);
    const leisteOffen = useSeitenleisteStore(s => s.offen); // Offen traegt sie die drei Knoepfe — dann nicht doppelt.
    const wechsle = useWechsleAnsicht(); // "Neue Korrektur" oeffnet die Einrichtung, wie in der Seitenleiste — verwirft nichts.
    const profile = profilEintraege({
        expertise: activeProfileName, skills: activeSkillsProfileName, erfahrungsschatz: activeGradingMemoryName, intelligenz: activeAiProfileName,
        onExpertise: onShowPrompts, onSkills: onShowSkills, onErfahrungsschatz: onShowGradingMemory, onIntelligenz: onShowAiParams
    });

    const renderQuickActions = () => (
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 ml-auto">
            <NeueVersionHinweis onOeffnen={onShowSettings} istAdmin={userData?.role === 'ADMIN'} />
            <HilfeMenu onKurzanleitung={onShowHelp} inSeitenleiste />
            {(userData?.role === 'ADMIN' || getAuthType() === 'LOGTO' || (isLocalInstance() && !isKeycloakAuth())) && (
                <HeaderPortalTooltip title={userData?.role === 'ADMIN' ? 'System-Einstellungen' : 'Konto & Einstellungen'}>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={onShowSettings} 
                        className="border-0 bg-transparent text-muted-foreground hover:bg-card hover:text-foreground rounded-lg h-7 w-7 sm:h-8 sm:w-8 transition-colors shrink-0"
                    >
                        <Settings size={16} />
                    </Button>
                </HeaderPortalTooltip>
            )}
            
            {(!isLocalInstance() || isKeycloakAuth()) && (
                <>
                    <div className="w-px h-5 bg-border mx-0.5 shrink-0" />
                    <HeaderPortalTooltip title="Abmelden">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={onLogout} 
                            className="border-0 bg-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg h-7 w-7 sm:h-8 sm:w-8 transition-colors shrink-0"
                        >
                            <LogOut size={16} />
                        </Button>
                    </HeaderPortalTooltip>
                </>
            )}
        </div>
    );

    return (
        <header className="mb-4 md:mb-5 flex flex-col gap-4 w-full">
            <AppSeitenleiste eintraege={profile} onDemo={onLoadDemo} onImportieren={actions.triggerImport}
                fuss={<><HeaderBadges userData={userData} upgrading={upgrading} onUpgrade={onUpgrade} onUnlockExpert={onUnlockExpert} />{renderQuickActions()}</>} />
            {/*
              * Die Buehne steht nur noch auf dem leeren Start (18.11.2026). Sobald Arbeit
              * vorliegt, tragen Seitenleiste bzw. Schublade ihre Knoepfe — auch auf dem
              * Handy, wo sie vorher auf jeder Ansicht ein zweites Mal standen.
              */}
            {!hasActiveWork && <div className="flex flex-col items-center text-center mt-2 md:mt-1">
                <Logo showText={true} textLarge={true} size={40} subtitle="Dein KI-Korrektur Assistent" />
                <div className={cn("flex flex-row gap-2 sm:gap-2.5 w-full max-w-[480px] mt-3 md:mt-4 mx-auto", leisteOffen && "md:hidden")}>
                    <DemoMenu onDemo={onLoadDemo} className="flex-1" align="center"
                        triggerClassName="w-full h-10 rounded-full border border-border bg-card px-2 sm:px-4 text-xs sm:text-sm text-foreground hover:bg-card hover:border-foreground/30"
                        trigger={<><Sparkles size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Demo</>} />

                    <Button
                        variant="default"
                        size="lg"
                        onClick={() => wechsle('einrichtung')}
                        className="flex-1 rounded-full px-2 sm:px-4 h-10 text-xs sm:text-sm whitespace-nowrap"
                    >
                        <PlusCircle size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Neue Korrektur
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        onClick={actions.triggerImport}
                        className="flex-1 rounded-full px-2 sm:px-4 h-10 text-xs sm:text-sm text-foreground"
                    >
                        <FileUp size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Importieren
                    </Button>
                </div>
            </div>}

            {/* Contextual Warning: Missing Files */}
            {isImportedSession && hasMissingFiles && (
                <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/10 rounded-xl max-w-[800px] mx-auto w-full">
                    <div className="flex items-center gap-2">
                        <Camera size={16} className="text-primary shrink-0" />
                        <span className="text-xs font-medium text-primary text-left">
                            Vorschau vervollständigen: Lade die Original-PDFs nach, um Dokumente im Split-Screen zu sehen.
                        </span>
                    </div>
                    <div className="shrink-0 ml-auto sm:ml-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={actions.triggerRelink}
                        >
                            Dateien verknüpfen
                        </Button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
