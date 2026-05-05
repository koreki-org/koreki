import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import Logo from '@/components/Logo';
import { isKeycloakAuth } from '@/lib/env-context';
import { signinOidc } from '@/lib/auth-keycloak';

interface AuthGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

/**
 * Industrial AuthGuard
 * 🏮🛡️🏛️
 * Centralizes authentication gating and loading aesthetics.
 * Prevents "Loading Hangs" by enforcing redirects for unauthenticated sessions.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
    const router = useRouter();
    const { userData, authLoading, isFetched } = useAuth();

    useEffect(() => {
        // Redirect if definitively unauthenticated
        if (isFetched && !authLoading && !userData) {
            if (isKeycloakAuth()) {
                // 🛑 CRITICAL: Do not redirect if we are currently in the callback flow!
                const url = typeof window !== 'undefined' ? window.location.href : '';
                const isCallback = url.includes('code=') && url.includes('state=');
                
                if (isCallback) {
                    console.log("🛡️ AuthGuard: OIDC Callback detected. Waiting for hydration...");
                    return;
                }

                console.log("🛡️ AuthGuard: Keycloak required. Initiating OIDC flow...");
                signinOidc();
            } else {
                console.log("🛡️ AuthGuard: Unauthenticated access detected. Redirecting to login...");
                router.push('/login');
            }
        }

        // Optional: Admin check
        if (isFetched && !authLoading && userData && requireAdmin && userData.role !== 'ADMIN') {
            console.warn("🛡️ AuthGuard: Admin access required. Redirecting to landing page...");
            router.push('/');
        }
    }, [isFetched, authLoading, userData, requireAdmin, router]);

    // --- LOADING STATE (Aesthetic consistency with app.tsx) ---
    if (authLoading || !userData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-outfit">
                <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-[40px] rounded-full scale-150 animate-pulse"></div>
                        <Logo size={72} className="relative z-10" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <span className="font-extrabold text-3xl tracking-tighter text-slate-900 leading-none">Koreki<span className="text-primary">.</span></span>
                        <p className="text-slate-400 text-sm font-medium tracking-wide">Wird geladen …</p>
                    </div>
                    <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary via-indigo-500 to-primary rounded-full animate-loading-bar"></div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthGuard;
