import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Book, Shield, CreditCard, Scale, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import MarketingLayout from '../layouts/MarketingLayout';

export default function AGB() {
    const [activeSection, setActiveSection] = useState('scope');

    // Simple scroll spy logic
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['scope', 'liability', 'credits', 'privacy', 'duties', 'revocation', 'final'];
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
    }, []);

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
                <title>AGB | Koreki</title>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="max-w-[1200px] mx-auto px-8 pt-0 pb-24 flex flex-col md:flex-row gap-12 items-start">
                <aside className="w-full md:w-[250px] flex-shrink-0 sticky top-24">
                    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="mt-0 mb-4 text-[0.75rem] uppercase tracking-widest font-bold text-muted-foreground">Inhalt</h3>
                        <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                            {[
                                { id: 'scope', label: '§1 Geltungsbereich' },
                                { id: 'liability', label: '§2 Leistung & KI-Haftung' },
                                { id: 'credits', label: '§3 Credit-System' },
                                { id: 'privacy', label: '§4 Datenschutz (AVV & PURE)' },
                                { id: 'duties', label: '§5 Pflichten des Nutzers' },
                                { id: 'revocation', label: '§6 Widerrufsrecht' },
                                { id: 'final', label: '§7 Schlussbestimmungen' },
                            ].map((sec) => (
                                <li key={sec.id}>
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start text-left px-3 py-2 rounded-lg text-sm transition-all h-auto ${activeSection === sec.id
                                                ? 'bg-accent-1/5 text-accent-1 font-bold hover:bg-accent-1/10 hover:text-accent-1'
                                                : 'text-muted-foreground hover:bg-muted hover:text-accent-1'
                                            }`}
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
                        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-2 tracking-tight">Allgemeine Geschäftsbedingungen</h1>
                        <p className="text-muted-foreground text-base">Stand: März 2026</p>
                    </header>

                    <div className="flex flex-col gap-8">
                        <section id="scope" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted/80 text-muted-foreground rounded-xl mb-6"><Book size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§1 Geltungsbereich und Zweck</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der unter koreki.org bereitgestellten Instanz der Koreki-Software. Davon unberührt bleibt die Lizenzierung des Quellcodes der Software, welcher als Open-Source-Projekt separat lizenziert wird.</p>
                            <div className="bg-accent-1/5 border-l-4 border-accent-1 p-6 rounded-r-2xl my-6">
                                <strong className="text-accent-1 block mb-2 font-bold">REINER TESTBETRIEB:</strong>
                                <p className="text-accent-1 text-sm leading-relaxed m-0">Die Instanz auf <strong>koreki.org dient ausschließlich zu Test- und Demonstrationszwecken</strong>. Die Verarbeitung von realen, personenbezogenen Schülerdaten ist auf dieser öffentlichen Test-Instanz untersagt. Nutzer sind verpflichtet, ausschließlich Demo-Daten oder vollständig anonymisierte Texte zu verwenden.</p>
                            </div>
                            <p className="leading-relaxed text-muted-foreground">Koreki richtet sich an Lehrkräfte und Bildungseinrichtungen als Open-Source-Hilfsmittel zur KI-gestützten Korrektur und Einschätzung von Aufgaben.</p>
                        </section>

                        <section id="liability" className="bg-white rounded-3xl p-10 border border-warning/20 shadow-sm relative scroll-mt-24 bg-gradient-to-br from-warning/5 to-white">
                            <div className="inline-flex p-3 bg-warning/10 text-warning rounded-xl mb-6"><Scale size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§2 Leistungsumfang und KI-Haftungsausschluss</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Koreki bietet Werkzeuge zur Textextraktion (OCR) und Analyse mittels Künstlicher Intelligenz (KI). Die KI generiert Einschätzungen und Bepunktungsvorschläge basierend auf den von der Lehrkraft bereitgestellten Musterlösungen.</p>
                            <div className="bg-destructive/10 border-l-4 border-destructive p-6 rounded-r-2xl my-6">
                                <strong className="text-destructive block mb-2 font-bold">WICHTIGER HINWEIS:</strong>
                                <p className="text-destructive text-sm leading-relaxed m-0">Die von der KI generierten Ergebnisse sind <strong>ausschließlich als Vorschläge und Einschätzungen</strong> zu verstehen. Die finale pädagogische, fachliche und rechtliche Verantwortung für die endgültige Benotung liegt <strong>immer und vollumfänglich bei der Lehrkraft</strong>.</p>
                            </div>
                            <p className="leading-relaxed text-muted-foreground">Koreki übernimmt keine Haftung für fehlerhafte Textauslesungen, inkorrekte KI-Bewertungen, &quot;Halluzinationen&quot; der KI oder daraus resultierende ungerechtfertigte Benotungen. Der Nutzer ist verpflichtet, die generierten Vorschläge vor der Übernahme kritisch zu prüfen.</p>
                        </section>

                        <section id="credits" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted/80 text-muted-foreground rounded-xl mb-6"><CreditCard size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§3 Credit-System und Zahlungen</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Die Nutzung kostenpflichtiger KI-Dienste (wie OCR und Textanalyse) erfolgt über ein Prepaid-Credit-System.</p>
                            <ul className="list-disc leading-relaxed text-muted-foreground pl-6 mb-6 flex flex-col gap-3">
                                <li><strong>Preise:</strong> Die aktuellen Credit-Kosten pro Analyse-Typ (z.B. Handschrift vs. digitales PDF) sind transparent im Kontobereich der App (&quot;Credit-Aufladung&quot;) einsehbar.</li>
                                <li><strong>Kauf:</strong> Credits werden über den Zahlungsdienstleister Stripe erworben. Ein Rückabwicklung von bereits genutzten Credits ist ausgeschlossen.</li>
                                <li><strong>Verfall:</strong> Erworbene Credits verfallen nicht, solange das Nutzerkonto aktiv ist. Bei Löschung des Kontos verfällt eventuell vorhandenes Restguthaben ohne Anspruch auf Auszahlung.</li>
                                <li><strong>Erstattung bei Fehlern:</strong> Sollte eine KI-Analyse aufgrund technischer Fehler des Systems nachweislich fehlschlagen, erstattet Koreki die abgebuchten Credits auf das virtuelle Konto zurück.</li>
                            </ul>
                        </section>

                        <section id="privacy" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted/80 text-muted-foreground rounded-xl mb-6"><Shield size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§4 Datenschutz (AVV und &quot;PURE Mode&quot;)</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Der Schutz sensibler Schülerdaten hat höchste Priorität.</p>
                            <ul className="list-disc leading-relaxed text-muted-foreground pl-6 mb-6 flex flex-col gap-3">
                                <li><strong>Datenminimierung:</strong> Koreki anonymisiert/pseudonymisiert Dokumententitel standardmäßig im Browser, bevor Daten verarbeitet werden. Optional können Bildbereiche manuell geschwärzt werden.</li>
                                <li><strong>Standard-Mode:</strong> Für die serverseitige Verarbeitung kann ein Vertrag zur Auftragsverarbeitung (AVV) gemäß Art. 28 DSGVO abgeschlossen werden. Ein Mustervertrag steht im Kontobereich zur Verfügung.</li>
                                <li><strong>PURE-Mode:</strong> Nutzer des &quot;PURE-Mode&quot; stimmen zu, dass die Datenkommunikation direkt zwischen dem Endgerät des Nutzers (Browser) und dem API-Schnittstellen-Anbieter (Mistral, EU-Server) stattfindet, ohne Zwischenspeicherung auf Koreki-Servern. </li>
                            </ul>
                            <p className="leading-relaxed text-muted-foreground">Weitere Details regelt die <Link href="/privacy" className="text-accent-1 hover:underline">Datenschutzerklärung</Link>.</p>
                        </section>

                        <section id="duties" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted/80 text-muted-foreground rounded-xl mb-6"><CheckCircle size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§5 Pflichten des Nutzers</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Der Nutzer sichert zu, dass er berechtigt ist, die hochgeladenen Dokumente (Schülerarbeiten) im Rahmen der KI-gestützten Analyse zu verarbeiten. Er holt notwendige Einwilligungen gemäß den Vorgaben seiner Bildungseinrichtung bzw. des geltenden Schulrechts selbstständig ein.</p>
                            <p className="leading-relaxed text-muted-foreground">Eine missbräuchliche Nutzung der Plattform (z.B. automatisierte Massenabfragen per Bot, Reverse-Engineering der API) ist untersagt und führt zur Sperrung des Kontos.</p>
                        </section>

                        <section id="revocation" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <h2 className="text-2xl font-bold text-foreground mb-6">§6 Widerrufsrecht</h2>
                            <p className="leading-relaxed text-muted-foreground">Nutzer, die als Verbraucher handeln, haben grundsätzlich ein Widerrufsrecht für den Kauf von Credits. Dieses Recht erlischt jedoch vorzeitig, sobald der Nutzer nach dem Kauf aktiv eine KI-Analyse startet und damit in die unmittelbare Ausführung der Dienstleistung einwilligt.</p>
                        </section>

                        <section id="final" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <h2 className="text-2xl font-bold text-foreground mb-6">§7 Schlussbestimmungen</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Es gilt das Recht der Bundesrepublik Deutschland.</p>
                            <p className="leading-relaxed text-muted-foreground">Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt der Vertrag im Übrigen wirksam. An die Stelle der unwirksamen Bestimmung treten die gesetzlichen Vorschriften.</p>
                        </section>
                    </div>
                </main>
            </div>
        </MarketingLayout>
    );
}
