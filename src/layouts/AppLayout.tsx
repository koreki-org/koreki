import React from 'react';
import MinimalFooter from '../components/layout/MinimalFooter';
import { useVerlassenWarnung } from '@/hooks/useVerlassenWarnung';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';

/**
 * AppLayout Component
 * 
 * The persistent application shell for Koreki.
 * It provides the font hierarchy and a consistent bg-background.
 */
interface AppLayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, showFooter = true }) => {
    /*
     * Die Warnung haengt an der Huelle, nicht an der Seite.
     *
     * Sie gilt fuer alles, was in dieser Huelle liegt, und sie liest die beiden
     * Speicher direkt — damit kann keine Seite vergessen, sie anzumelden. Auf
     * Anmeldung und Registrierung, die dieselbe Huelle benutzen, ist nichts
     * geladen; dort meldet sie sich deshalb von selbst nicht.
     */
    const hatArbeiten = useBatchStore(s => s.batchFiles.length > 0);
    const hatMusterloesung = useDashboardStore(s => !!s.modelSolution);
    useVerlassenWarnung(hatArbeiten || hatMusterloesung);

    return (
        <div className="min-h-screen bg-background flex flex-col relative">
            <main className="flex-grow relative z-20">
                {children}
            </main>
            
            {showFooter && (
                <div className="relative z-0">
                    <MinimalFooter />
                </div>
            )}
        </div>
    );
};

export default AppLayout;
