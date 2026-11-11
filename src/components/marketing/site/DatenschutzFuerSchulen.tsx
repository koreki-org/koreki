import React from 'react';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { isLocalInstance } from '@/lib/env-context';
import { openExternal } from '@/lib/os-utils';
import { Abschnitt, AbschnittsKopf, Kachel, NACH_KOPF, RASTER } from './Bausteine';

/*
 * Der Abschnitt fuer Schulleitung und Datenschutzbeauftragte (11.11.2026).
 *
 * Die Langfassung mit Vorlage fuers Verarbeitungsverzeichnis und Bausteinen
 * fuer die Folgenabschaetzung steht in docs/user-guides/datenschutz-paket-schulen.md.
 * Wer hier etwas aendert, zieht sie mit — und umgekehrt.
 *
 * Jede Aussage steht im Code oder in Mittwalds oeffentlicher Doku zum AI Hosting
 * (marketing-communication §3). Keine regulatorische Selbsteinstufung.
 */

export const DATENSCHUTZ_ANKER = 'schulen';
const DATENSCHUTZ_PFAD = `/security#${DATENSCHUTZ_ANKER}`;

/**
 * Verweis auf diesen Abschnitt — fuer die Hinweise „Bitte beachte die
 * Datenschutzrichtlinien deiner Schule“, die vorher nirgendwohin fuehrten.
 *
 * In der installierten App gibt es die Marketing-Seite nicht als Ziel
 * (dort ist /desktop der Startbildschirm); der Verweis oeffnet sie dann im
 * Browser, so wie der GitHub-Link in der Fusszeile.
 */
export const SchulDatenschutzLink: React.FC<{ className?: string }> = ({ className }) => {
    const lokal = isLocalInstance();
    const ziel = lokal ? `https://koreki.org${DATENSCHUTZ_PFAD}` : DATENSCHUTZ_PFAD;
    return (
        <a
            href={ziel}
            onClick={lokal ? e => { e.preventDefault(); void openExternal(ziel); } : undefined}
            className={cn("inline-flex items-center gap-1 font-semibold text-primary hover:underline", className)}
        >
            Was deine Schule dafür braucht <ArrowRight size={14} />
        </a>
    );
};

const VORLAGEN_URL = 'https://github.com/koreki-org/koreki/blob/main/docs/user-guides/datenschutz-paket-schulen.md';

const VERSIONEN = [
    {
        name: 'Koreki Desktop',
        zeilen: [
            ['Läuft auf', 'dem Rechner der Lehrkraft'],
            ['Anmeldung', 'am Rechner, mit dem eigenen Benutzerkonto'],
            ['KI-Schlüssel', 'im Tresor des Betriebssystems'],
            ['Erfahrungsschatz', 'auf dem Rechner'],
        ],
    },
    {
        name: 'Community Edition',
        zeilen: [
            ['Läuft auf', 'einem Server der Schule'],
            ['Anmeldung', 'über Keycloak, ein Konto je Lehrkraft'],
            ['KI-Schlüssel', 'in der Server-Konfiguration'],
            ['Erfahrungsschatz', 'auf dem Server, getrennt je Lehrkraft'],
        ],
    },
];

const FUER_BEIDE = [
    'Die Arbeiten gehen nur an den KI-Zugang, den deine Schule bei Mittwald bucht. Den Auftragsverarbeitungsvertrag schließt die Schule direkt mit Mittwald.',
    'Mittwald speichert die Inhalte nach eigener Angabe nicht und trainiert nicht damit. Protokolliert werden Adresse, Schlüssel, Zeitpunkt und Umfang der Anfrage.',
    'Koreki selbst bekommt keine Schülerdaten. Ein Vertrag mit Koreki ist nicht nötig.',
    'Arbeiten und Vorschläge liegen nur im Arbeitsspeicher. Gespeichert wird nur, was die Lehrkraft exportiert oder ausdrücklich in den Erfahrungsschatz übernimmt.',
    'Die Note setzt immer die Lehrkraft. Vor jedem Export bestätigt sie, dass sie die Vorschläge geprüft hat.',
];

const SCHRITTE = [
    'KI-Zugang bei Mittwald buchen und den Auftragsverarbeitungsvertrag im Kundenportal abschließen.',
    'Das Verarbeitungsverzeichnis ergänzen.',
    'Mit den Datenschutzbeauftragten klären, ob eine Datenschutz-Folgenabschätzung nötig ist.',
    'Landesvorgaben prüfen: Freigabe durch Land oder Schulträger, Beteiligung des Personalrats.',
    'Eltern und Schüler in den Datenschutzhinweisen der Schule informieren.',
    'Lehrkräfte einweisen: Betriebsanleitung lesen, Namen auf dem Blatt schwärzen oder vermeiden.',
    'Geräte mit Anmeldung und verschlüsselter Festplatte nutzen; in der Community Edition die Anmeldung über Keycloak einschalten.',
];

export function DatenschutzFuerSchulen() {
    return (
        <Abschnitt id={DATENSCHUTZ_ANKER}>
            <AbschnittsKopf
                kicker="Für Schulleitung und Datenschutz"
                titel="Was deine Schule wissen muss."
                text="Für Koreki Desktop und die Community Edition mit dem KI-Zugang von Mittwald, den deine Schule bucht."
            />

            <div className={cn(NACH_KOPF, RASTER, "md:grid-cols-2")}>
                {VERSIONEN.map(v => (
                    <Kachel key={v.name}>
                        <h3 className="text-xl font-semibold tracking-tight text-foreground">{v.name}</h3>
                        <dl className="mt-4 space-y-3 text-sm">
                            {v.zeilen.map(([was, wo]) => (
                                <div key={was} className="grid grid-cols-[8.5rem_1fr] gap-3">
                                    <dt className="text-muted-foreground">{was}</dt>
                                    <dd className="text-foreground">{wo}</dd>
                                </div>
                            ))}
                        </dl>
                    </Kachel>
                ))}
            </div>

            <div className={cn("mt-6", RASTER, "lg:grid-cols-2")}>
                <Kachel>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">Für beide gilt</h3>
                    <ul className="mt-4 space-y-3 text-sm/relaxed text-muted-foreground">
                        {FUER_BEIDE.map(p => (
                            <li key={p} className="flex gap-2.5"><Check size={16} className="text-primary shrink-0 mt-1" />{p}</li>
                        ))}
                    </ul>
                </Kachel>
                <Kachel>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">In sieben Schritten startklar</h3>
                    <ol className="mt-4 space-y-3 text-sm/relaxed text-muted-foreground list-decimal pl-5 marker:text-primary marker:font-semibold">
                        {SCHRITTE.map(s => <li key={s}>{s}</li>)}
                    </ol>
                    <a
                        href={VORLAGEN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: 'outline' }), "mt-6 h-11")}
                    >
                        <FileText size={17} /> Vorlagen für Verzeichnis und Folgenabschätzung
                    </a>
                </Kachel>
            </div>

            <p className="mt-6 text-xs/relaxed text-muted-foreground max-w-3xl">
                Keine Rechtsberatung. Schulrecht ist Landesrecht; die Prüfung durch die Datenschutzbeauftragten deiner Schule ersetzt diese Übersicht nicht.
            </p>
        </Abschnitt>
    );
}
