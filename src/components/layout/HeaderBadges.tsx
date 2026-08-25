import React from 'react';
import { Crown, Building2, Shield, Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { isLocalInstance } from '@/lib/env-context';
import { useRouter } from 'next/router';
import { EXPERTEN_MODUS_CREDITS } from '@/lib/services/profile-limits';

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
        <div className="flex gap-2 items-center shrink-0">
            {/* Branding Badge (Institutional Tenancy) - ONLY rendered locally, hidden in SaaS for space */}
            {isLocalInstance() && userData?.activeWorkspaceType === 'ORGANIZATION' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 group transition-all">
                   <Building2 size={14} className="text-primary opacity-80 group-hover:scale-110 transition-transform" />
                   <div className="flex items-center gap-1.5">
                       <span className="text-xxs font-bold uppercase tracking-wider text-primary/70">INSTITUT:</span>
                       <span className="text-xs font-bold uppercase tracking-wide truncate max-w-[120px]">
                           {userData?.activeWorkspaceName || 'Organisation'}
                       </span>
                   </div>
                </div>
            )}
            
            {/* Credits Counter or Local Instance Badge */}
            {isLocalInstance() ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 shadow-2xs shrink-0">
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap hidden sm:inline">
                        Community Edition
                    </span>
                </div>
            ) : (
                <div className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20 text-primary shadow-xs shrink-0 whitespace-nowrap">
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
                    className="bg-gradient-to-r from-primary to-primary/85 hover:from-primary/95 hover:to-primary/75 text-primary-foreground shadow-sm border-0 rounded-full px-3.5 h-8 transition-all hover:-translate-y-0.5 shrink-0 whitespace-nowrap flex items-center justify-center font-bold text-xs"
                >
                    {upgrading ? (
                        <Loader2 size={14} className="animate-spin shrink-0" />
                    ) : (
                        <span className="font-bold tracking-wide text-xs whitespace-nowrap flex items-center justify-center">
                            <span className="sm:hidden">+</span>
                            <span className="hidden sm:inline">+ Aufladen</span>
                        </span>
                    )}
                </Button>
            )}

            {/* Expert Unlock Button */}
            {/* Der Experten-Modus hebt die Mengengrenze auf; die vier Modale selbst
                stehen jedem offen. Siehe lib/services/profile-limits. */}
            {!isLocalInstance() && userData?.role === 'USER' && !userData?.imInstitut && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onUnlockExpert}
                    disabled={upgrading}
                    className="relative group bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 rounded-full px-3.5 h-8 font-bold text-xs transition-all animate-pulse hover:animate-none shrink-0"
                    title={`Experten-Modus für ${EXPERTEN_MODUS_CREDITS} Credits: unbegrenzt eigene Profile`}
                >
                    <Sparkles size={14} className="mr-1.5 text-primary group-hover:text-white" />
                    Experte werden

                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-foreground text-white text-xxs p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none z-[100] transition-opacity">
                        <p className="font-bold mb-1 text-primary">💎 EXPERTEN-MODUS ({EXPERTEN_MODUS_CREDITS} CR)</p>
                        <ul className="space-y-0.5 text-background/80">
                            <li>• Unbegrenzt eigene Expertise-Profile</li>
                            <li>• Unbegrenzt Skill-Sets, Erfahrungsschätze, KI-Profile</li>
                            <li>• Unbegrenzt eigene Skills</li>
                        </ul>
                        <p className="mt-2 text-background/60">Ohne Freischaltung: je ein eigener Eintrag.</p>
                    </div>
                </Button>
            )}

            {/* Quick Admin Toggles */}
            {((userData?.role === 'ADMIN' && !isLocalInstance()) || 
              (userData?.role !== 'ADMIN' && userData?.activeWorkspaceType === 'ORGANIZATION' && 
               (userData?.activeMembershipRole === 'ADMIN' || userData?.activeMembershipRole === 'OWNER'))) && (
                <div className="flex items-center gap-1 shrink-0">
                    {userData?.role === 'ADMIN' && !isLocalInstance() && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push('/admin')}
                            className="bg-warning/10 border-warning/20 text-warning hover:bg-warning hover:text-white rounded-full shadow-xs h-8 w-8 transition-all shrink-0"
                            title="System-Administration (GLOBAL)"
                        >
                            <Shield size={14} />
                        </Button>
                    )}

                    {userData?.role !== 'ADMIN' && (userData?.activeWorkspaceType === 'ORGANIZATION' && 
                      (userData?.activeMembershipRole === 'ADMIN' || userData?.activeMembershipRole === 'OWNER')) && (
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.push(`/org-admin?workspaceId=${userData?.activeWorkspaceId}`)}
                            className="bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white rounded-full shadow-xs h-8 w-8 transition-all shrink-0"
                            title="Schul-Verwaltung (INSTITUT)"
                        >
                            <Building2 size={14} />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
