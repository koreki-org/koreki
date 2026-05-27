import React from 'react';
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
    title: string;
    isActive?: boolean;
}

/**
 * Labeled Configuration Pill Button
 * 💎 Shows both the category label and the active dynamic value with strict text truncation.
 * In mobile view, collapses to a square icon button with a pulse indicator for active states.
 */
const ProfileConfigButton: React.FC<ProfileConfigButtonProps> = ({ 
    icon, 
    label, 
    value, 
    onClick, 
    title,
    isActive = false 
}) => {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            className={cn(
                "relative rounded-xl px-0 md:px-3.5 py-1.5 h-9 text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all w-9 h-9 md:w-auto overflow-visible shrink-0",
                isActive 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-indigo-100" 
                    : "bg-indigo-50/50 hover:bg-indigo-100/50 text-indigo-600 border-indigo-100 hover:border-indigo-200"
            )}
            title={title}
        >
            <span className={cn("shrink-0 transition-colors", isActive ? "text-white" : "text-indigo-500")}>
                {icon}
            </span>
            <span className={cn("hidden md:inline font-semibold transition-colors", isActive ? "text-indigo-200" : "text-indigo-400")}>
                {label}:
            </span>
            <span className={cn("hidden md:inline truncate max-w-[125px] sm:max-w-[160px] transition-colors", isActive ? "text-white" : "text-indigo-600")}>
                {value}
            </span>
            
        </Button>
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
            <Button 
                variant="outline" 
                size="icon" 
                onClick={onShowHelp} 
                title="Hilfe & Infos" 
                className="border-0 bg-transparent text-slate-500 hover:bg-white hover:text-slate-900 rounded-lg h-7 w-7 sm:h-8 sm:w-8 transition-colors shrink-0"
            >
                <HelpCircle size={16} />
            </Button>
            
            {(userData?.role === 'ADMIN' || isLocalInstance()) && (
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onShowSettings} 
                    title="System-Einstellungen" 
                    className="border-0 bg-transparent text-slate-500 hover:bg-white hover:text-slate-900 rounded-lg h-7 w-7 sm:h-8 sm:w-8 transition-colors shrink-0"
                >
                    <Settings size={16} />
                </Button>
            )}
            
            {(!isLocalInstance() || isKeycloakAuth()) && (
                <>
                    <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={onLogout} 
                        title="Abmelden" 
                        className="border-0 bg-transparent text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg h-7 w-7 sm:h-8 sm:w-8 transition-colors shrink-0"
                    >
                        <LogOut size={16} />
                    </Button>
                </>
            )}
        </div>
    );

    return (
        <header className="mb-4 md:mb-5 flex flex-col gap-4 w-full animate-in fade-in duration-500">
            {/* Strictly Single-Row Navigation Bar */}
            <div className="w-full bg-white/70 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl sm:rounded-[1.25rem] border border-white shadow-xl shadow-slate-200/30 ring-1 ring-slate-900/[0.02] flex flex-row items-center justify-between gap-3 transition-all duration-300">
                
                {/* Left Side: Badges & Profile Config Buttons */}
                <div className="flex flex-row items-center gap-2 sm:gap-3 w-auto">
                    <HeaderBadges
                        userData={userData}
                        upgrading={upgrading}
                        onUpgrade={onUpgrade}
                        onUnlockExpert={onUnlockExpert}
                    />

                    <div className="h-4 w-px bg-slate-200 hidden lg:block shrink-0" />

                    {/* Classic Labeled Configuration Pill Row - strictly horizontal on desktop */}
                    {(isLocalInstance() || userData?.canEditPrompts) && (
                        <div className="flex flex-row flex-wrap items-center justify-start gap-2 w-auto bg-white/70 backdrop-blur-xl p-2 rounded-[1.25rem] border border-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/[0.03] md:bg-transparent md:backdrop-blur-none md:p-0 md:rounded-none md:border-0 md:shadow-none md:ring-0">
                            <ProfileConfigButton 
                                icon={<GraduationCap size={14} />} 
                                label="Expertise"
                                value={activeProfileName || 'Standard'} 
                                onClick={onShowPrompts!} 
                                title="Expert Center: Fachprofile & Prompts verwalten" 
                                isActive={!!activeProfileName && activeProfileName !== 'Standard'}
                            />
                            
                            <ProfileConfigButton 
                                icon={<Wrench size={14} />} 
                                label="Skills"
                                value={activeSkillsProfileName || 'MINT Standard'} 
                                onClick={onShowSkills!} 
                                title="Skills Center: Modulare AI-Kompetenzen konfigurieren" 
                                isActive={!!activeSkillsProfileName && activeSkillsProfileName !== 'MINT Standard'}
                            />
                            
                            <ProfileConfigButton 
                                icon={<BookOpen size={14} />} 
                                label="Erfahrung"
                                value={activeGradingMemoryName || 'Standard-Korrektur'} 
                                onClick={onShowGradingMemory!} 
                                title="GradingMemory™: Korrektur-Erfahrung kalibrieren" 
                                isActive={!!activeGradingMemoryName && activeGradingMemoryName !== 'Standard-Korrektur'}
                            />
                            
                            <ProfileConfigButton 
                                icon={<Brain size={14} />} 
                                label="Intelligenz"
                                value={activeAiProfileName || 'Standard'} 
                                onClick={onShowAiParams!} 
                                title="Intelligenz: AI-Leistungskraft steuern" 
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
                        className="flex-1 rounded-full px-2 sm:px-4 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all shadow-sm h-10 font-bold text-[10px] sm:text-xs"
                    >
                        <Sparkles size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Demo
                    </Button>

                    <Button
                        variant="default"
                        size="lg"
                        onClick={onReset}
                        className="flex-1 rounded-full px-2 sm:px-4 bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5 transition-all h-10 font-bold text-[10px] sm:text-xs whitespace-nowrap"
                    >
                        <PlusCircle size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Neue Korrektur
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        onClick={actions.triggerImport}
                        className="flex-1 rounded-full px-2 sm:px-4 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all shadow-sm h-10 font-bold text-[10px] sm:text-xs"
                    >
                        <FileUp size={14} className="mr-1 sm:mr-1.5 inline shrink-0" /> Importieren
                    </Button>
                </div>
            </div>

            {/* Contextual Warning: Missing Files */}
            {isImportedSession && hasMissingFiles && (
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl animate-in fade-in slide-in-from-top-2 shadow-sm max-w-[800px] mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                            <Camera size={18} className="text-indigo-600" />
                        </div>
                        <span className="text-[10px] sm:text-sm font-semibold text-indigo-700 text-left">
                            Vorschau vervollständigen: Lade die Original-PDFs nach, um Dokumente im Split-Screen zu sehen.
                        </span>
                    </div>
                    <div className="shrink-0 ml-auto sm:ml-0">
                        <Button
                            variant="default"
                            className="px-4 py-1.5 h-auto text-xs font-black uppercase tracking-wider rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
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
