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
 * Im gehosteten Dienst fuehrt der Hauptknopf zum Testzugang ("Jetzt testen"),
 * in einer lokalen Installation direkt in die eigene App. Technikangaben (Hardware, Modelle, Laufzeiten) stehen auf
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

    const eingeloggt = !authLoading && !!userData;
    // Gehosteter Dienst: Testzugang wie vor dem Umbau. Lokale Installation:
    // direkt in die eigene App. Der Desktop-Download steht in Kopfleiste und
    // "Zwei Wege zu Koreki".
    const aktion: Hauptaktion = mode === 'community'
        ? { href: eingeloggt ? '/app' : '/login', text: 'Korrektur starten' }
        : { href: eingeloggt ? '/app' : '/register', text: eingeloggt ? 'Zur App' : 'Jetzt testen' };

    return (
        <MarketingLayout>
            <Head>
                <title>Koreki – Korrekturvorschläge für Klassenarbeiten</title>
                <meta
                    name="description"
                    content="Koreki liest Klassenarbeiten, vergleicht sie mit deiner Musterlösung und schlägt Punkte und Feedback vor. Die Note vergibst du – auf deinem eigenen Rechner."
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
