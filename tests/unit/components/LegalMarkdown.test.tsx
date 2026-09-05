/**
 * Waechter: Rechtsdokumente werden als Dokument dargestellt, nicht als Textwand. 📄
 *
 * ANLASS (05.09.2026). Die Betriebsanleitung war in der Anwendung kaum lesbar.
 * Ueberschriften standen wie Fliesstext da, und die Rollenuebersicht erschien als
 * Zeile roher Striche: `| Ihre Nutzung | Anbieter | Betreiber | |---|---|---| | …`.
 *
 * Zwei Ursachen wirkten zusammen, und beide waren im Quelltext unsichtbar:
 *
 * 1. Alle vier Seiten trugen `prose prose-slate …`. Das Tailwind-Typografie-Plugin ist
 *    in diesem Projekt nicht eingebunden (`tailwind.config.js`, `plugins: []`) — jede
 *    dieser Klassen war wirkungslos. Eine tote Klasse sieht aus wie eine lebende.
 * 2. `react-markdown` beherrscht ohne `remark-gfm` keine Tabellen. Das Paket lag seit
 *    jeher im Projekt und wurde in `MathMarkdown` benutzt — auf den Rechtsseiten war
 *    es nur nie eingehaengt.
 *
 * WARUM HIER NICHT GERENDERT WIRD. `jest.setup.js` ersetzt `react-markdown` global
 * durch eine Attrappe, weil das Paket reines ESM ist und Jest daran scheitert. Ein
 * Rendertest wuerde hier also die Attrappe pruefen und immer gruen sein — schlimmer
 * als kein Test. Geprueft wird deshalb der Bauplan.
 *
 * Das tatsaechliche Ergebnis wurde am 05.09.2026 im Browser gegen die echte
 * Betriebsanleitung gemessen: 11 `h2`, 11 `h3`, 2 Tabellen mit 3 Spalten, 1 Zitatblock,
 * 11 Kennungen in Festbreitenschrift — und kein `|---|` mehr im Text.
 */
import fs from 'fs';
import path from 'path';

const lies = (datei: string) => fs.readFileSync(path.join(process.cwd(), datei), 'utf-8');

const QUELLE = 'src/components/ui/LegalMarkdown.tsx';
const SEITEN = [
    'src/pages/app/compliance/manual.tsx',
    'src/pages/app/compliance/agb.tsx',
    'src/pages/app/compliance/avv.tsx',
    'src/pages/app/compliance/tom.tsx'
];

describe('LegalMarkdown', () => {
    const quelltext = lies(QUELLE);

    /** DIE URSACHE DER ROHEN STRICHE. */
    it('haengt remark-gfm ein', () => {
        expect(quelltext).toContain("import remarkGfm from 'remark-gfm'");
        expect(quelltext).toMatch(/remarkPlugins=\{\[remarkGfm\]\}/);
    });

    /**
     * Ohne eigene Gestaltung erbt Markdown in diesem Projekt nichts — es gibt kein
     * Typografie-Plugin. Jedes Element, das in den vier Dokumenten vorkommt, braucht
     * deshalb einen Eintrag.
     */
    it.each(['h2', 'h3', 'p', 'ul', 'li', 'strong', 'a', 'blockquote', 'code', 'table', 'th', 'td'])(
        'gestaltet <%s> ausdruecklich',
        element => expect(quelltext).toMatch(new RegExp(`^\\s{12}${element}: \\(`, 'm'))
    );

    /** Der Dokumenttitel steht bereits als Ueberschrift der Seite darueber. */
    it('blendet den Dokumenttitel aus', () => {
        expect(quelltext).toMatch(/h1: .*className="hidden"/);
    });

    /**
     * Das Design-System verlangt die HSL-Tokens. `prose-slate` braechte Tailwinds
     * eigene Graupalette mit — eine zweite Farbwelt neben der des Produkts.
     */
    it('nutzt keine fremde Farbpalette', () => {
        expect(quelltext).not.toMatch(/\b(slate|gray|zinc|neutral|stone)-\d{2,3}\b/);
    });
});

/**
 * Vier Seiten, eine Darstellung. Die Klassenkette stand dort wortgleich; vier Kopien
 * waeren vier Gelegenheiten auseinanderzulaufen.
 */
describe.each(SEITEN)('%s', datei => {
    const inhalt = lies(datei);

    it('stellt das Dokument ueber die gemeinsame Komponente dar', () => {
        expect(inhalt).toContain("import { LegalMarkdown } from '@/components/ui/LegalMarkdown'");
        expect(inhalt).toContain('<LegalMarkdown content={content} />');
        expect(inhalt).not.toContain("from 'react-markdown'");
    });

    /** Die toten Klassen dürfen nicht zurueckkommen — sie sahen nach Gestaltung aus. */
    it('traegt keine wirkungslosen prose-Klassen', () => {
        expect(inhalt).not.toMatch(/\bprose(-\w+)?\b/);
    });
});
