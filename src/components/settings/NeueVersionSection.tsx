import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { betriebsart, installiereNeueVersion, useNeueVersionStore, type UpdateZustand } from '@/lib/neue-version';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';

/**
 * Neue Version in den Einstellungen — Desktop installiert auf Klick,
 * Community zeigt den Befehl fuer den Server.
 *
 * Die Warnung (Desktop) steht hier im Abschnitt und nicht in einer Rueckfrage:
 * die Einstellungen sind selbst ein Dialog, und Dialoge oeffnen keine Dialoge
 * (`koreki-design-system` §1.2). Sind Arbeiten geladen, sagt der Abschnitt,
 * dass der Neustart sie loescht, und der Knopf heisst entsprechend.
 */
export const NeueVersionSection: React.FC<{ aktuelleVersion: string }> = ({ aktuelleVersion }) => {
    const zustand = useNeueVersionStore((s) => s.zustand);
    const art = betriebsart();

    if (!art || zustand.art === 'unbekannt' || zustand.art === 'aktuell') return null;

    return (
        <section className="mb-8 rounded-lg bg-muted p-4" aria-labelledby="neue-version-titel">
            <h3 id="neue-version-titel" className="text-sm font-semibold text-foreground">
                Neue Version verfügbar
            </h3>
            <p className="mt-1 text-sm/relaxed text-muted-foreground">
                Koreki {zustand.version} ist bereit. Du hast {aktuelleVersion}.
            </p>
            {art === 'desktop' ? <DesktopAktualisieren zustand={zustand} /> : <CommunityAktualisieren />}
        </section>
    );
};

const DesktopAktualisieren: React.FC<{ zustand: UpdateZustand }> = ({ zustand }) => {
    // Beide Hooks immer aufrufen — ein `||` dazwischen wuerde den zweiten
    // je nach Zustand ueberspringen.
    const schuelerArbeiten = useBatchStore((s) => s.batchFiles.length > 0);
    const musterloesung = useDashboardStore((s) => s.tasksLayout.length > 0);
    const arbeitenGeladen = schuelerArbeiten || musterloesung;

    return (
        <>
            <p className="text-sm/relaxed text-muted-foreground">Zum Aktualisieren startet Koreki neu.</p>

            {arbeitenGeladen && zustand.art === 'verfuegbar' && (
                <p className="mt-2 text-sm/relaxed text-warning">
                    Die geladenen Arbeiten gehen beim Neustart verloren. Speichere sie
                    vorher als .koreki-Datei, wenn du später weitermachen willst.
                </p>
            )}

            {zustand.art === 'fehler' && (
                <p className="mt-2 text-sm/relaxed text-destructive">
                    Die Aktualisierung hat nicht geklappt: {zustand.meldung}
                </p>
            )}

            <div className="mt-3">
                {zustand.art === 'laedt' ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 size={16} className="animate-spin" />
                        Wird geladen{zustand.prozent !== null ? ` … ${zustand.prozent} %` : ' …'}
                    </p>
                ) : (
                    <Button
                        variant={arbeitenGeladen ? 'destructive' : 'erfolg'}
                        size="sm"
                        onClick={() => void installiereNeueVersion()}
                    >
                        {arbeitenGeladen ? 'Trotzdem aktualisieren' : 'Jetzt aktualisieren'}
                    </Button>
                )}
            </div>
        </>
    );
};

const INSTALLER = 'https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/install';

/** Koreki laeuft hier in Docker und kann seinen eigenen Container nicht
 *  ersetzen. Aktualisiert wird auf dem Server, mit dem Installer. */
const CommunityAktualisieren: React.FC = () => (
    <>
        <p className="mt-2 text-sm/relaxed text-muted-foreground">
            Führe auf dem Server im Koreki-Ordner den Installer erneut aus und wähle
            dieselbe Variante und dann „Update“. Einstellungen und Schlüssel bleiben erhalten.
            Während des Neustarts ist Koreki kurz nicht erreichbar.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Linux / macOS</p>
        <code className="mt-1 block break-all rounded-md bg-card p-2 font-mono text-xs text-foreground">
            curl -fsSL {INSTALLER}/install.sh | bash
        </code>
        <p className="mt-2 text-xs text-muted-foreground">Windows (PowerShell)</p>
        <code className="mt-1 block break-all rounded-md bg-card p-2 font-mono text-xs text-foreground">
            irm {INSTALLER}/install.ps1 | iex
        </code>
    </>
);
