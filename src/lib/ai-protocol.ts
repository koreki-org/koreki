import type { AppSettings } from '@/types';

/**
 * Protokoll der KI-Bewertungen.
 * 📓
 *
 * Art. 12 EU-KI-VO verlangt, dass ein Hochrisiko-System die *automatische*
 * Aufzeichnung von Ereignissen technisch ermoeglicht. Ein Format schreibt die
 * Norm nicht vor — eine Textdatei genuegt. Die ausfuehrliche Pflichtliste in
 * Art. 12 Abs. 3 gilt ausdruecklich nur fuer biometrische Fernidentifizierung
 * (Anhang III Nr. 1 lit. a) und damit nicht fuer Koreki. Massgeblich sind hier
 * allein die drei Zwecke aus Abs. 2: Risiken erkennen, Beobachtung nach
 * Inverkehrbringen, Ueberwachung des Betriebs.
 *
 * Zwei Entwurfsentscheidungen ergeben sich daraus:
 *
 * 1. ANHAENGEND. Ein Eintrag wird geschrieben und nie wieder geaendert. Die
 *    Korrektur durch die Lehrkraft ist ein eigener Eintrag, keine Aenderung am
 *    alten. Dadurch entsteht die Abweichung zwischen KI-Vorschlag und Endnote
 *    von selbst aus zwei Zeilen — und ein Protokoll, das man nachtraeglich
 *    umschreiben kann, waere ohnehin wertlos.
 *
 * 2. KEIN SCHUELERTEXT. Die Pflicht, Eingabedaten aufzuzeichnen, steht in
 *    Abs. 3 und gilt hier nicht. Damit bleibt die Zusage des AVV unberuehrt,
 *    dass keine Schuelerarbeiten gespeichert werden. Protokolliert wird die
 *    Nummer der Arbeit, nie der Name.
 */

export type ProtokollEreignis = 'bewertung' | 'korrektur' | 'fehler' | 'bestaetigt';

export interface ProtokollEintrag {
    zeit: string;
    ereignis: ProtokollEreignis;
    schuelerNr: number;
    aufgabe: string;
    maxPunkte: number | null;
    punkte: number | null;
    /** Nur bei 'korrektur': der Wert, den die KI vorgeschlagen hatte. */
    punkteVorher?: number | null;
    anbieter: string;
    modell: string;
    appVersion: string;
    dauerMs?: number;
    fehler?: string;
}

/**
 * Der kleinste gemeinsame Nenner der beiden Aufgaben-Typen des Projekts. Beide
 * beschreiben dieselben Objekte, aber der eine laesst die Punkte auch als
 * Zeichenkette zu — die Oberflaeche reicht Eingabefelder durch. Deshalb hier
 * ein Minimaltyp statt einer Umdeutung.
 */
export interface PunktStand {
    name?: string;
    pointsObtained?: number | string;
    maxPoints?: number | string;
}

function alsZahl(wert: number | string | undefined): number | null {
    if (typeof wert === 'number') return Number.isFinite(wert) ? wert : null;
    if (typeof wert === 'string' && wert.trim() !== '') {
        const zahl = Number(wert.replace(',', '.'));
        return Number.isFinite(zahl) ? zahl : null;
    }
    return null;
}

interface Herkunft {
    anbieter: string;
    modell: string;
    appVersion: string;
}

/**
 * Welches Modell hat geantwortet? Protokolliert wird die konfigurierte Kennung.
 *
 * Seit dem 27.08.2026 sind das feste Versionen (`mistral-medium-2604` statt
 * `mistral-medium-latest`, siehe `lib/ai/constants.ts`), erzwungen durch
 * `tests/unit/model-pinning-governance.test.ts`. Damit benennt die Zeile
 * tatsaechlich das Modell, das geantwortet hat — vorher war sie bei
 * beweglichen Kennungen nur ein Hinweis.
 *
 * Ausnahme bleibt der lokale Betrieb: Welches Modell hinter einer
 * Ollama-Kennung steckt, bestimmt der Betreiber auf seinem Rechner.
 */
export function ermittleHerkunft(settings: AppSettings): Herkunft {
    const anbieter = settings.provider || 'unbekannt';
    let modell = 'unbekannt';
    if (anbieter === 'ollama') {
        modell = settings.customOllamaModel || settings.ollamaModel || 'unbekannt';
    } else if (anbieter === 'openai-compatible') {
        modell = settings.openaiModel || 'unbekannt';
    } else {
        modell = settings.model || 'unbekannt';
    }
    return {
        anbieter,
        modell,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'unbekannt'
    };
}

function grundgeruest(schuelerNr: number, herkunft: Herkunft, ereignis: ProtokollEreignis) {
    return {
        zeit: new Date().toISOString(),
        ereignis,
        schuelerNr,
        anbieter: herkunft.anbieter,
        modell: herkunft.modell,
        appVersion: herkunft.appVersion
    };
}

/** Ein Eintrag je bewerteter Aufgabe, geschrieben beim Abschluss des Laufs. */
export function erzeugeBewertungsEintraege(
    schuelerNr: number,
    tasks: PunktStand[],
    settings: AppSettings,
    dauerMs: number
): ProtokollEintrag[] {
    const herkunft = ermittleHerkunft(settings);
    return tasks.map(task => ({
        ...grundgeruest(schuelerNr, herkunft, 'bewertung'),
        aufgabe: task.name || '—',
        maxPunkte: alsZahl(task.maxPoints),
        punkte: alsZahl(task.pointsObtained),
        dauerMs: Math.round(dauerMs)
    }));
}

