import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Server, Lock, CreditCard, Cpu, Database, RefreshCw, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import MarketingLayout from '../layouts/MarketingLayout';
import { LEGAL_CONFIG } from '@/config/legal-contact';

export default function Privacy() {
    const [activeSection, setActiveSection] = useState('intro');

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    // Simple scroll spy logic
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['intro', 'data', 'retention', 'privacy', 'rights'];
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
    return (
        <MarketingLayout>

            <div className="max-w-[1200px] mx-auto px-8 pt-0 pb-24 flex flex-col md:flex-row gap-12 items-start">
                <aside className="w-full md:w-[300px] flex-shrink-0 sticky top-24">
                    <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                        <h3 className="mt-0 mb-4 text-[0.75rem] uppercase tracking-widest font-bold text-muted-foreground">Inhalt</h3>
                        <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
                            {[
                                { id: 'intro', label: '§1 Einleitung & Transparenz' },
                                { id: 'data', label: '§2 Datenverarbeitung' },
                                { id: 'retention', label: '§3 Autom. Löschung' },
                                { id: 'privacy', label: '§4 Max. Privatsphäre' },
                                { id: 'rights', label: '§5 Ihre Rechte' },
                            ].map((sec) => (
                                <li key={sec.id}>
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start text-left px-3 py-2 rounded-lg text-sm transition-all h-auto ${activeSection === sec.id
                                                ? 'bg-accent-1-50 text-accent-1-700 font-bold hover:bg-accent-1-100 hover:text-accent-1-800'
                                                : 'text-muted-foreground hover:bg-muted hover:text-accent-1-600'
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
                        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-2 tracking-tight">Datenschutzerklärung</h1>
                        <p className="text-muted-foreground text-base">Stand: April 2026</p>
                    </header>

                    <div className="flex flex-col gap-8">
                        <section id="intro" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted/80 text-muted-foreground rounded-xl mb-6"><Shield size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§1 Einleitung & Transparenz</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Koreki ist ein <strong>privates Open-Source-Projekt</strong>. Diese Website (koreki.org) dient ausschließlich als technische Demonstration. Es gibt keine kommerziellen Absichten und keine Gewinnerzielungsabsicht.</p>
                            
                            <div className="bg-destructive/10 border-l-4 border-destructive p-6 rounded-r-2xl my-6">
                                <strong className="text-destructive block mb-2 font-bold">WICHTIG: Keine echten Schülerdaten</strong>
                                <p className="text-destructive text-sm leading-relaxed m-0">Auf dieser Demo-Instanz dürfen keine echten personenbezogenen Daten von Schülern verarbeitet werden. Bitte nutzen Sie ausschließlich fiktive Testdaten.</p>
                            </div>

                            <p className="leading-relaxed text-muted-foreground mb-4">Verantwortlicher im Sinne der DSGVO: {LEGAL_CONFIG.controller.name}, {LEGAL_CONFIG.controller.address}.</p>
                        </section>

                        <section id="data" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted/80 text-muted-foreground rounded-xl mb-6"><Database size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§2 Welche Daten fallen an?</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Da dies ein privates Projekt ist, sammeln wir nur das absolute Minimum:</p>
                            <p className="leading-relaxed text-muted-foreground mb-6 text-xs italic uppercase tracking-wider">
                                Hosting: Diese Website wird auf einem virtuellen Server der IONOS SE, Elgendorfer Str. 57, 56410 Montabaur gehostet.
                            </p>
                            <ul className="list-disc leading-relaxed text-muted-foreground pl-6 mb-6 flex flex-col gap-3">
                                <li><strong>Server-Logs:</strong> Beim Aufruf der Seite speichert unser Hoster (IONOS) kurzzeitig Verbindungsdaten (IP-Adresse, Zeitstempel), um den Betrieb sicherzustellen und Angriffe abzuwehren. Diese werden nach 7 Tagen gelöscht.</li>
                                <li><strong>KI-Analyse:</strong> Die von Ihnen eingegebenen Texte/Bilder werden zur Analyse an die API von <strong>Mistral AI</strong> (Standort: EU/Frankreich) gesendet.</li>
                                <li><strong>Login:</strong> Wir nutzen Logto zur Authentifizierung. Es wird lediglich Ihre E-Mail-Adresse gespeichert, um Ihnen Zugang zur Demo zu ermöglichen.</li>
                                <li><strong>Nutzungs-Monitoring:</strong> Wir erfassen die Menge der verbrauchten Recheneinheiten (Token) pro Nutzer. Dies dient ausschließlich der Fair-Use-Kontrolle, um den Missbrauch der geteilten Ressourcen zu verhindern. Diese Daten werden strikt getrennt von Ihren Inhalten verarbeitet.</li>
                                <li><strong>Compliance- \u0026 Audit-Logs:</strong> Zur rechtssicheren Dokumentation speichern wir Ihre Bestätigung des Anonymisierungs-Disclaimers sowie sicherheitsrelevante Ereignisse (z. B. erfolgreiche Logins). Dabei werden der Zeitpunkt, die E-Mail-Adresse und die Quell-IP-Adresse erfasst, um Missbrauch vorzubeugen und die Einhaltung unserer Nutzungsbedingungen nachzuweisen.</li>
                            </ul>
                        </section>

                        <section id="retention" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <div className="inline-flex p-3 bg-muted/80 text-muted-foreground rounded-xl mb-6"><RefreshCw size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§3 Automatische Löschung (Pillar 6)</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">
                                Koreki folgt dem Prinzip der Datensparsamkeit durch technisches Design (Privacy by Design). Wir haben eine <strong>automatisierte Datenaufbewahrungs-Richtlinie</strong> implementiert:
                            </p>
                            <div className="bg-muted p-6 rounded-2xl border border-border flex items-start gap-4">
                                <div className="text-accent-1-600 mt-1"><Database size={20} /></div>
                                <div>
                                    <strong className="text-foreground block mb-1">90-Tage-Löschzyklus</strong>
                                    <p className="text-muted-foreground text-sm leading-relaxed m-0">Alle temporären Nutzungsdaten, Sicherheits-Events und Compliance-Audit-Logs werden nach spätestens 90 Tagen unwiderruflich von unseren Systemen gelöscht. Es erfolgt keine Langzeit-Speicherung personenbezogener Daten.</p>
                                </div>
                            </div>
                        </section>

                        <section id="privacy" className="bg-white rounded-3xl p-10 border border-accent-3-200 shadow-sm relative scroll-mt-24 bg-gradient-to-br from-accent-3-50/30 to-white">
                            <div className="inline-flex p-3 bg-accent-3-100 text-accent-3-600 rounded-xl mb-6"><Lock size={24} /></div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">§4 Empfehlung für maximale Privatsphäre</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Wenn Sie Koreki mit echten Daten nutzen möchten, empfehlen wir:</p>
                            <div className="bg-accent-3-50 border-l-4 border-accent-3-500 p-6 rounded-r-2xl my-6">
                                <strong className="text-accent-3-700 block mb-2 font-bold">Self-Hosting & Lokale Nutzung</strong>
                                <p className="text-accent-3-900 text-sm leading-relaxed m-0">Laden Sie den Quellcode auf GitHub herunter und betreiben Sie Koreki auf Ihrem eigenen Rechner oder Server. Nur so haben Sie die volle Kontrolle über den Datenfluss.</p>
                            </div>
                        </section>

                        <section id="rights" className="bg-white rounded-3xl p-10 border border-border shadow-sm relative scroll-mt-24">
                            <h2 className="text-2xl font-bold text-foreground mb-6">§5 Ihre Rechte</h2>
                            <p className="leading-relaxed text-muted-foreground mb-4">Sie haben jederzeit das Recht auf Auskunft über Ihre gespeicherten Daten (E-Mail) oder deren Löschung. Schreiben Sie mir dazu einfach eine E-Mail an {LEGAL_CONFIG.contact.email}.</p>
                        </section>
                    </div>
                </main>
            </div>
        </MarketingLayout>
    );
}
