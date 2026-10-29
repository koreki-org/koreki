import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Migrationen beim Container-Start: streng, aber nur wo es eine Datenbank gibt
 * 🚦🗄️
 *
 * ANLASS (29.10.2026): `scripts/start.sh` startete den Server auch nach einer
 * gescheiterten Migration (`|| echo "starting anyway"`). Der Health-Check
 * prueft nur `SELECT 1` — die Instanz galt als gesund, Coolify rollte nie
 * zurueck.
 *
 * Der naheliegende Fix ("bei Fehler abbrechen") haette aber jede
 * Community-Multi-Installation lahmgelegt: Deren Compose-Dateien setzen eine
 * PLATZHALTER-`DATABASE_URL`, damit der Prisma-Client gebaut werden kann.
 * Eine Koreki-Datenbank gibt es dort nicht, die Migration scheitert also
 * immer — bisher still, nach dem Fix in einer Neustartschleife.
 *
 * `start.sh` erkennt lokale Instanzen deshalb an derselben Regel wie
 * `isLocalInstance()`. Dieser Waechter haelt beide Seiten zusammen:
 *
 * 1. `start.sh` bricht bei gescheiterter Migration ab (kein Rueckfall auf
 *    "starting anyway").
 * 2. Jede Compose-Datei, die einem Dienst einen Platzhalter gibt, muss ihn zur
 *    Laufzeit auch als lokal kennzeichnen — sonst versucht `start.sh` zu
 *    migrieren und der Container startet nie.
 */

const ROOT = process.cwd();
// Kommentarzeilen raus: Der Kopf von start.sh zitiert die alte, fehlerhafte
// Zeile woertlich — als Begruendung, nicht als Code.
const startSh = readFileSync(join(ROOT, 'scripts', 'start.sh'), 'utf-8')
    .split(/\r?\n/)
    .filter(zeile => !zeile.trim().startsWith('#'))
    .join('\n');

describe('start.sh — Migrationen', () => {
    it('startet nach einer gescheiterten Migration NICHT weiter', () => {
        // Der alte Rueckfall darf nicht zurueckkommen.
        expect(startSh).not.toMatch(/migrate deploy\s*\|\|/);
        // Der Fehlerzweig muss den Start beenden, bevor der Server laeuft.
        const fehlerzweig = startSh.indexOf('if ! node /app/node_modules/prisma/build/index.js migrate deploy');
        const serverStart = startSh.indexOf('exec node /app/server.js');
        expect(fehlerzweig).toBeGreaterThan(-1);
        expect(startSh.slice(fehlerzweig, serverStart)).toMatch(/exit 1/);
    });

    it('erkennt lokale Instanzen an derselben Regel wie isLocalInstance()', () => {
        expect(startSh).toMatch(/LOGTO\) return 1/);
        expect(startSh).toMatch(/KEYCLOAK\|NONE\) return 0/);
        expect(startSh).toMatch(/community\|desktop\) return 0/);
    });
});

/** Zerlegt eine Compose-Datei grob in ihre Dienste (Einrueckung zwei Leerzeichen). */
function dienste(yaml: string): Array<{ name: string; block: string }> {
    const abschnitt = yaml.split(/^services:\s*$/m)[1] ?? '';
    const ende = abschnitt.search(/^\S/m); // naechster Top-Level-Schluessel (volumes:, networks:)
    const nurDienste = ende >= 0 ? abschnitt.slice(0, ende) : abschnitt;
    const teile = nurDienste.split(/^ {2}([A-Za-z0-9_-]+):\s*$/m);
    const ergebnis: Array<{ name: string; block: string }> = [];
    for (let i = 1; i < teile.length; i += 2) {
        ergebnis.push({ name: teile[i], block: teile[i + 1] ?? '' });
    }
    return ergebnis;
}

describe('Compose-Dateien — Platzhalter-Datenbank nur mit lokaler Kennung', () => {
    const composeDateien = readdirSync(ROOT).filter(f => /^docker-compose.*\.ya?ml$/.test(f));

    it('findet ueberhaupt Compose-Dateien (sonst prueft der Test nichts)', () => {
        expect(composeDateien.length).toBeGreaterThan(0);
    });

    const faelle = composeDateien.flatMap(datei =>
        dienste(readFileSync(join(ROOT, datei), 'utf-8'))
            .filter(d => /DATABASE_URL:\s*"?postgresql:\/\/dummy:dummy@/.test(d.block))
            .map(d => [datei, d.name, d.block] as const)
    );

    it('es gibt mindestens einen Dienst mit Platzhalter (sonst waere der Waechter leer)', () => {
        expect(faelle.length).toBeGreaterThan(0);
    });

    it.each(faelle)('%s / %s kennzeichnet sich zur Laufzeit als lokal', (_datei, _dienst, block) => {
        const lokaleAnmeldung = /NEXT_PUBLIC_AUTH_TYPE:\s*"?(KEYCLOAK|NONE)"?\s*$/m.test(block);
        const lokalerModus = /NEXT_PUBLIC_KOREKI_MODE:\s*"?(community|desktop)"?\s*$/m.test(block);
        expect(lokaleAnmeldung || lokalerModus).toBe(true);
    });
});
