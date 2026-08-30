import * as fs from 'fs';
import * as path from 'path';

/**
 * Waechter: keine fest verdrahtete Firmierung im Auslieferungsstand.
 *
 * Die Anbieteridentitaet ist konfigurierbar und muss es bleiben. Zwei Gruende:
 *
 *   1. Sie steht noch nicht fest. Ein Platzhalter im Code wird beim Eintragen
 *      des echten Namens uebersehen — genau das ist am 30.08.2026 passiert:
 *      "Max Mustermann UG" stand in vier Compliance-Seiten als Copyright-Zeile,
 *      waehrend Impressum und AVV laengst ueber die Konfiguration liefen.
 *   2. Selbstbetreiber tragen eigene Angaben ein (NEXT_PUBLIC_LEGAL_*). Ein
 *      Literal im Code zeigt ihnen fremde Daten, die sie nicht aendern koennen.
 *
 * Rechtstexte unter src/legal/ sind ausgenommen: Dort steht die Firmierung
 * bewusst als ausfuellbarer Platzhalter im Vertragstext.
 */

const SRC = path.resolve(__dirname, '../../src');

/** Namen, die nie im Auslieferungsstand stehen duerfen. */
const PLATZHALTER = /Max Mustermann UG|\[Name des Verantwortlichen\]|\[FIRMIERUNG BITTE/;

function sammleDateien(verzeichnis: string, treffer: string[] = []): string[] {
    for (const eintrag of fs.readdirSync(verzeichnis, { withFileTypes: true })) {
        const voll = path.join(verzeichnis, eintrag.name);
        if (eintrag.isDirectory()) {
            // Vertragstexte tragen den Platzhalter absichtlich.
            if (eintrag.name === 'legal') continue;
            sammleDateien(voll, treffer);
        } else if (/\.(ts|tsx)$/.test(eintrag.name)) {
            treffer.push(voll);
        }
    }
    return treffer;
}

describe('Anbieteridentitaet bleibt konfigurierbar', () => {
    it('keine Seite verdrahtet eine Firmierung fest', () => {
        const verstoesse: string[] = [];

        for (const datei of sammleDateien(SRC)) {
            // Zwei Dateien duerfen die Platzhalter nennen, weil sie sie
            // verwalten: die Konfiguration haelt den Rueckfallwert, und
            // lib/legal.ts ersetzt sie beim Ausliefern — eine Ersetzfunktion
            // muss benennen, was sie ersetzt.
            if (datei.endsWith(path.join('config', 'legal-contact.ts'))) continue;
            if (datei.endsWith(path.join('lib', 'legal.ts'))) continue;

            const inhalt = fs.readFileSync(datei, 'utf-8');
            inhalt.split(/\r?\n/).forEach((zeile, idx) => {
                if (PLATZHALTER.test(zeile)) {
                    verstoesse.push(`${path.relative(SRC, datei)}:${idx + 1}`);
                }
            });
        }

        expect(verstoesse).toEqual([]);
    });

    it('die Firmierung kommt aus der Konfiguration', async () => {
        const { LEGAL_CONFIG } = await import('@/config/legal-contact');
        expect(LEGAL_CONFIG.controller).toHaveProperty('name');
        expect(LEGAL_CONFIG.controller).toHaveProperty('address');
        expect(LEGAL_CONFIG.contact).toHaveProperty('email');
    });

    it('ausgelieferte Rechtstexte tragen keinen Platzhalter mehr', async () => {
        // Ein White-Label-Betreiber wird nach Art. 25 Abs. 1 lit. a selbst
        // Anbieter und braucht SEINE Firmierung im AVV. Wer die Markdown-Datei
        // dafuer von Hand ausfuellt, verliert die Aenderung beim naechsten
        // Update — deshalb wird beim Ausliefern eingesetzt.
        const { getLegalDocument } = await import('@/lib/legal');
        const { LEGAL_CONFIG } = await import('@/config/legal-contact');

        for (const art of ['avv', 'tom', 'agb', 'betriebsanleitung'] as const) {
            const dok = getLegalDocument(art);
            if (!dok) continue;
            expect(dok.content).not.toMatch(/BITTE HIER EINTRAGEN/);
            expect(dok.content).not.toMatch(/Max Mustermann UG/);
        }

        const avv = getLegalDocument('avv');
        expect(avv?.content).toContain(LEGAL_CONFIG.controller.name);
    });
});
