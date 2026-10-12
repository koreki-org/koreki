import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MarketingLayout from '../layouts/MarketingLayout';
import { isDesktopTarget, getKorekiMode } from '@/lib/env-context';
import { useAuth } from '../hooks/useAuth';
import { LandingHero, Hauptaktion } from '@/components/marketing/landing/LandingHero';
import { LandingAblauf } from '@/components/marketing/landing/LandingAblauf';
import { LandingFunktionen } from '@/components/marketing/landing/LandingFunktionen';
import { LandingDatenschutz } from '@/components/marketing/landing/LandingDatenschutz';
import { LandingEditionen, LandingSchluss } from '@/components/marketing/landing/LandingEditionen';

/**
 * Startseite (neu seit 12.10.2026).
 *
 * Koreki startet lokal: Desktop und Community Edition. Die oeffentliche Seite
 * bewirbt deshalb zuerst den Download; eine lokale Installation fuehrt direkt
 * in die eigene App. Technikangaben (Hardware, Modelle, Laufzeiten) stehen auf
 * den Installationsseiten, nicht hier (koreki-design-system §0).
 */
export default function LandingPage() {
    const router = useRouter();
    const mode = getKorekiMode();
    const { userData, authLoading } = useAuth();

    useEffect(() => {
        if (isDesktopTarget()) {
            router.replace('/desktop');
        }
    }, [router]);

    const aktion: Hauptaktion = mode === 'community'
        ? { href: (!authLoading && userData) ? '/app' : '/login', text: 'Korrektur starten' }
        : { href: '/desktop', text: 'Kostenlos herunterladen', download: true };

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki – Korrekturvorschläge für Klassenarbeiten</title>
                <meta
                    name="description"
                    content="Koreki liest Klassenarbeiten, vergleicht sie mit Ihrer Musterlösung und schlägt Punkte und Feedback vor. Die Note vergeben Sie – auf Ihrem eigenen Rechner."
                />
            </Head>

            <LandingHero aktion={aktion} />
            <LandingAblauf />
            <LandingFunktionen />
            <LandingDatenschutz />
            <LandingEditionen />
            <LandingSchluss href={aktion.href} text={aktion.text} />
        </MarketingLayout>
    );
}
