import React from 'react';
import { Crown, Building2, Shield, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { isLocalInstance } from '@/lib/env-context';
import { useRouter } from 'next/router';

interface HeaderBadgesProps {
    userData: any;
    upgrading: boolean;
    onUpgrade: () => void;
    onUnlockExpert?: () => void;
}

/**
 * Industrial Header Badges (Stage 9 - Clean Version)
 * 🏮🛡️🏛️
 * Encapsulates the visual rendering of credits, roles, and institutional status.
 * All configuration buttons are unified and handled inside AppHeader.tsx.
 */
export const HeaderBadges: React.FC<HeaderBadgesProps> = ({
    userData,
    upgrading,
    onUpgrade,
    onUnlockExpert
}) => {
    const router = useRouter();

    return (
        <div className="flex gap-2 sm:gap-3 items-center bg-white/70 backdrop-blur-xl p-2 rounded-[1.25rem] border border-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/[0.03]">
            {/* Branding Badge (Institutional Tenancy) - ONLY rendered locally, hidden in SaaS for space */}
            {isLocalInstance() && userData?.activeWorkspaceType === 'ORGANIZATION' && (
                <div className="flex items-center gap-2.5 px-3.5 py-2 bg-indigo-600/[0.08] text-indigo-700 rounded-xl border border-indigo-100/80 group transition-all hover:bg-indigo-600/10">
                   <Building2 size={16} className="text-indigo-600 opacity-80 group-hover:scale-110 transition-transform" />
                   <div className="flex flex-col">
                       <span className="text-[7px] font-black uppercase tracking-[0.15em] text-indigo-400/80 leading-none mb-0.5">INSTITUT</span>
                       <span className="text-[11px] font-black uppercase tracking-wider truncate max-w-[150px] leading-none">
                           {userData?.activeWorkspaceName || 'Organisation'}
                       </span>
                   </div>
                </div>
            )}
            
            {/* Credits Counter or Local Instance Badge */}
            {isLocalInstance() ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 text-indigo-700 rounded-xl border border-indigo-100/50 shadow-sm animate-in fade-in duration-500">
                    <ShieldCheck size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                        Community Edition
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 bg-blue-50/80 rounded-xl border border-blue-100/50 text-blue-700 shadow-inner shrink-0 whitespace-nowrap">
                     <Crown size={14} className="text-blue-500 sm:w-[16px] sm:h-[16px]" />
                     <span className="font-bold text-xs sm:text-sm">{userData?.credits || 0}</span> 
                     <span className="hidden sm:inline text-[10px] sm:text-xs font-semibold opacity-80 uppercase tracking-wide">Credits</span>
                </div>
            )}

            {/* Upgrade Button */}
            {userData?.canBuyCredits && (
                <Button
                    variant="default"
                    size="sm"
                    onClick={onUpgrade}
                    disabled={upgrading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 border-0 rounded-xl px-3 sm:px-4 h-8 sm:h-9 transition-all hover:-translate-y-0.5 shrink-0 whitespace-nowrap flex items-center justify-center"
                >
                    {upgrading ? (
                        <Loader2 size={16} className="animate-spin shrink-0" />
                    ) : (
                        <span className="font-bold tracking-wide text-[10px] sm:text-xs whitespace-nowrap flex items-center justify-center">
                            <span className="sm:hidden">+</span>
                            <span className="hidden sm:inline">+ Aufladen</span>
                        </span>
                    )}
                </Button>
            )}

            {/* Expert Unlock Button */}
            {!isLocalInstance() && !userData?.canEditPrompts && userData?.role === 'USER' && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onUnlockExpert}
                    disabled={upgrading}
                    className="relative group bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-100 rounded-xl px-4 h-9 font-bold text-xs transition-all animate-pulse hover:animate-none"
                    title="Experten-Modus für 25 Credits freischalten"
                >
                    <Sparkles size={14} className="mr-2 text-indigo-500 group-hover:text-white" />
                    Experte werden

                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-[10px] p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-[100] transition-opacity">
                        <p className="font-bold mb-1 text-indigo-400">💎 EXPERTEN-MODUS (25 CR)</p>
                        <ul className="space-y-0.5 text-slate-300">
                            <li>• Alle Fachprofile nutzen</li>
                            <li>• Eigene Prompts erstellen</li>
                            <li>• Volle Inhaltskontrolle</li>
                        </ul>
                    </div>
                </Button>
            )}

            {/* Quick Admin Toggles */}
            {((userData?.role === 'ADMIN' && !isLocalInstance()) || 
              (userData?.role !== 'ADMIN' && userData?.activeWorkspaceType === 'ORGANIZATION' && 
               (userData?.activeMembershipRole === 'ADMIN' || userData?.activeMembershipRole === 'OWNER'))) && (
                <div className="flex items-center gap-1 border-l border-slate-200 ml-1 pl-2">
                    {userData?.role === 'ADMIN' && !isLocalInstance() && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push('/admin')}
                            className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl shadow-sm h-8 w-8 transition-all shrink-0"
                            title="System-Administration (GLOBAL)"
                        >
                            <Shield size={16} />
                        </Button>
                    )}

                    {userData?.role !== 'ADMIN' && (userData?.activeWorkspaceType === 'ORGANIZATION' && 
                      (userData?.activeMembershipRole === 'ADMIN' || userData?.activeMembershipRole === 'OWNER')) && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/org-admin?workspaceId=${userData?.activeWorkspaceId}`)}
                            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm h-8 w-8 transition-all shrink-0"
                            title="Schul-Verwaltung (INSTITUT)"
                        >
                            <Building2 size={16} />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
