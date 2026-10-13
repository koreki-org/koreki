import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { EyeOff, KeyRound, User, Cpu, UserCheck, Mail } from 'lucide-react';
import MarketingLayout from '../layouts/MarketingLayout';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { LEGAL_CONFIG } from '@/config/legal-contact';
import { Abschnitt, AbschnittsKopf, Kachel, NACH_KOPF, RASTER, Symbol } from '@/components/marketing/site/Bausteine';

/*
 * Jede Massnahme hier steht im Code. Keine Zusage, die nur vertraglich waere,
 * und keine regulatorische Selbsteinstufung (marketing-communication §3).
 */
const MASSNAHMEN = [
    {
        icon: User,
        titel: 'Pseudonyme schon beim Hochladen',
        text: 'Dateinamen wie „Klausur_Max_Mustermann.pdf“ werden in Ihrem Browser zu „Schüler #1“, bevor die Datei weiterverarbeitet wird. Namen im Text werden vor jeder Übergabe an eine KI ersetzt.',
    },
    {
        icon: EyeOff,
        titel: 'Schwärzen auf Scans',
        text: 'Namen auf eingescannten Seiten können Sie direkt im Browser unkenntlich machen. Erst das geschwärzte Bild verlässt Ihren Rechner.',
    },
    {
        icon: Cpu,
        titel: 'Lokale Modelle',
        text: 'Mit Ollama läuft die KI auf Ihrem Rechner oder dem Schulserver. Dann verlässt keine Arbeit Ihr Netzwerk.',
    },
    {
        icon: KeyRound,
        titel: 'Schlüssel bleiben bei Ihnen',
        text: 'In Desktop-Version und Community Edition werden API-Schlüssel, etwa für Mistral, nur auf Ihrem Gerät gespeichert – nie auf Servern von Koreki.',
    },
    {
        icon: UserCheck,
        titel: 'Die Entscheidung bleibt bei Ihnen',
        text: 'Koreki macht ausschließlich Vorschläge. Jede Bewertung prüfen und bestätigen Sie selbst, bevor sie ausgegeben wird.',
    },
];

export default function SecurityPage() {
    return (
        <MarketingLayout>
            <Head>
                <title>Datenschutz und Sicherheit | Koreki</title>
                <meta name="description" content="Wie Koreki Schülerdaten schützt: Pseudonyme beim Hochladen, Schwärzen auf Scans, lokale Modelle und Schlüssel, die auf Ihrem Gerät bleiben." />
            </Head>

            <Abschnitt kopfband className="pt-16 md:pt-24">
                <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-3">Datenschutz</p>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-[-0.045em] leading-[1.05] text-foreground max-w-3xl mx-auto">
                        Datenschutz, der im Code steht – nicht nur im Vertrag.
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Koreki ist so gebaut, dass Schülerdaten so wenig wie möglich das Gerät verlassen – und wenn, dann ohne Namen.
                    </p>
                </div>
                    <div className={cn("mt-12", RASTER, "md:grid-cols-2 lg:grid-cols-3")}>
                        {MASSNAHMEN.map(({ icon: Icon, titel, text }) => (
                            <Kachel key={titel}>
                                <Symbol><Icon size={20} /></Symbol>
                                <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{titel}</h3>
                                <p className="mt-1.5 text-sm/relaxed text-muted-foreground">{text}</p>
                            </Kachel>
                        ))}
                    </div>
            </Abschnitt>

            <Abschnitt>
                    <AbschnittsKopf kicker="Verfügbar" titel="Zwei Versionen, beide lokal." />
                    <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-2")}>
                        <Kachel>
                            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Koreki Desktop</h3>
                            <p className="mt-2 text-muted-foreground">Für die eigene Korrektur am eigenen Rechner – Windows und Ubuntu.</p>
                            <Link href="/desktop" className={cn(buttonVariants({ variant: 'outline' }), "mt-6 h-11")}>Zur Desktop-Version</Link>
                        </Kachel>
                        <Kachel>
                            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Community Edition</h3>
                            <p className="mt-2 text-muted-foreground">Für den Betrieb im Schulnetz, mit zentraler Benutzerverwaltung.</p>
                            <Link href="/self-hosting" className={cn(buttonVariants({ variant: 'outline' }), "mt-6 h-11")}>Zur Community Edition</Link>
                        </Kachel>
                    </div>
            </Abschnitt>

            <Abschnitt className="pt-0 md:pt-0">
                    <div className="rounded-hero bg-primary/[0.04] border border-primary/10 p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="max-w-xl">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary mb-2">In Vorbereitung</p>
                            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Ein gehosteter Dienst für Schulen.</h2>
                            <p className="mt-3 text-muted-foreground">
                                Für Schulen ohne eigenen Server bereiten wir einen gehosteten Dienst vor. Wenn Ihre Schule ihn mit erproben möchte, schreiben Sie uns.
                            </p>
                        </div>
                        <a href={`mailto:${LEGAL_CONFIG.contact.email}`} className={cn(buttonVariants({ variant: 'default', size: 'lg' }), "h-12 shrink-0")}>
                            <Mail size={17} /> Kontakt aufnehmen
                        </a>
                    </div>
            </Abschnitt>
        </MarketingLayout>
    );
}
