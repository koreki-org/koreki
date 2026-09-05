/**
 * Waechter: Anbieter und Betreiber sind zwei Rollen — und zwei Datensaetze. 🏷️
 *
 * ANLASS (05.09.2026). Die Betriebsanleitung fuehrte unter „1. Anbieter und Kontakt"
 * genau einen Kontakt, gefuellt aus `NEXT_PUBLIC_LEGAL_*`. Diese Variablen setzt aber,
 * wer die Instanz BETREIBT. Der Anbieter der Software kam im Dokument nirgends vor —
 * und Abschnitt 2 desselben Dokuments sagt ausdruecklich, dass eine Schule, die die
 * Desktop- oder Community-Fassung unveraendert einsetzt, Betreiber ist und NICHT
 * Anbieter. Das Dokument widersprach sich selbst, und die Angabe, die Artikel 13
 * verlangt, fehlte.
 *
 * WARUM FESTE WERTE UND KEINE UMGEBUNGSVARIABLEN. Der erste Entwurf holte den Anbieter
 * beim Bauen aus GitHub-Secrets, um Persoenliches aus dem oeffentlichen Quelltext zu
 * halten. Das war ein Schritt zu weit: Der Anbieter ist die MARKE, nicht eine Person.
 * Daran ist nichts vertraulich. Die Angaben zur dahinterstehenden Person stehen im
 * Impressum, auf das die Anleitung verweist — dort gehoert eine Anschrift hin, nicht in
 * jede ausgelieferte Programmdatei.
 *
 * Der Betreiber bleibt dagegen bei den Umgebungsvariablen: Er ist bei jeder Instanz ein
 * anderer und kann gar nicht im Quelltext stehen.
 */
import fs from 'fs';
import path from 'path';

const lies = (datei: string) => fs.readFileSync(path.join(process.cwd(), datei), 'utf-8');

