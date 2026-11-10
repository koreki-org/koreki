import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isDesktopTarget } from '@/lib/env-context';
import { installiereNeueVersion, useDesktopUpdateStore } from '@/lib/desktop-update';
import { useBatchStore } from '@/hooks/store/useBatchStore';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';

/**
 * Aktualisierung der Desktop-App in den Einstellungen.
 *
 * Die Warnung steht hier im Abschnitt und nicht in einer Rueckfrage: die
 * Einstellungen sind selbst ein Dialog, und Dialoge oeffnen keine Dialoge
 * (`koreki-design-system` §1.2). Sind Arbeiten geladen, sagt der Abschnitt,
 * dass der Neustart sie loescht, und der Knopf heisst entsprechend.
 */
export const NeueVersionSection: React.FC<{ aktuelleVersion: string }> = ({ aktuelleVersion }) => {
    const zustand = useDesktopUpdateStore((s) => s.zustand);
    // Beide Hooks immer aufrufen — ein `||` dazwischen wuerde den zweiten
    // je nach Zustand ueberspringen.
    const schuelerArbeiten = useBatchStore((s) => s.batchFiles.length > 0);
    const musterloesung = useDashboardStore((s) => s.tasksLayout.length > 0);
    const arbeitenGeladen = schuelerArbeiten || musterloesung;

    if (!isDesktopTarget() || zustand.art === 'unbekannt' || zustand.art === 'aktuell') return null;

    return (
        <section className="mb-8 rounded-lg bg-muted p-4" aria-labelledby="neue-version-titel">
            <h3 id="neue-version-titel" className="text-sm font-semibold text-foreground">
                Neue Version verfügbar
            </h3>
            <p className="mt-1 text-sm/relaxed text-muted-foreground">
                Koreki {zustand.version} ist bereit. Du hast {aktuelleVersion}.
                Zum Aktualisieren startet Koreki neu.
            </p>

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
                        variant={arbeitenGeladen ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => void installiereNeueVersion()}
                    >
                        {arbeitenGeladen ? 'Trotzdem aktualisieren' : 'Jetzt aktualisieren'}
                    </Button>
                )}
            </div>
        </section>
    );
};
