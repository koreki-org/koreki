import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, File, FileCode, FileImage, FileText, Folder, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { useDialogA11y, useEscapeKey } from '@/hooks/useDialogA11y';
import { standardAuswahl } from '@/lib/zip-abgaben';
import type { ZipAuswahl, ZipBefund, ZipDatei, ZipPruefling } from '@/lib/zip-abgaben';
import { ordnerGruppen, ordnerStand, setzeDatei, setzeOrdner, zahlUebernommen } from '@/lib/zip-pruefung';
import type { OrdnerGruppe } from '@/lib/zip-pruefung';

/**
 * „Abgaben pruefen" — je Pruefling die Dateien des ZIPs als Baum, mit Haken.
 * 🗂️
 *
 * Ersetzt die lange Meldung nach dem ZIP-Upload (15.11.2026). Vorgeschlagen ist,
 * was nach eigener Abgabe aussieht; Vorlagen sind abgewaehlt, nicht Lesbares ist
 * gesperrt und nennt den Grund. Ein Ordner-Haken gilt fuer alle Prueflinge
 * (`setzeOrdner`), ein Datei-Haken nur fuer den einen. Erst „uebernehmen" legt
 * die Arbeiten an — vorher ist nichts zusammengefuegt.
 */

interface ZipPruefDialogProps {
    befund: ZipBefund;
    onUebernehmen: (auswahl: ZipAuswahl) => void;
    onAbbrechen: () => void;
}

const TITEL_ID = 'zip-pruefung-titel';

const HINWEIS: Record<ZipDatei['art'], string | null> = {
    abgabe: null,
    vorlage: 'bei allen gleich (Vorlage)',
    unlesbar: 'Format nicht lesbar'
};

function Symbol({ name }: { name: string }) {
    if (/\.(png|jpe?g)$/i.test(name)) return <FileImage size={16} className="shrink-0 text-muted-foreground" />;
    if (/\.(pdf|txt|md)$/i.test(name)) return <FileText size={16} className="shrink-0 text-muted-foreground" />;
    if (/\.[a-z0-9]+$/i.test(name) && !/\.(docx?|xlsx?|odt|ods|odp|pptx?|zip|html?)$/i.test(name)) {
        return <FileCode size={16} className="shrink-0 text-muted-foreground" />;
    }
    return <File size={16} className="shrink-0 text-muted-foreground" />;
}

interface GruppeProps {
    gruppe: OrdnerGruppe;
    gewaehlt: string[];
    onOrdner: (an: boolean) => void;
    onDatei: (pfad: string, an: boolean) => void;
}

function Gruppe({ gruppe, gewaehlt, onOrdner, onDatei }: GruppeProps) {
    const stand = ordnerStand(gruppe, gewaehlt);
    const waehlbar = gruppe.dateien.some(d => d.art !== 'unlesbar');
    return (
        <div className="py-1">
            <label className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                <Checkbox
                    checked={stand === 'alle'}
                    ref={el => { if (el) el.indeterminate = stand === 'teil'; }}
                    disabled={!waehlbar}
                    onChange={e => onOrdner(e.target.checked)}
                    aria-label={`Ordner ${gruppe.anzeige} bei allen Prüflingen`}
                />
                <Folder size={16} className="shrink-0" />
                <span className="truncate font-medium text-foreground">{gruppe.anzeige}</span>
                <span className="shrink-0 text-xs">· gilt für alle Prüflinge</span>
            </label>
            {gruppe.dateien.map(d => (
                <label key={d.pfad} className="flex items-center gap-2 py-0.5 pl-6 text-sm">
                    <Checkbox
                        checked={gewaehlt.includes(d.pfad)}
                        disabled={d.art === 'unlesbar'}
                        onChange={e => onDatei(d.pfad, e.target.checked)}
                    />
                    <Symbol name={d.datei.name} />
                    <span className={d.art === 'abgabe' ? 'truncate text-foreground' : 'truncate text-muted-foreground'}>{d.datei.name}</span>
                    {HINWEIS[d.art] && <span className="shrink-0 text-xs text-muted-foreground">· {HINWEIS[d.art]}</span>}
                </label>
            ))}
        </div>
    );
}

interface PrueflingProps {
    pruefling: ZipPruefling;
    gewaehlt: string[];
    offen: boolean;
    onUmschalten: () => void;
    onOrdner: (ordner: string, an: boolean) => void;
    onDatei: (pfad: string, an: boolean) => void;
}