describe('Die beiden Rollen sind getrennt', () => {
    const konfig = lies('src/config/legal-contact.ts');
    /** Nur der Anbieter-Block — bis dahin, wo der Betreiber beginnt. */
    const anbieterBlock = konfig.slice(konfig.indexOf('provider: {'), konfig.indexOf('controller: {'));

    it('kennt einen Anbieter neben dem Betreiber', () => {
        expect(konfig).toMatch(/provider:\s*\{/);
        expect(konfig).toMatch(/controller:\s*\{/);
    });

    /**
     * Ein Rueckfall auf die Betreiber-Angaben waere schlimmer als eine Luecke: Er
     * wuerde die Schule als Anbieter ausweisen, die sie gerade nicht ist.
     */
    it('faellt fuer den Anbieter nicht auf die Betreiber-Angaben zurueck', () => {
        expect(anbieterBlock).not.toContain('NEXT_PUBLIC_LEGAL_');
    });

    /**
     * Eine Anschrift im Anbieter-Block waere genau das, was der Verweis aufs Impressum
     * vermeiden soll.
     */
    it('fuehrt fuer den Anbieter keine Anschrift, sondern einen Verweis', () => {
        expect(anbieterBlock).not.toContain('address');
        expect(anbieterBlock).toContain('imprint');
    });

    /**
     * Die Gegenprobe, und der Grund fuer Andreas' Warnung: Der Betreiber MUSS aus der
     * Umgebung kommen. Das Impressum, die Datenschutzangaben und die Vertraege haengen
     * daran; er ist bei jeder Instanz ein anderer.
     */
    it('laesst den Betreiber bei den Umgebungsvariablen', () => {
        const betreiberBlock = konfig.slice(konfig.indexOf('controller: {'));

        expect(betreiberBlock).toContain('process.env.NEXT_PUBLIC_LEGAL_NAME');
        expect(betreiberBlock).toContain('process.env.NEXT_PUBLIC_LEGAL_ADDRESS');
        expect(betreiberBlock).toContain('process.env.NEXT_PUBLIC_LEGAL_EMAIL');
    });
});

describe('Die Betriebsanleitung trennt beide Rollen', () => {
    const anleitung = lies('src/legal/betriebsanleitung_v1.3.md');
    const abschnittEins = anleitung.slice(anleitung.indexOf('## 1.'), anleitung.indexOf('## 2.'));

    it('nennt Anbieter und Betreiber getrennt', () => {
        expect(abschnittEins).toContain('[ANBIETER BITTE HIER EINTRAGEN]');
        expect(abschnittEins).toContain('[ANBIETER-KONTAKT BITTE HIER EINTRAGEN]');
        expect(abschnittEins).toContain('[ANBIETER-IMPRESSUM BITTE HIER EINTRAGEN]');
        expect(abschnittEins).toContain('[FIRMIERUNG BITTE HIER EINTRAGEN]');
    });

    /**
     * Der alte Satz forderte Selbstbetreiber auf, sich als „Anbieter" einzutragen —
     * im Widerspruch zu Abschnitt 2 derselben Anleitung.
     */
    it('fordert Selbstbetreiber nicht mehr auf, sich als Anbieter einzutragen', () => {
        expect(abschnittEins).toMatch(/Ihre eigenen Angaben\*{0,2} als \*{0,2}Betreiber/);
    });
});

/**
 * Die eigentliche Frage: Steht am Ende das Richtige im ausgelieferten Dokument?
 *
 * Quelltext zu lesen genuegt dafuer nicht — das bliebe auch dann gruen, wenn das
 * Einsetzen kaputt waere. Hier laeuft es echt.
 */
describe('Ausgeliefert wird, was in der Konfiguration steht', () => {
    const { getLatestLegalDocument } = require('@/lib/legal');
    const { LEGAL_CONFIG } = require('@/config/legal-contact');
    const anleitung: string = getLatestLegalDocument('betriebsanleitung')?.content ?? '';

    it('setzt Marke, Kontakt und Impressumsverweis ein', () => {
        expect(anleitung).toContain(LEGAL_CONFIG.provider.name);
        expect(anleitung).toContain(LEGAL_CONFIG.provider.email);
        expect(anleitung).toContain(LEGAL_CONFIG.provider.imprint);
    });

    it('laesst keinen Anbieter-Platzhalter stehen', () => {
        expect(anleitung).not.toContain('[ANBIETER BITTE HIER EINTRAGEN]');
        expect(anleitung).not.toContain('[ANBIETER-KONTAKT BITTE HIER EINTRAGEN]');
        expect(anleitung).not.toContain('[ANBIETER-IMPRESSUM BITTE HIER EINTRAGEN]');
    });

    /**
     * Der Anbieter steht fest, der Betreiber kommt aus der Umgebung. Ohne gesetzte
     * Umgebung bleibt dort ein Platzhalter — und genau das soll die Lehrkraft sehen,
     * statt versehentlich die Marke als Betreiber ihrer Instanz zu lesen.
     */
    it('haelt den Betreiber davon getrennt', () => {
        const abschnitt = anleitung.slice(anleitung.indexOf('## 1.'), anleitung.indexOf('## 2.'));
        const betreiberZeile = abschnitt.split('\n').find(z => z.includes('**Betreiber:**')) ?? '';

        expect(betreiberZeile).not.toContain(LEGAL_CONFIG.provider.name);
    });
});

/**
 * Das Urheberrecht an Koreki liegt beim Anbieter, nicht bei dem, der eine Instanz
 * betreibt. Die Fusszeile der vier Compliance-Seiten wies bis zum 05.09.2026 den
 * BETREIBER als Rechteinhaber aus — auf einer Schul-Instanz haette dort die Schule
 * gestanden.
 */
describe.each([
    'src/pages/app/compliance/manual.tsx',
    'src/pages/app/compliance/agb.tsx',
    'src/pages/app/compliance/avv.tsx',
    'src/pages/app/compliance/tom.tsx'
])('%s', datei => {
    it('nennt in der Fusszeile den Anbieter als Rechteinhaber', () => {
        const inhalt = lies(datei);

        expect(inhalt).toContain('{LEGAL_CONFIG.provider.name}');
        expect(inhalt).not.toMatch(/&copy;.{0,80}LEGAL_CONFIG\.controller\.name/);
    });
});
