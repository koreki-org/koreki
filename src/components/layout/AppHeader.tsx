import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, LogOut, Loader2, HelpCircle, Sparkles, FileText, FileUp, Camera, PlusCircle, SlidersHorizontal, BookOpen, Brain, GraduationCap, Wrench } from 'lucide-react';
import Logo from '../Logo';
import { Button } from '../ui/Button';
import { HeaderBadges } from './HeaderBadges';
import { useGlobalStatus } from '../../hooks/useGlobalStatus';
import { isLocalInstance, isKeycloakAuth } from '../../lib/env-context';
import { User } from '../../types';
import { cn } from '@/lib/utils';

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
    onLoadDemo: () => void;
    onShowHelp: () => void;
    onUnlockExpert?: () => void;
    onReset?: () => void;
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

interface ProfileConfigButtonProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    onClick: () => void;
    description?: string;
    isActive?: boolean;
}

/**
 * Labeled Configuration Pill Button
 * 💎 Shows both the category label and the active dynamic value with strict text truncation.
 * In mobile view, collapses to a square icon button with a pulse indicator for active states.
 */
export const HeaderPortalTooltip: React.FC<{
    children: React.ReactNode;
    title: string;
    description?: string;
}> = ({ children, title, description }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
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
                    className="fixed z-[9999] bg-white/95 backdrop-blur-md border border-border/50 px-3.5 py-2.5 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none whitespace-nowrap"
                    style={{ top: coords.top, left: coords.left, transform: 'translateX(-50%)' }}
                >
                    <p className="text-primary font-bold text-xs">{title}</p>
                    {description && <p className="text-muted-foreground text-xs mt-0.5">{description}</p>}
                </div>,
                document.body
            )}
        </div>
    );
};