function Pruefling({ pruefling, gewaehlt, offen, onUmschalten, onOrdner, onDatei }: PrueflingProps) {
    const weggelassen = pruefling.dateien.length - gewaehlt.length;
    return (
        <div className="border-b border-border last:border-b-0">
            <Button
                variant="ghost"
                onClick={onUmschalten}
                aria-expanded={offen}
                className="h-auto w-full justify-start gap-2 rounded-none px-3 py-2.5 hover:bg-foreground/5"
            >
                {offen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="truncate font-semibold text-foreground">{pruefling.name}</span>
                <span className={gewaehlt.length === 0 ? 'ml-auto shrink-0 text-xs text-destructive' : 'ml-auto shrink-0 text-xs text-muted-foreground'}>
                    {gewaehlt.length === 0 ? 'wird nicht übernommen' : `${gewaehlt.length} übernommen · ${weggelassen} weggelassen`}
                </span>
            </Button>
            {offen && (
                <div className="px-3 pb-2">
                    {ordnerGruppen(pruefling).map(g => (
                        <Gruppe
                            key={g.ordner}
                            gruppe={g}
                            gewaehlt={gewaehlt}
                            onOrdner={an => onOrdner(g.ordner, an)}
                            onDatei={onDatei}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export const ZipPruefDialog: React.FC<ZipPruefDialogProps> = ({ befund, onUebernehmen, onAbbrechen }) => {
    const { mounted, dialogRef } = useDialogA11y<HTMLDivElement>(true);
    useEscapeKey(true, onAbbrechen);
    const vorschlag = useMemo(() => standardAuswahl(befund), [befund]);
    const [auswahl, setAuswahl] = useState<ZipAuswahl>(vorschlag);
    const [offen, setOffen] = useState<string | null>(befund.prueflinge[0]?.name ?? null);
    const anzahl = zahlUebernommen(auswahl);

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-background/60 backdrop-blur-glass animate-overlay-in"
            onClick={onAbbrechen}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={TITEL_ID}
                tabIndex={-1}
                data-testid="zip-pruefung"
                className="relative flex w-full max-w-[640px] max-h-[90dvh] flex-col bg-card rounded-hero p-6 shadow-glass border border-border animate-dialog-in focus:outline-none"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 id={TITEL_ID} className="text-xl font-semibold text-foreground">Abgaben prüfen</h2>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            {befund.quelle} · {befund.prueflinge.length} Prüfling(e)
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onAbbrechen} aria-label="Schließen" className="shrink-0 hover:bg-foreground/5">
                        <X size={20} />
                    </Button>
                </div>

                <div className="mt-4 rounded-lg bg-muted p-3 text-sm/relaxed text-foreground">
                    Angehakt ist, was nach eigener Abgabe aussieht. Dateien, die bei allen gleich sind (Vorlagen),
                    sind abgewählt; nicht lesbare Formate lassen sich nicht wählen.
                    {befund.doppelt.length > 0 && <> Doppelt im ZIP, nur einmal berücksichtigt: {befund.doppelt.join(', ')}.</>}
                    {befund.ausserhalb.length > 0 && <> In keinem Prüflingsordner, nicht berücksichtigt: {befund.ausserhalb.join(', ')}.</>}
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
                    {befund.prueflinge.map(p => (
                        <Pruefling
                            key={p.name}
                            pruefling={p}
                            gewaehlt={auswahl[p.name] ?? []}
                            offen={offen === p.name}
                            onUmschalten={() => setOffen(o => (o === p.name ? null : p.name))}
                            onOrdner={(ordner, an) => setAuswahl(a => setzeOrdner(befund, a, ordner, an))}
                            onDatei={(pfad, an) => setAuswahl(a => setzeDatei(a, p.name, pfad, an))}
                        />
                    ))}
                </div>

                <div className="mt-5 flex justify-end gap-3">
                    <Button variant="outline" onClick={onAbbrechen}>Abbrechen</Button>
                    <Button data-testid="zip-uebernehmen" onClick={() => onUebernehmen(auswahl)} disabled={anzahl === 0}>
                        {anzahl === 1 ? '1 Prüfling übernehmen' : `${anzahl} Prüflinge übernehmen`}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
