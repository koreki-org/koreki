/**
 * Waechter: Die mysql2-Ausnahme traegt nur, solange Koreki PostgreSQL spricht.
 *
 * ANLASS (03.09.2026). `prisma@7.10.0` bringt `mysql2` mit. Zwei Meldungen haengen daran:
 * ein Auth-Downgrade auf `mysql_clear_password`, der Zugangsdaten im Klartext an einen
 * boesartigen MySQL-Server schickt, und eine Dekompressionsbombe im komprimierten
 * MySQL-Protokoll. Der Pre-Push-Wall blockierte deshalb jeden Push.
 *
 * Aufgenommen wurde die Ausnahme mit EINER Begruendung: Koreki spricht kein MySQL. Der
 * Provider in `prisma/schema.prisma` ist `postgresql`, im gesamten `src/` kommt MySQL
 * nicht vor. Beide Schwachstellen sitzen im MySQL-Wire-Protokoll und setzen eine
 * Verbindung zu einem MySQL-Server voraus. Der Treiber wird nie geladen.
 *
 * DIE GEFAHR. Diese Begruendung ist an eine Tatsache gebunden, die sich aendern kann.
 * Wechselt der Provider — auf `mysql`, auf `sqlite` mit spaeterem Wechsel, auf ein
 * Mehr-Provider-Setup —, ist die Ausnahme von einer Sekunde auf die andere falsch. Und
 * zwar still: Der Audit-Lauf bliebe gruen, weil er nur die Liste liest, nicht ihre
 * Begruendung.
 *
 * Am 17.08.2026 lautete die Entscheidung zur Prisma-Kette ausdruecklich "warten, statt
 * die Ausnahmeliste zu erweitern". Am 03.09.2026 wurde sie fuer `mysql2` anders
 * getroffen, weil die Begruendung strenger ist — nicht "schwer erreichbar", sondern
 * "unerreichbar". Dieser Test ist der Preis dafuer: Er haelt die Begruendung an die
 * Tatsache gebunden, statt sie einem Kommentar zu ueberlassen.
 *
 * NICHT GEDECKT. Ob die Ausnahme fachlich richtig ist. Nur, dass ihre Voraussetzung
 * noch gilt.
 */
import * as fs from 'fs';
import * as path from 'path';

const WURZEL = process.cwd();
const AUDIT = path.join(WURZEL, 'scripts', 'security-audit.js');
const SCHEMA = path.join(WURZEL, 'prisma', 'schema.prisma');

/** Steht das Paket in der Ausnahmeliste des Audit-Laufs? */
function istAusgenommen(paket: string): boolean {
    const quelle = fs.readFileSync(AUDIT, 'utf-8');
    const liste = quelle.slice(
        quelle.indexOf('const allowedPackages'),
        quelle.indexOf('];', quelle.indexOf('const allowedPackages'))
    );
    // Nur echte Eintraege zaehlen, keine Erwaehnung im Kommentar.
    return new RegExp(`^\\s*'${paket}'`, 'm').test(liste);
}

/** Der Datenbank-Provider aus dem Prisma-Schema. */
function provider(): string {
    const treffer = fs.readFileSync(SCHEMA, 'utf-8')
        .match(/datasource\s+\w+\s*\{[^}]*provider\s*=\s*"([^"]+)"/);
    return treffer?.[1] ?? '';
}

describe('mysql2-Ausnahme im Sicherheits-Gate', () => {
    it('gilt nur, solange der Datenbank-Provider PostgreSQL ist', () => {
        if (!istAusgenommen('mysql2')) return; // Ausnahme entfernt — nichts zu pruefen.

        expect(provider()).toBe('postgresql');
    });

    it('gilt nur, solange MySQL im Quelltext nicht vorkommt', () => {
        if (!istAusgenommen('mysql2')) return;

        const treffer: string[] = [];
        const gehe = (verzeichnis: string): void => {
            for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
                const voll = path.join(verzeichnis, eintrag.name);
                if (eintrag.isDirectory()) { gehe(voll); continue; }
                if (!/\.tsx?$/.test(eintrag.name)) continue;
                if (/\bmysql\b/i.test(fs.readFileSync(voll, 'utf-8'))) {
                    treffer.push(path.relative(WURZEL, voll));
                }
            }
        };
        gehe(path.join(WURZEL, 'src'));

        if (treffer.length > 0) {
            throw new Error(
                'Die mysql2-Ausnahme in scripts/security-audit.js steht auf der Begruendung ' +
                '"Koreki spricht kein MySQL". Diese Dateien widersprechen dem:\n  - ' +
                treffer.join('\n  - ') +
                '\nEntweder die Nutzung entfernen oder die Ausnahme streichen — die Schwachstellen ' +
                'betreffen genau das MySQL-Protokoll (Klartext-Zugangsdaten, Dekompressionsbombe).'
            );
        }
    });
});
