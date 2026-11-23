import React from 'react';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { isLocalInstance } from '@/lib/env-context';
import { openExternal } from '@/lib/os-utils';
import { DATENSCHUTZ_WORD_URL } from '@/lib/word/datenschutz-pfade';
import { Abschnitt, AbschnittsKopf, Kachel, NACH_KOPF, RASTER } from './Bausteine';

/*
 * Der Abschnitt fuer Schulleitung und Datenschutzbeauftragte (11.11.2026).
 *
 * Die Langfassung mit Vorlage fuers Verarbeitungsverzeichnis und Bausteinen
 * fuer die Folgenabschaetzung steht in docs/user-guides/datenschutz-paket-schulen.md.
 * Wer hier etwas aendert, zieht sie mit — und umgekehrt.
 *
 * Jede Aussage steht im Code (marketing-communication §3). Anbieterneutral
 * (23.11.2026): Was ein KI-Anbieter speichert oder protokolliert, steht in
 * seinen eigenen Angaben, nicht hier. Sachlich die Schritte, ohne
 * „das macht deine Schule“ — Lehrkräfte sollen selbst loslegen können.
 * Keine regulatorische Selbsteinstufung.
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
            Datenschutz für Schulen <ArrowRight size={14} />
        </a>
    );
};

const VORLAGEN_GITHUB = 'https://github.com/koreki-org/koreki/blob/main/docs/user-guides/datenschutz-paket-schulen.md';

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
    'Die Arbeiten gehen nur an die KI, die in Koreki eingestellt ist.',
    'Vor dem Senden nennt Koreki den Empfänger der Daten.',
    'Koreki selbst bekommt keine Schülerdaten. Ein Vertrag mit Koreki ist nicht nötig.',
    'Arbeiten und Vorschläge liegen nur im Arbeitsspeicher. Gespeichert wird nur, was exportiert oder ausdrücklich in den Erfahrungsschatz übernommen wird.',
    'Die Note setzt immer die Lehrkraft. Vor jedem Export wird bestätigt, dass die Vorschläge geprüft sind.',
];

const SCHRITTE = [
    'KI wählen: lokal über Ollama oder ein Zugang bei Mittwald (Deutschland) oder Mistral (Frankreich).',
    'Bei einem Anbieter: Vertrag zur Auftragsverarbeitung abschließen.',
    'Verarbeitungsverzeichnis ergänzen.',
    'Datenschutzbeauftragte einbeziehen.',
    'Eltern und Schüler informieren.',
];

export function DatenschutzFuerSchulen() {
    return (
        <Abschnitt id={DATENSCHUTZ_ANKER}>
            <AbschnittsKopf
                kicker="Für Lehrkräfte, Schulleitung und Datenschutz"
                titel="Datenschutz in der Schule."
                text="Für Koreki Desktop und die Community Edition."
            />
            <p className="mt-4 text-sm/relaxed text-muted-foreground max-w-2xl">
                Mit einem lokalen Modell über Ollama verlassen die Arbeiten den Rechner bzw. das Schulnetz nicht.
            </p>

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
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">In fünf Schritten startklar</h3>
                    <ol className="mt-4 space-y-3 text-sm/relaxed text-muted-foreground list-decimal pl-5 marker:text-primary marker:font-semibold">
                        {SCHRITTE.map(s => <li key={s}>{s}</li>)}
                    </ol>
                    <a
                        href={DATENSCHUTZ_WORD_URL}
                        download
                        className={cn(buttonVariants({ variant: 'outline' }), "mt-6 h-11")}
                    >
                        <FileText size={17} /> Vorlagen als Word-Datei
                    </a>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Mit Eintrag fürs Verarbeitungsverzeichnis und Bausteinen für die Folgenabschätzung. Auch{' '}
                        <a href={VORLAGEN_GITHUB} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">als Webseite</a>.
                    </p>
                </Kachel>
            </div>

            <p className="mt-6 text-xs/relaxed text-muted-foreground max-w-3xl">
                Keine Rechtsberatung. Schulrecht ist Landesrecht; die Prüfung durch die Datenschutzbeauftragten deiner Schule ersetzt diese Übersicht nicht.
            </p>
        </Abschnitt>
    );
}
