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
        <div className="flex gap-2 sm:gap-3 items-center bg-background/70 backdrop-blur-xl p-1.5 rounded-2xl border border-white shadow-xl shadow-border/50 ring-1 ring-foreground/5 shrink-0">
            {/* Branding Badge (Institutional Tenancy) - ONLY rendered locally, hidden in SaaS for space */}
            {isLocalInstance() && userData?.activeWorkspaceType === 'ORGANIZATION' && (
                <div className="flex items-center gap-2.5 px-3.5 py-2 bg-primary/10 text-primary rounded-xl border border-primary/20 group transition-all hover:bg-primary/10">
                   <Building2 size={16} className="text-primary opacity-80 group-hover:scale-110 transition-transform" />
                   <div className="flex flex-col">
                       <span className="text-xxs font-black uppercase tracking-[0.15em] text-primary/80 leading-none mb-0.5">INSTITUT</span>
                       <span className="text-xs font-black uppercase tracking-wider truncate max-w-[150px] leading-none">
                           {userData?.activeWorkspaceName || 'Organisation'}
                       </span>
                   </div>
                </div>
            )}
            
            {/* Credits Counter or Local Instance Badge */}
            {isLocalInstance() ? (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-primary/5 text-primary rounded-xl border border-primary/10 shadow-sm animate-in fade-in duration-500 w-9 h-9 sm:w-auto sm:h-auto justify-center shrink-0">
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                    <span className="text-xxs font-black uppercase tracking-widest whitespace-nowrap hidden sm:inline">
                        Community Edition
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/10 text-primary shadow-inner shrink-0 whitespace-nowrap">
                     <Crown size={14} className="text-primary sm:w-[16px] sm:h-[16px]" />
                     <span className="font-bold text-xs sm:text-sm">{userData?.credits || 0}</span> 
                     <span className="hidden sm:inline text-xxs sm:text-xs font-semibold opacity-80 uppercase tracking-wide">Credits</span>
                </div>
            )}

            {/* Upgrade Button */}
            {userData?.canBuyCredits && (
                <Button
                    variant="default"
                    size="sm"
                    onClick={onUpgrade}
                    disabled={upgrading}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-md shadow-primary/20 border-0 rounded-xl px-3 sm:px-4 h-8 sm:h-9 transition-all hover:-translate-y-0.5 shrink-0 whitespace-nowrap flex items-center justify-center"
                >
                    {upgrading ? (
                        <Loader2 size={16} className="animate-spin shrink-0" />
                    ) : (
                        <span className="font-bold tracking-wide text-xxs sm:text-xs whitespace-nowrap flex items-center justify-center">
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
                    className="relative group bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 rounded-xl px-4 h-9 font-bold text-xs transition-all animate-pulse hover:animate-none"
                    title="Experten-Modus für 25 Credits freischalten"
                >
                    <Sparkles size={14} className="mr-2 text-primary group-hover:text-white" />
                    Experte werden

                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-foreground text-white text-xxs p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-[100] transition-opacity">
                        <p className="font-bold mb-1 text-primary">💎 EXPERTEN-MODUS (25 CR)</p>
                        <ul className="space-y-0.5 text-background/80">
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
                <div className="flex items-center gap-1 border-l border-border ml-1 pl-2">
                    {userData?.role === 'ADMIN' && !isLocalInstance() && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push('/admin')}
                            className="bg-warning/10 border-warning/20 text-warning hover:bg-warning hover:text-white rounded-xl shadow-sm h-8 w-8 transition-all shrink-0"
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
                            className="bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white rounded-xl shadow-sm h-8 w-8 transition-all shrink-0"
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