/** Ein Lauf, der nicht zu einer Bewertung gefuehrt hat. Gehoert ins Protokoll,
 *  weil gehaeufte Fehlschlaege genau das Risikosignal aus Art. 12 Abs. 2 lit. a sind. */
export function erzeugeFehlerEintrag(
    schuelerNr: number,
    settings: AppSettings,
    fehler: string
): ProtokollEintrag {
    return {
        ...grundgeruest(schuelerNr, ermittleHerkunft(settings), 'fehler'),
        aufgabe: '—',
        maxPunkte: null,
        punkte: null,
        fehler
    };
}

/**
 * Eintraege fuer die Korrekturen der Lehrkraft — aber nur dort, wo sich die
 * Punktzahl wirklich geaendert hat. Reine Textaenderungen am Feedback erzeugen
 * keinen Eintrag: sie tragen keinen der drei Zwecke aus Abs. 2 und wuerden das
 * Protokoll bei jedem Tastendruck fluten.
 */
export function erzeugeKorrekturEintraege(
    schuelerNr: number,
    vorher: PunktStand[],
    nachher: PunktStand[],
    settings: AppSettings
): ProtokollEintrag[] {
    const herkunft = ermittleHerkunft(settings);
    const eintraege: ProtokollEintrag[] = [];
    for (const neu of nachher) {
        const alt = vorher.find(t => t.name === neu.name);
        if (!alt) continue;
        const punkteNeu = alsZahl(neu.pointsObtained);
        const punkteAlt = alsZahl(alt.pointsObtained);
        if (punkteNeu === punkteAlt) continue;
        eintraege.push({
            ...grundgeruest(schuelerNr, herkunft, 'korrektur'),
            aufgabe: neu.name || '—',
            maxPunkte: alsZahl(neu.maxPoints) ?? alsZahl(alt.maxPoints),
            punkte: punkteNeu,
            punkteVorher: punkteAlt
        });
    }
    return eintraege;
}

/**
 * Die Lehrkraft bestaetigt, dass sie die Bewertungen dieses Stapels geprueft hat.
 *
 * EIN Eintrag fuer den ganzen Stapel, nicht einer je Arbeit. Art. 14 verlangt,
 * dass wirksame Aufsicht MOEGLICH ist und dass der Aufbau der Automation Bias
 * entgegenwirkt — nicht, dass der Anbieter die Lehrkraft ueberwacht. Wer jede
 * Arbeit einzeln abhaken muesste, klickt bei 25 Arbeiten 25 Mal, und ein
 * mechanischer Klick belegt nichts, was ein bewusster nicht auch belegt.
 * Vorbild ist die Bestaetigung vor der Bilderkennung.
 */
export function erzeugeBestaetigungsEintrag(
    anzahlArbeiten: number,
    settings?: AppSettings
): ProtokollEintrag {
    return {
        ...grundgeruest(0, ermittleHerkunft(settings || {}), 'bestaetigt'),
        aufgabe: `${anzahlArbeiten} ${anzahlArbeiten === 1 ? 'Arbeit' : 'Arbeiten'} von der Lehrkraft geprüft`,
        maxPunkte: null,
        punkte: null
    };
}

function alsZeile(e: ProtokollEintrag): string {
    const punkte = e.punkte === null ? '—' : `${e.punkte}${e.maxPunkte === null ? '' : `/${e.maxPunkte}`}`;
    const teile = [
        e.zeit,
        e.ereignis.padEnd(11),
        e.ereignis === 'bestaetigt' ? '—' : `Schüler #${e.schuelerNr}`,
        e.aufgabe,
        punkte
    ];
    if (e.ereignis === 'korrektur') teile.push(`(KI-Vorschlag: ${e.punkteVorher ?? '—'})`);
    if (e.ereignis !== 'bestaetigt') teile.push(`${e.anbieter}/${e.modell}`);
    teile.push(`v${e.appVersion}`);
    if (typeof e.dauerMs === 'number') teile.push(`${e.dauerMs}ms`);
    if (e.fehler) teile.push(`Fehler: ${e.fehler}`);
    return teile.join('  ');
}

/** Das Protokoll als Text, so wie es die Lehrkraft speichert und die Schule aufbewahrt. */
export function alsProtokolltext(eintraege: ProtokollEintrag[]): string {
    const kopf = [
        'Koreki — Protokoll der KI-gestützten Bewertungen',
        'Aufzeichnung nach Art. 12 der Verordnung (EU) 2024/1689 (KI-Verordnung)',
        '',
        `Erzeugt am: ${new Date().toLocaleString('de-DE')}`,
        `Einträge: ${eintraege.length}`,
        '',
        'Dieses Protokoll enthält keine Schülertexte und keine Namen — nur die',
        'Nummer der Arbeit innerhalb des Stapels.',
        '',
        'Aufbewahrung: Betreiber eines Hochrisiko-KI-Systems bewahren die Protokolle',
        'nach Art. 26 Abs. 6 KI-VO mindestens sechs Monate auf, soweit sie ihrer',
        'Kontrolle unterliegen.',
        '',
        '─'.repeat(78),
        ''
    ];
    return [...kopf, ...eintraege.map(alsZeile), ''].join('\n');
}
