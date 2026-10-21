import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Download, ArrowRight, BookOpen, Cpu, Laptop, KeyRound, ShieldAlert } from 'lucide-react';
import { isLocalInstance } from '@/lib/env-context';
import MarketingLayout from '@/layouts/MarketingLayout';
import { Button } from '@/components/ui/Button';
import { Abschnitt, Kachel, Produktbild, Symbol } from '@/components/marketing/site/Bausteine';

const MERKMALE = [
    { icon: Cpu, titel: 'Lokal oder mit Mistral', text: 'Ein lokales Modell über Ollama oder Mistral mit deinem eigenen Schlüssel – du wählst.' },
    { icon: Laptop, titel: 'Windows und Ubuntu', text: 'Für Windows 10/11 und Ubuntu Desktop. Eine Version für macOS ist in Planung.' },
    { icon: KeyRound, titel: 'Schlüssel bleiben bei dir', text: 'API-Schlüssel werden nur auf deinem Gerät gespeichert, nie auf Servern von Koreki.' },
];

/**
 * Desktop-Seite. Dient doppelt: oeffentlich als Download-Seite, und in der
 * installierten App als Startbildschirm (dann ohne Kopf- und Fusszeile und mit
 * "Zur App" statt Download).
 */
export default function DesktopOnboarding() {
    const router = useRouter();
    const lokal = isLocalInstance();

    const handleDownloadDesktop = () => {
        window.location.href = 'https://github.com/koreki-org/koreki/releases';
    };

    return (
        <MarketingLayout hideHeader={lokal} hideFooter={lokal}>
            <Head>
                <title>Koreki Desktop | Korrektur auf deinem eigenen Rechner</title>
                <meta name="description" content="Koreki Desktop für Windows und Ubuntu: Korrekturvorschläge für Klassenarbeiten, lokal auf deinem Rechner." />
            </Head>

            <Abschnitt kopfband className="pt-16 md:pt-24">
                <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16 items-start">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">Desktop-Version</p>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-0.045em] leading-[1.05] text-foreground">
                            Koreki auf deinem eigenen Rechner.
                        </h1>
                        <p className="mt-6 text-lg text-muted-foreground max-w-xl">
                            Installieren wie jedes andere Programm. Musterlösung und Arbeiten hochladen, Vorschläge prüfen – ohne Konto und ohne Server.
                        </p>
                        <ul className="mt-12 space-y-6">
                            {MERKMALE.map(({ icon: Icon, titel, text }) => (
                                <li key={titel} className="flex gap-4">
                                    <Symbol><Icon size={19} /></Symbol>
                                    <div>
                                        <p className="font-semibold text-foreground">{titel}</p>
                                        <p className="text-sm text-muted-foreground">{text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <Kachel className="shadow-lift">
                        {lokal ? (
                            <Button size="lg" className="w-full h-12 text-base" onClick={() => router.push('/app')}>
                                Zur App <ArrowRight size={18} />
                            </Button>
                        ) : (
                            <Button size="lg" className="w-full h-12 text-base" onClick={handleDownloadDesktop}>
                                <Download size={18} /> Kostenlos herunterladen
                            </Button>
                        )}
                        <p className="mt-3 text-center text-xs text-muted-foreground">
                            Kostenlos für den nicht-kommerziellen Einsatz · Lizenz: PolyForm Noncommercial
                        </p>

                        <Link
                            href="/desktop-setup"
                            className="mt-6 flex items-center gap-3 rounded-xl border border-border p-4 hover:border-foreground/30 transition-colors"
                        >
                            <Symbol className="w-9 h-9"><BookOpen size={17} /></Symbol>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Einrichtungsanleitung</p>
                                <p className="text-xs text-muted-foreground">Ollama oder Mistral in wenigen Schritten verbinden</p>
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground" />
                        </Link>

                        <div className="mt-6 rounded-xl bg-warning/10 p-4 flex gap-3">
                            <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" />
                            <p className="text-xs/relaxed text-foreground">
                                Bitte beachte die Datenschutzrichtlinien deiner Schule und schütze dein Gerät vor unbefugtem Zugriff.
                            </p>
                        </div>
                        <p className="mt-4 text-xs/relaxed text-muted-foreground">
                            <span className="font-medium text-foreground">Haftungsausschluss:</span> Die Nutzung der Software erfolgt auf eigene Gefahr.
                            Der Entwickler übernimmt keine Haftung für Schäden, Datenverlust oder Inkompatibilitäten, die durch die Installation
                            oder Nutzung der Desktop-Version entstehen.
                        </p>
                    </Kachel>
                </div>

                {/* In der installierten App ist diese Seite der Startbildschirm: dort
                    ohne Produktbild, damit nichts zum Scrollen zwingt. */}
                {!lokal && (
                    <div className="mt-12">
                        <Produktbild src="/marketing/uebersicht.webp" alt="Koreki Desktop mit Musterlösung, Schülerarbeiten und Stapelverarbeitung" />
                    </div>
                )}
            </Abschnitt>
        </MarketingLayout>
    );
}
