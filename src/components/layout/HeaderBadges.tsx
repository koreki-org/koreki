import { Crown, Building2, Shield, Sparkles, FileText, Loader2, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { isLocalInstance } from '@/lib/env-context';
import { useRouter } from 'next/router';

interface HeaderBadgesProps {
    userData: any;
    upgrading: boolean;
    onUpgrade: () => void;
    onUnlockExpert?: () => void;
    onShowPrompts?: () => void;
    onShowAiParams?: () => void;
    onShowGradingMemory?: () => void;
}

/**
 * Industrial Header Badges (Stage 9)
 * 🏮🛡️🏛️
 * Encapsulates the visual rendering of credits, roles, and institutional status.
 */
export const HeaderBadges: React.FC<HeaderBadgesProps> = ({
    userData,
    upgrading,
    onUpgrade,
    onUnlockExpert,
    onShowPrompts,
    onShowAiParams,
    onShowGradingMemory
}) => {
    const router = useRouter();
    // Role Label Logic (Industrial Grade)
    const getRoleLabel = () => {
        if (userData?.role === 'ADMIN') return 'Administrator';
        if (userData?.activeWorkspaceType === 'ORGANIZATION') return 'Lehrkraft';
        return 'Experte';
    };

    return (
        <div className="flex gap-2 sm:gap-3 items-center bg-white/70 backdrop-blur-xl p-2 rounded-[1.25rem] border border-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/[0.03]">
            {/* Branding Badge (Institutional Tenancy) */}
            {userData?.activeWorkspaceType === 'ORGANIZATION' && (
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
                <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 bg-blue-50/80 rounded-xl border border-blue-100/50 text-blue-700 shadow-inner">
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
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 border-0 rounded-xl px-3 sm:px-4 h-8 sm:h-9 transition-all hover:-translate-y-0.5"
                >
                    {upgrading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <span className="font-bold tracking-wide text-[10px] sm:text-xs">
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
            <div className="flex items-center gap-1 border-l border-slate-200 ml-1 pl-2">
                {userData?.role === 'ADMIN' && !isLocalInstance() && (
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push('/admin')}
                        className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl shadow-sm h-8 w-8 transition-all"
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
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl shadow-sm h-8 w-8 transition-all"
                        title="Schul-Verwaltung (INSTITUT)"
                    >
                        <Building2 size={16} />
                    </Button>
                )}

                {/* Expert Prompts Button (Stage 10 Stateless) 💎✨ */}
                {(isLocalInstance() || userData?.canEditPrompts) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowPrompts}
                        className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl shadow-sm h-8 px-2 sm:px-3 transition-all flex items-center gap-1.5 sm:gap-2 group"
                        title="Expert Center: Fachprofile & Prompts verwalten"
                    >
                        <FileText size={14} className="text-indigo-500 group-hover:text-white transition-colors" />
                        <span className="hidden sm:inline font-bold tracking-tight text-xs">Prompts</span>
                    </Button>
                )}

                {/* GradingMemory Button (Stage 10 Stateless) 🎓🎯 */}
                {(isLocalInstance() || userData?.canEditPrompts) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowGradingMemory}
                        className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl shadow-sm h-8 px-2 sm:px-3 transition-all flex items-center gap-1.5 sm:gap-2 group animate-in fade-in duration-300"
                        title="GradingMemory™: Korrektur-Erfahrungsschatz kalibrieren"
                    >
                        <SlidersHorizontal size={14} className="text-indigo-500 group-hover:text-white transition-colors rotate-90" />
                        <span className="hidden sm:inline font-bold tracking-tight text-xs">Erfahrungsschatz</span>
                    </Button>
                )}

                {/* AI Parameters Button (Stage 10 Stateless) ⚙️🎛️ */}
                {(isLocalInstance() || userData?.canEditPrompts) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onShowAiParams}
                        className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl shadow-sm h-8 px-2 sm:px-3 transition-all flex items-center gap-1.5 sm:gap-2 group animate-in fade-in duration-300"
                        title="KI-Parameter konfigurieren (Feintuning)"
                    >
                        <SlidersHorizontal size={14} className="text-indigo-500 group-hover:text-white transition-colors" />
                        <span className="hidden sm:inline font-bold tracking-tight text-xs">KI-Parameter</span>
                    </Button>
                )}
            </div>
            
            {/* Active Profile Info (Mobile specific logic mapping could go here) */}
        </div>
    );
};
