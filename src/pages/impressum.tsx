import React, { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Building2, Mail, Scale, Info, Sparkles, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import MarketingLayout from '../layouts/MarketingLayout';
import { LEGAL_CONFIG } from '@/config/legal-contact';
import { getKorekiMode } from '@/lib/env-context';
import { cn } from '@/lib/utils';

export default function Impressum() {
    const [activeSection, setActiveSection] = useState('contact');
    const [mode, setMode] = useState<'saas' | 'community' | 'desktop'>('saas');

    useEffect(() => {
        setMode(getKorekiMode());
    }, []);

    // Filter TOC sections based on config
    const tocSections = useMemo(() => [
        { id: 'usage', label: 'Nutzungshinweis' },
        { id: 'contact', label: 'Angaben gemäß § 5 TMG' },
        ...(LEGAL_CONFIG.registration.number ? [{ id: 'register', label: 'Registereintrag' }] : []),
        ...(LEGAL_CONFIG.registration.taxId ? [{ id: 'tax', label: 'Umsatzsteuer-ID' }] : []),
        { id: 'eu-dispute', label: 'EU-Streitschlichtung' },
        { id: 'liability', label: 'Haftungsausschluss' },
    ], []);

    // Simple scroll spy logic
    useEffect(() => {
        const handleScroll = () => {
            const sections = tocSections.map(s => s.id);
            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [tocSections]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    return (
        <MarketingLayout>
            <Head>
                <title>Impressum | Koreki</title>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="max-w-[1200px] mx-auto px-8 pt-0 pb-24 flex flex-col md:flex-row gap-12 items-start animate-fade-in">
                <aside className="w-full md:w-[300px] flex-shrink-0 sticky top-24">
                    <div className="bg-background rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="mt-0 mb-4 text-xs uppercase tracking-widest font-bold text-muted-foreground">Inhalt</h3>
                        <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                            {tocSections.map((sec) => (
                                <li key={sec.id}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start text-left px-3 py-2 rounded-lg text-sm transition-all h-auto",
                                            activeSection === sec.id
                                                ? 'bg-primary/5 text-primary font-bold hover:bg-primary/10'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-primary'
                                        )}
                                        onClick={() => scrollToSection(sec.id)}
                                    >
                                        {sec.label}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                <main className="flex-grow max-w-[800px]">
                    <header className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-2 tracking-tighter font-outfit">Impressum</h1>
                        <p className="text-muted-foreground text-base">Stand: April 2026</p>
                    </header>

                    <div className="flex flex-col gap-8">
                        {/* Private & Test Warning */}
                        <section id="usage" className="bg-warning/10 border border-warning rounded-2xl p-8 shadow-sm scroll-mt-24">
                            <h2 className="text-warning font-bold flex items-center gap-2 mb-4">
                                <Shield className="w-5 h-5 text-warning" /> Wichtiger Nutzungshinweis (Demo-Instanz)
                            </h2>
                            <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                                Dies ist ein <strong>privates, nicht-kommerzielles Open-Source-Projekt</strong>. Diese Instanz (koreki.org) wird ausschließlich zu <strong>Demonstrations- und Testzwecken</strong> betrieben. 
                            </p>
                            <ul className="text-foreground/80 text-sm list-disc pl-5 space-y-2 mb-4">
                                <li><strong>Haftungsausschluss:</strong> Die Bereitstellung erfolgt &quot;wie besehen&quot; ohne jegliche Gewährleistung. Der Betreiber übernimmt keine Haftung für Schäden, Datenverlust oder die Richtigkeit der KI-Bewertungen.</li>
                                <li><strong>Datenverbot:</strong> Es dürfen <strong>keine echten personenbezogenen Schülerdaten</strong> hochgeladen werden. Bitte nutzen Sie ausschließlich anonymisierte Testdaten.</li>
                                <li><strong>Kein Unternehmen:</strong> Der Betrieb erfolgt rein privat und ohne Gewinnerzielungsabsicht.</li>
                            </ul>
                            <p className="text-warning text-xs italic">
                                Mit der Nutzung dieser Website erkennen Sie diesen Haftungsausschluss an.
                            </p>
                        </section>

                        <section id="contact" className="bg-background rounded-2xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted rounded-xl mb-6 text-muted-foreground"><Building2 className="w-6 h-6" /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6 font-outfit">Angaben gemäß § 5 TMG</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4"><strong>{LEGAL_CONFIG.controller.name}</strong><br />
                                {LEGAL_CONFIG.controller.address}</p>

                            <div className="mt-6 flex flex-col gap-3">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Mail className="w-5 h-5 text-primary/40" />
                                    <span>{LEGAL_CONFIG.contact.email}</span>
                                </div>
                                {mode === 'saas' && (
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <Link href="/contact" className="text-sm font-bold text-primary hover:opacity-80 flex items-center gap-2 transition-all">
                                            Zum Kontaktformular &rarr;
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </section>

                        {LEGAL_CONFIG.registration.number && (
                            <section id="register" className="bg-background rounded-2xl p-10 border border-border shadow-sm relative scroll-mt-24">
                                <div className="inline-flex p-3 bg-muted rounded-xl mb-6 text-muted-foreground"><Info className="w-6 h-6" /></div>
                                <h2 className="text-2xl font-bold text-foreground mb-6 font-outfit">Registereintrag</h2>
                                <p className="leading-relaxed text-muted-foreground">Eintragung im Handelsregister.<br />
                                    Registergericht: {LEGAL_CONFIG.registration.court}<br />
                                    Registernummer: {LEGAL_CONFIG.registration.number}</p>
                            </section>
                        )}

                        {LEGAL_CONFIG.registration.taxId && (
                            <section id="tax" className="bg-background rounded-2xl p-10 border border-border shadow-sm relative scroll-mt-24">
                                <h2 className="text-2xl font-bold text-foreground mb-6 font-outfit">Umsatzsteuer-ID</h2>
                                <p className="leading-relaxed text-muted-foreground">Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                                    <strong className="text-foreground font-bold">{LEGAL_CONFIG.registration.taxId}</strong></p>
                            </section>
                        )}

                        <section id="eu-dispute" className="bg-background rounded-2xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <h2 className="text-2xl font-bold text-foreground mb-6 font-outfit">EU-Streitschlichtung</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr/</a>.<br /> Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
                            <p className="leading-relaxed text-muted-foreground">Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
                        </section>

                        <section id="liability" className="bg-background rounded-2xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted rounded-xl mb-6 text-muted-foreground"><Scale className="w-6 h-6" /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6 font-outfit">Haftungsausschluss (Disclaimer)</h2>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-4">Haftung für Inhalte</h3>
                            <p className="leading-relaxed text-muted-foreground mb-4">Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
                            
                            <h3 className="text-lg font-bold text-foreground mt-8 mb-4 font-outfit">Keine Rechts- oder Korrekturberatung</h3>
                            <p className="leading-relaxed text-muted-foreground mb-4">Koreki ist ein Experimentalsystem. Die KI-generierten Korrekturen dienen nur der Unterstützung und sind keine verbindlichen Bewertungen. Der Nutzer bleibt alleinverantwortlich für die abschließende Notengebung.</p>

                            <h3 className="text-lg font-bold text-foreground mt-8 mb-4 font-outfit">Haftung für Links</h3>
                            <p className="leading-relaxed text-muted-foreground mb-4">Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
                        </section>
                    </div>
                </main>
            </div>
        </MarketingLayout>
    );
}
