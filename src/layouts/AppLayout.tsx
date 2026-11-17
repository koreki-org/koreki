import React from 'react';
import MinimalFooter from '../components/layout/MinimalFooter';
import { useVerlassenWarnung } from '@/hooks/useVerlassenWarnung';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { useSeitenleisteStore } from '@/hooks/store/useSeitenleisteStore';

/**
 * AppLayout Component
 * 
 * The persistent application shell for Koreki.
 * It provides the font hierarchy and a consistent bg-background.
 */
interface AppLayoutProps {
    children: React.ReactNode;
    showFooter?: boolean;
    /** Die Seite traegt `AppSeitenleiste` (fest, 48 px) — Inhalt und Fusszeile ruecken ab `md` daneben. */
    mitSeitenleiste?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, showFooter = true, mitSeitenleiste = false }) => {
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
    // Offen: Platz fuer die 256 px breite Leiste. Zu: 48 px fuer ihr Symbol oben links.
    const leisteOffen = useSeitenleisteStore(s => s.offen);
    const einzug = !mitSeitenleiste ? '' : leisteOffen ? 'md:pl-64' : 'md:pl-12';

    return (
        <div className={`min-h-screen bg-background flex flex-col relative ${einzug}`}>
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
