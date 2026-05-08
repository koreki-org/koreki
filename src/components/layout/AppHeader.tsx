import React from 'react';
import { Settings, LogOut, Loader2, HelpCircle, Sparkles, FileText, FileUp, Camera, PlusCircle, SlidersHorizontal } from 'lucide-react';
import Logo from '../Logo';
import { Button } from '../ui/Button';
import { HeaderBadges } from './HeaderBadges';
import { useGlobalStatus } from '../../hooks/useGlobalStatus';
import { isLocalInstance, isKeycloakAuth } from '../../lib/env-context';
import { User } from '../../types';

/**
 * Industrial App Header (Stage 9)
 * 🏮🛡️🏛️
 * Refactored into a thin industrial view.
 * Status badges and business logic are delegated to specialized sub-components and hooks.
 */

interface HeaderProps {
    userData: User | null;
    upgrading: boolean;
    onUpgrade: () => void;
    onShowSettings: () => void;
    onShowPrompts?: () => void;
    onShowAiParams?: () => void;
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
    activeAiProfileName?: string;
}

const Header: React.FC<HeaderProps> = ({
    userData,
    upgrading,
    onUpgrade,
    onShowSettings,
    onShowPrompts,
    onShowAiParams,
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
    activeAiProfileName
}) => {
    // --- STAGE 9: INDUSTRIAL GLOBAL STATUS ---
    const { refs, logic, actions } = useGlobalStatus(userData, onImportSession, onRelinkFiles);

    return (
        <header className="mb-4 md:mb-5 flex flex-col gap-2 md:gap-3">
            <div className="justify-between items-center gap-4 flex-wrap flex">
                
                {/* 1. Status & Badges Layer (Modular) */}
                <HeaderBadges
                    userData={userData}
                    upgrading={upgrading}
                    onUpgrade={onUpgrade}
                    onUnlockExpert={onUnlockExpert}
                    onShowPrompts={onShowPrompts}
                    onShowAiParams={onShowAiParams}
                />

                {/* 2. Utility Navigation (Standard UI Layout) */}
                <div className="flex gap-2 items-center bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm ring-1 ring-slate-900/5">
                    {userData?.canEditPrompts && (
                        <div className="flex items-center gap-2">
                            {activeProfileName && (
                                <div className="flex items-center px-3 py-1 bg-indigo-600 text-white rounded-lg border border-indigo-500 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                                    <Sparkles size={12} className="mr-1.5 opacity-80" />
                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                        Profil: {activeProfileName}
                                    </span>
                                </div>
                            )}
                            {activeAiProfileName && (
                                <div className="flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-right-2 duration-300">
                                    <SlidersHorizontal size={12} className="mr-1.5 opacity-80" />
                                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                                        KI: {activeAiProfileName}
                                    </span>
                                </div>
                            )}
                            <div className="hidden sm:flex items-center px-3 py-1 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest whitespace-nowrap">
                                    {logic.getRoleLabel()}
                                </span>
                            </div>
                        </div>
                    )}
                    {/* Expert Prompt button removed from here, now in HeaderBadges island */}
                    <Button variant="outline" size="icon" onClick={onShowHelp} title="Hilfe & Infos" className="border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors">
                        <HelpCircle size={18} />
                    </Button>
                    {userData?.role === 'ADMIN' && (
                        <Button variant="outline" size="icon" onClick={onShowSettings} title="Einstellungen" className="border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors">
                            <Settings size={18} />
                        </Button>
                    )}
                    {(!isLocalInstance() || isKeycloakAuth()) && (
                        <>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <Button variant="outline" size="icon" onClick={onLogout} title="Abmelden" className="border-0 bg-transparent text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors">
                                <LogOut size={18} />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* 3. Branding & Action Layer */}
            <div className="flex flex-col items-center text-center mt-5 md:mt-1">
                <Logo showText textLarge size={40} subtitle="Dein KI-Korrektur Assistent" />
                
                <div className="flex flex-col gap-2.5 mt-3 md:mt-4 w-full max-w-[400px] mx-auto px-6 sm:px-0">
                    <Button
                        variant="default"
                        size="lg"
                        onClick={onReset}
                        className="w-full rounded-full bg-primary text-primary-foreground hover:shadow-lg hover:-translate-y-0.5 transition-all h-10 font-bold text-sm"
                    >
                        <PlusCircle size={16} className="mr-2" /> Neue Korrektur
                    </Button>

                    <div className="flex flex-row gap-2.5 w-full">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={onLoadDemo}
                            className="flex-1 rounded-full px-4 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all shadow-sm h-10 font-bold text-sm text-[11px] sm:text-xs"
                        >
                            <Sparkles size={14} className="mr-1.5 hidden xs:inline" /> Demo
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            onClick={actions.triggerImport}
                            className="flex-1 rounded-full px-4 bg-white/50 backdrop-blur-sm border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary hover:-translate-y-0.5 transition-all shadow-sm h-10 font-bold text-sm text-[11px] sm:text-xs"
                        >
                            <FileUp size={14} className="mr-1.5 hidden xs:inline" /> Importieren
                        </Button>
                    </div>
                </div>

                {/* Contextual Warning: Missing Files */}
                {isImportedSession && hasMissingFiles && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-3xl animate-in fade-in slide-in-from-top-2 shadow-sm max-w-[800px] mx-auto">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm">
                                <Camera size={18} className="text-indigo-600" />
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-indigo-700 text-left">
                                Vorschau vervollständigen: Lade die Original-PDFs nach, um Dokumente im Split-Screen zu sehen.
                            </span>
                        </div>
                        <div className="shrink-0">
                            <Button
                                variant="default"
                                className="px-5 py-2 h-auto text-xs font-black uppercase tracking-wider rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
                                onClick={actions.triggerRelink}
                            >
                                Dateien verknüpfen
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        </header>
    );
};

export default Header;
