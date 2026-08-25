import { GRENZE_MARKER } from './profile-limits';

/**
 * Namensregeln für Profil-Familien (Experten-Profile, KI-Profile, Skill-Sets,
 * Erfahrungsschätze)
 * 🏮🛡️🏛️
 *
 * Die Regel ist keine Erfindung dieser Datei, sondern steht bereits im
 * Datenmodell: Alle vier Modelle tragen `@@unique([name, userId])`. Pro Nutzer
 * ist ein Name innerhalb seiner Familie also eindeutig — die Datenbank setzt
 * das durch, die dateibasierte Community-Ablage und der localStorage der
 * Desktop-App müssen dasselbe tun.
 *
 * Warum das mehr als Kosmetik ist: Profile werden über ihren NAMEN gespeichert
 * und ausgewählt (`upsertProfile` sucht per Name, `selectedProfile` ist ein
 * Name-String). Ein zweiter Eintrag gleichen Namens ist damit unerreichbar —
 * jede Bearbeitung landet beim ersten Treffer, in der Liste stehen zwei
 * scheinbar identische, gleichzeitig markierte Einträge.
 */

/**
 * Vergleicht zwei Namen so, wie ein Mensch eine Liste liest: ohne Rücksicht auf
 * Groß-/Kleinschreibung und Randleerzeichen.
 *
 * 🏮 Die Eindeutigkeits-Sperre der Datenbank vergleicht dagegen exakt. „FISI"
 * und „fisi" wären dort zwei gültige Zeilen — in der Seitenleiste aber zwei
 * praktisch identische Einträge. Deshalb entscheidet AUSSCHLIESSLICH diese
 * Funktion, was als „derselbe Name" gilt: in der Rückfrage vor dem
 * Überschreiben genauso wie im Schreibpfad danach. Fielen beide auseinander,
 * versprächen wir ein Überschreiben und legten doch eine Dublette an.
 */
export const isSameName = (a?: string, b?: string): boolean =>
    (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

/**
 * Findet einen bestehenden Eintrag gleichen Namens — unabhängig von der
 * Schreibweise. Für Ablagen, die über den Namen adressieren.
 */
export const findByName = <T extends { name?: string }>(entries: T[], name: string): T | undefined =>
    entries.find(e => isSameName(e?.name, name));

/**
 * Loest eine gespeicherte Profil-Referenz auf — ID zuerst, Name als Rueckfall.
 *
 * 🏮 Migrationsbruecke, kein Dauerzustand. In `activeSkillProfileId` &
 * Verwandten steckt gemischter Altbestand: eine `cuid()` aus der Datenbank,
 * ein Profilname (so wurde es fuer System-Vorlagen ohne ID gespeichert) oder
 * der frueher fest verdrahtete String `system-mint-standard`. Letzterer ist
 * inzwischen ein echter Slug und loest sich damit von selbst auf.
 *
 * Die Reihenfolge ist wesentlich: Erst ueber ALLE Eintraege per ID gehen, dann
 * erst per Name. Andernfalls gewaenne ein zufaellig namensgleicher Eintrag
 * gegen den eindeutig referenzierten.
 *
 * Aufrufer sollten die ID des Treffers zurueckschreiben (`profile.id`) — dann
 * heilt sich der Bestand mit jeder Sitzung selbst.
 */
export const resolveProfileRef = <T extends { id?: string; name?: string }>(
    profiles: T[],
    ref?: string | null
): T | undefined => {
    if (!ref) return undefined;
    return profiles.find(p => p.id === ref) || profiles.find(p => isSameName(p.name, ref));
};

/**
 * Findet einen noch freien Namen — fuer Kopier-Aktionen.
 *
 * GEFUNDEN BEIM LESEN, 19.08.2026: Der Knopf "Erfahrungsschatz kopieren"
 * vergab immer denselben Namen ("Kopie von X"). Der Schreibpfad
 * (`addLocalMemory`) sucht per `isSameName` und ueberschreibt bei einem
 * Treffer. Zweimal kopieren hiess damit: die erste Kopie ist weg — wortlos,
 * samt der Arbeit, die inzwischen daran haengt.
 *
 * Eine Rueckfrage waere hier das falsche Mittel: Wer "kopieren" klickt, will
 * eine ZWEITE haben, keine Entscheidung ueber die erste. Deshalb ein freier
 * Name statt eines Dialogs.
 */
export const findFreeName = <T extends { name?: string }>(entries: T[], wunsch: string): string => {
    if (!findByName(entries, wunsch)) return wunsch;

    // Die Schranke ist keine Erwartung, sondern eine Zusicherung gegen die
    // Endlosschleife: Wer 99 gleichnamige Kopien hat, bekommt einen Zeitstempel.
    for (let n = 2; n <= 99; n++) {
        const kandidat = `${wunsch} (${n})`;
        if (!findByName(entries, kandidat)) return kandidat;
    }
    return `${wunsch} (${Date.now()})`;
};

/** Einheitlicher Wortlaut — die Meldung erscheint in vier Modalen. */
export const nameTakenMessage = (label: string): string =>
    `Ein ${label} mit diesem Namen existiert bereits`;

/** Kopfzeile der Rückfrage — der Wortlaut steht wie die Meldung nur hier. */
export const overwriteTitle = (label: string): string => `${label} überschreiben?`;

/** Fragt vor dem Überschreiben eines gleichnamigen Eintrags. */
export const overwriteQuestion = (label: string, name: string): string =>
    `Ein ${label} mit dem Namen "${name}" existiert bereits.\n\n` +
    `Beim Speichern wird der bestehende Eintrag überschrieben. Fortfahren?`;

/**
 * Erkennt die Eindeutigkeits-Verletzung der Datenbank (Prisma P2002).
 *
 * Dient als letzte Instanz: Die Routen prüfen vorher selbst, damit die Meldung
 * fachlich formuliert ist. Zwischen Prüfung und Schreibvorgang bleibt aber ein
 * Wettlauf-Fenster — ohne diese Abbildung käme er als „Interner Serverfehler"
 * beim Nutzer an.
 */
export const isUniqueNameViolation = (err: unknown): boolean =>
    typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';

/**
 * Übersetzt die fachlichen Fehler beider Ablagen in eine HTTP-Antwort.
 *
 * Der Sammel-`catch` der API-Routen beantwortete bisher jeden Fehler mit einem
 * generischen 500 — die Namenskollision kam damit als „Lokaler Fehler" beim
 * Nutzer an, obwohl sie eine klare, behebbare Ursache hat. Alles Unerwartete
 * bleibt bewusst unspezifisch: Dateipfade und Datenbank-Interna gehören nicht
 * in eine Client-Antwort.
 */
export const toProfileHttpError = (
    err: unknown,
    fallbackMessage: string,
    label: string = 'Eintrag'
): { status: number; message: string } => {
    if (isUniqueNameViolation(err)) {
        return { status: 409, message: nameTakenMessage(label) };
    }

    const message = err instanceof Error ? err.message : '';
    // Die Mengengrenze ist kein Fehler des Nutzers, sondern eine Tarifgrenze:
    // 403 mit der fachlichen Meldung, damit die Oberflaeche den Weg zum
    // Experten-Modus anbieten kann statt einen Serverfehler zu zeigen.
    if (message.includes(GRENZE_MARKER)) return { status: 403, message };
    if (message.includes('existiert bereits')) return { status: 409, message };
    if (message.includes('nicht gefunden')) return { status: 404, message };

    return { status: 500, message: fallbackMessage };
};