const ProfileConfigButton: React.FC<ProfileConfigButtonProps> = ({ 
    icon, 
    label, 
    value, 
    onClick, 
    description,
    isActive = false 
}) => {
    return (
        <HeaderPortalTooltip title={`${label}: ${value}`} description={description}>
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    "relative rounded-full px-3 py-1.5 h-8 text-xs flex items-center justify-start gap-1.5 transition-all duration-200 shrink-0 border outline-none select-none cursor-pointer w-8 h-8 md:w-[145px] lg:w-[165px] xl:w-[185px]",
                    isActive 
                        ? "bg-primary/10 border-primary/30 text-primary shadow-xs hover:bg-primary/15" 
                        : "bg-background/40 hover:bg-muted/60 text-muted-foreground border-border/50 hover:border-border hover:text-foreground shadow-xs"
                )}
            >
                <span className={cn("shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground/70")}>
                    {icon}
                </span>
                <span className="hidden md:inline font-normal text-muted-foreground shrink-0">
                    {label}:
                </span>
                <span className={cn("hidden md:inline truncate flex-1 min-w-0 transition-colors font-semibold text-left", isActive ? "text-primary" : "text-foreground")}>
                    {value}
                </span>
            </button>
        </HeaderPortalTooltip>
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
    onReset,
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
    // --- STAGE 9: INDUSTRIAL GLOBAL STATUS ---
    const { refs, logic, actions } = useGlobalStatus(userData, onImportSession, onRelinkFiles);

    const renderQuickActions = (isMobile: boolean) => (
        <div className={`${isMobile ? 'flex lg:hidden' : 'hidden lg:flex'} items-center justify-end gap-1.5 sm:gap-2 shrink-0 ml-auto lg:ml-0`}>
            <HeaderPortalTooltip title="Hilfe & Infos">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onShowHelp} 
                    className="border-0 bg-transparent text-muted-foreground hover:bg-background hover:text-foreground rounded-lg h-7 w-7 sm:h-8 sm:w-8 transition-colors shrink-0"
                >
                    <HelpCircle size={16} />
                </Button>
            </HeaderPortalTooltip>
            
            {(userData?.role === 'ADMIN' || (isLocalInstance() && !isKeycloakAuth())) && (
                <HeaderPortalTooltip title="System-Einstellungen">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={onShowSettings} 
                        className="border-0 bg-transparent text-muted-foreground hover:bg-background hover:text-foreground rounded-lg h-7 w-7 sm:h-8 sm:w-8 transition-colors shrink-0"
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
        <header className="mb-4 md:mb-5 flex flex-col gap-4 w-full animate-in fade-in duration-500">
            {/* Strictly Single-Row Navigation Bar */}
            <div className="w-full bg-background/70 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl border border-border shadow-xl shadow-foreground/5 ring-1 ring-border/5 flex flex-row items-center justify-between gap-3 transition-all duration-300">
                
                {/* Left Side: Badges & Profile Config Buttons */}
                <div 
                    className="flex flex-row items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-x-auto no-scrollbar py-0.5 pr-8"
                    style={{ 
                        maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 30px), transparent 100%)', 
                        WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 30px), transparent 100%)' 
                    }}
                >
                    <HeaderBadges
                        userData={userData}
                        upgrading={upgrading}
                        onUpgrade={onUpgrade}
                        onUnlockExpert={onUnlockExpert}
                    />

                    <div className="h-4 w-px bg-border hidden lg:block shrink-0" />

                    {/* Classic Labeled Configuration Pill Row - strictly horizontal on desktop */}
                    {(isLocalInstance() || userData?.canEditPrompts) && (
                        <div className="flex flex-row flex-nowrap shrink-0 items-center justify-start gap-1.5 sm:gap-2 w-auto bg-background/70 backdrop-blur-xl p-1.5 rounded-2xl border border-border shadow-xl shadow-foreground/5 ring-1 ring-border/5 md:bg-transparent md:backdrop-blur-none md:p-0 md:rounded-none md:border-0 md:shadow-none md:ring-0">
                            <ProfileConfigButton 
                                icon={<GraduationCap size={14} />} 
                                label="Expertise"
                                value={activeProfileName || 'Standard'} 
                                onClick={onShowPrompts!} 
                                description="Expert Center: Fachprofile & Prompts verwalten" 
                                isActive={!!activeProfileName && activeProfileName !== 'Standard'}
                            />
                            
                            <ProfileConfigButton 
                                icon={<Wrench size={14} />} 
                                label="Skills"
                                value={activeSkillsProfileName || 'MINT Standard'} 
                                onClick={onShowSkills!} 
                                description="Skills Center: Modulare AI-Kompetenzen konfigurieren" 
                                isActive={!!activeSkillsProfileName && activeSkillsProfileName !== 'MINT Standard'}
                            />
                            
                            <ProfileConfigButton 
                                icon={<BookOpen size={14} />} 
                                label="Erfahrung"
                                value={activeGradingMemoryName || 'Standard-Korrektur'} 
                                onClick={onShowGradingMemory!} 
                                description="GradingMemory: Korrektur-Erfahrung kalibrieren" 
                                isActive={!!activeGradingMemoryName && activeGradingMemoryName !== 'Standard-Korrektur'}
                            />
                            
                            <ProfileConfigButton 
                                icon={<Brain size={14} />} 
                                label="Intelligenz"
                                value={activeAiProfileName || 'Standard'} 
                                onClick={onShowAiParams!} 
                                description="Intelligenz: AI-Leistungskraft steuern" 
                                isActive={!!activeAiProfileName && activeAiProfileName !== 'Standard'}
                            />
                        </div>
                    )}
                </div>

                {/* Right Side: Quick Action Utilities */}
                <div className="flex items-center shrink-0">
                    {renderQuickActions(true)}
                    {renderQuickActions(false)}
                </div>
            </div>

            {/* The Classic Center Branding & Action Layer */}
            <div className="flex flex-col items-center text-center mt-5 md:mt-1 animate-in fade-in duration-500 ease-out">
                <Logo showText={true} textLarge={true} size={40} subtitle="Dein KI-Korrektur Assistent" />
                
                <div className="flex flex-row gap-2 sm:gap-2.5 mt-3 md:mt-4 w-full max-w-[480px] mx-auto px-4 sm:px-0">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={onLoadDemo}
                        className="flex-1 rounded-full px-2 sm:px-4 bg-background/50 backdrop-blur-sm border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all shadow-sm h-10 font-bold text-xxs sm:text-xs"
                    >
                        <Sparkles size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Demo
                    </Button>

                    <Button
                        variant="default"
                        size="lg"
                        onClick={onReset}
                        className="flex-1 rounded-full px-2 sm:px-4 bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5 transition-all h-10 font-bold text-xxs sm:text-xs whitespace-nowrap"
                    >
                        <PlusCircle size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Neue Korrektur
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        onClick={actions.triggerImport}
                        className="flex-1 rounded-full px-2 sm:px-4 bg-background/50 backdrop-blur-sm border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all shadow-sm h-10 font-bold text-xxs sm:text-xs"
                    >
                        <FileUp size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Importieren
                    </Button>
                </div>
            </div>

            {/* Contextual Warning: Missing Files */}
            {isImportedSession && hasMissingFiles && (
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl animate-in fade-in slide-in-from-top-2 shadow-sm max-w-[800px] mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-xl shadow-sm">
                            <Camera size={18} className="text-primary" />
                        </div>
                        <span className="text-xxs sm:text-sm font-semibold text-primary text-left">
                            Vorschau vervollständigen: Lade die Original-PDFs nach, um Dokumente im Split-Screen zu sehen.
                        </span>
                    </div>
                    <div className="shrink-0 ml-auto sm:ml-0">
                        <Button
                            variant="default"
                            className="px-4 py-1.5 h-auto text-xs font-black uppercase tracking-wider rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
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
