import React from 'react';
import Link from 'next/link';
import { Github, Heart } from 'lucide-react';
import { isLocalInstance } from '@/lib/env-context';
import { openExternal } from '@/lib/os-utils';

const MinimalFooter: React.FC = () => {
    return (
        <footer className="mt-auto py-6 px-8 border-t border-border/50 bg-background/40 backdrop-blur-md">
            <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span>&copy; {new Date().getFullYear()} Koreki. Open Source. Developed with</span>
                    <Heart size={10} className="text-primary fill-primary" />
                    <span>in Germany.</span>
                </div>
                <div className="flex items-center gap-8">
                    {/*
                      * Impressum und Datenschutz oeffnen in einem NEUEN Tab — die
                      * Betriebsanleitung darunter ausdruecklich NICHT.
                      *
                      * Diese Fusszeile steht unter einer laufenden Korrektur, und
                      * Schuelerdaten leben allein im Arbeitsspeicher
                      * (`architectural-vision` §2): Was beim Verlassen der Seite
                      * verloren geht, ist weg. Ein neuer Tab laesst die Korrektur
                      * unberuehrt — hier ist er also richtig. Diese beiden Verweise
                      * erscheinen ohnehin nur im SaaS, also in einem echten Browser.
                      */}
                    {!isLocalInstance() && (
                        <>
                            <Link href="/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Impressum</Link>
                            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Datenschutz</Link>
                        </>
                    )}
                    {/*
                     * Betriebsanleitung — nur auf lokalen Instanzen.
                     *
                     * Artikel 13 der KI-Verordnung verlangt, dass die Betriebsanleitung dem
                     * System BEILIEGT. Sie wird zwar in jeder Betriebsart ausgeliefert
                     * (`src/legal/`, gerendert unter /app/compliance/manual), war bis zum
                     * 03.09.2026 aber nur aus dem AVV-Ablauf heraus verlinkt — und der
                     * existiert allein im SaaS. Wer Koreki selbst betreibt, fand die Seite
                     * nicht: Sie lag bei, ohne auffindbar zu sein.
                     *
                     * Im SaaS bleibt der Weg über den AVV-Ablauf; dort wird die Anleitung
                     * beim Onboarding der Schule ausdrücklich vorgelegt und quittiert.
                     */}
                    {/*
                      * KEIN `target="_blank"` am Verweis darunter — und das ist der
                      * Unterschied zu den beiden Verweisen oben.
                      *
                      * Dieser Link erscheint nur auf lokalen Instanzen, und dazu
                      * gehoert die Desktop-App. Dort laeuft die Oberflaeche in EINEM
                      * Tauri-Fenster: `src-tauri/src/lib.rs` registriert keinen
                      * Handler fuer neue Fenster, und die Shell-Erweiterung oeffnet
                      * nur externe Adressen im System-Browser — eine Seite aus dem
                      * eigenen Buendel kann sie nicht. Ein `_blank` fuehrt dort also
                      * ins Leere: Der Knopf tut nichts, und das ist schlimmer als der
                      * Weg, den er ersetzen sollte.
                      *
                      * Die Korrektur ist trotzdem gesichert, auf zwei Wegen: Die
                      * Navigation innerhalb von Koreki laeuft clientseitig und haelt
                      * den Zustand (am 10.11.2026 im Browser nachgemessen), und fuer
                      * das echte Neuladen fragt `useVerlassenWarnung`.
                      */}
                    {isLocalInstance() && (
                        <Link href="/app/compliance/manual" className="hover:text-foreground transition-colors">
                            Betriebsanleitung
                        </Link>
                    )}
                    {/*
                      * Externe Adresse, deshalb ueber `openExternal` statt ueber
                      * `target="_blank"`: In der Desktop-App nimmt das Fenster kein
                      * `_blank` an (s. Begruendung an der Betriebsanleitung oben), die
                      * Shell-Erweiterung dagegen reicht genau solche Adressen an den
                      * System-Browser weiter. Das `href` bleibt stehen, damit
                      * Rechtsklick und „Adresse kopieren" weiter funktionieren.
                      */}
                    <a
                        href="https://github.com/koreki-org/koreki"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => { e.preventDefault(); void openExternal('https://github.com/koreki-org/koreki'); }}
                        className="flex items-center gap-2 hover:text-foreground transition-colors"
                    >
                        <Github size={12} />
                        GitHub
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default MinimalFooter;
