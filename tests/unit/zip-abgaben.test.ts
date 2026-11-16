/**
 * @jest-environment node
 */
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

// jest.setup.js ersetzt jszip global durch eine Attrappe — hier wird echt gelesen.
jest.unmock('jszip');
import { leseZipAbgaben, standardAuswahl, buendleAuswahl, alsZipArbeit } from '@/lib/zip-abgaben';
import type { ZipBefund } from '@/lib/zip-abgaben';
import { buendleAbgabe, mitTextBeilagen, dateiKopf } from '@/lib/abgabe-buendeln';

/**
 * Schuelerabgaben aus ZIP-Dateien (Layer 1)
 * 🗂️
 *
 * ANLASS, 13.11.2026: Eine IHK-Zwischenpruefung gibt je Pruefling einen Ordner
 * mit mehreren PDFs ab, dazu die bereitgestellten Vorlagen und Dateien, die
 * Koreki nicht lesen kann. Die Ordnerstruktur hier ist der echten nachgebaut;
 * die Inhalte sind erfunden.
 */

/** Ein PDF mit einer leeren Seite — Inhalt egal, es muss sich oeffnen lassen. */
async function pdf(seiten = 1): Promise<Uint8Array> {
    const d = await PDFDocument.create();
    for (let i = 0; i < seiten; i++) d.addPage();
    return d.save();
}

async function zipDatei(name: string, inhalt: Record<string, string | Uint8Array>): Promise<File> {
    const zip = new JSZip();
    Object.entries(inhalt).forEach(([pfad, daten]) => zip.file(pfad, daten));
    return new File([new Uint8Array(await zip.generateAsync({ type: 'uint8array' }))], name);
}

/** Die Ablage eines Prueflings, wie die Pruefungsumgebung sie liefert. */
async function prueflingsOrdner(person: string, abgabe: Uint8Array): Promise<Record<string, string | Uint8Array>> {
    const vorlage = await pdf(2);
    return {
        [`${person}/transfer/sca/Bereitgestellte Dateien/Aufgabe2/Preisliste.pdf`]: vorlage,
        [`${person}/transfer/sca/Bereitgestellte Dateien/Aufgabe1/Kalkulation.xlsx`]: 'xlsx-vorlage',
        [`${person}/transfer/sca/_collect/APT1/${person}_aufgabe2.pdf`]: abgabe,
        [`${person}/transfer/sca/_collect/APT1/Kalkulation.ods`]: `ods von ${person}`,
        [`${person}/transfer/sca/_collect/APT1/transportkosten.py`]: `def f(x):\n    return x  # ${person}`
    };
}

const namen = (befund: ZipBefund) => befund.prueflinge.map(p => p.name);
/** Die Dateinamen, die der Vorschlag fuer einen Pruefling anhakt. */
const vorgeschlagen = (befund: ZipBefund, name: string) =>
    standardAuswahl(befund)[name].map(pfad => pfad.split('/').pop());
const art = (befund: ZipBefund, name: string, datei: string) =>
    befund.prueflinge.find(p => p.name === name)!.dateien.find(d => d.datei.name === datei)!.art;

describe('leseZipAbgaben', () => {
    it('macht aus jedem Ordner einen Pruefling, auch unter einem umschliessenden Ordner', async () => {
        const zip = await zipDatei('Winter.zip', {
            ...Object.fromEntries(Object.entries(await prueflingsOrdner('lena', await pdf(1))).map(([p, d]) => [`Winter 2026/${p}`, d])),
            ...Object.fromEntries(Object.entries(await prueflingsOrdner('max', await pdf(3))).map(([p, d]) => [`Winter 2026/${p}`, d]))
        });
        const befund = await leseZipAbgaben([zip]);
        expect(namen(befund)).toEqual(['lena', 'max']);
        expect(befund.quelle).toBe('Winter.zip');
    });

    /** Alles bleibt sichtbar — entschieden wird im Fenster. Der Vorschlag laesst Vorlagen weg. */
    it('kennzeichnet Vorlagen, die bei allen gleich sind — und nur die', async () => {
        const zip = await zipDatei('a.zip', { ...(await prueflingsOrdner('lena', await pdf(1))), ...(await prueflingsOrdner('max', await pdf(3))) });
        const befund = await leseZipAbgaben([zip]);
        expect(befund.prueflinge[0].dateien).toHaveLength(5);
        expect(art(befund, 'lena', 'Preisliste.pdf')).toBe('vorlage');
        expect(art(befund, 'lena', 'lena_aufgabe2.pdf')).toBe('abgabe');
        expect(vorgeschlagen(befund, 'lena')).toEqual(['lena_aufgabe2.pdf', 'transportkosten.py']);
    });

    it('kennzeichnet Dateien, deren Format Koreki nicht lesen kann', async () => {
        const zip = await zipDatei('a.zip', { ...(await prueflingsOrdner('lena', await pdf(1))), ...(await prueflingsOrdner('max', await pdf(3))) });
        const befund = await leseZipAbgaben([zip]);
        expect(art(befund, 'lena', 'Kalkulation.ods')).toBe('unlesbar');
        // Die Vorlage in einem fremden Format ist zuerst unlesbar, nicht Vorlage — waehlbar ist sie so oder so nicht.
        expect(art(befund, 'lena', 'Kalkulation.xlsx')).toBe('unlesbar');
    });

    /** Identische Abgaben zweier Personen sind keine Vorlage — bei drei Personen nicht verwechselbar. */
    it('haelt eine Datei, die nur zwei von drei haben, nicht fuer eine Vorlage', async () => {
        const gleich = await pdf(4);
        const zip = await zipDatei('a.zip', {
            'a/abgabe.pdf': gleich, 'b/abgabe.pdf': gleich, 'c/abgabe.pdf': await pdf(1)
        });
        const befund = await leseZipAbgaben([zip]);
        expect(befund.prueflinge.map(p => p.dateien[0].art)).toEqual(['abgabe', 'abgabe', 'abgabe']);
    });

    it('nimmt bei mehreren ZIPs jedes als einen Pruefling', async () => {
        const lena = await zipDatei('lena-exam.zip', await prueflingsOrdner('lena-exam', await pdf(1)));
        const max = await zipDatei('max-exam.zip', await prueflingsOrdner('max-exam', await pdf(2)));
        const befund = await leseZipAbgaben([lena, max]);
        expect(namen(befund)).toEqual(['lena-exam', 'max-exam']);
        expect(befund.quelle).toBe('2 ZIP-Dateien');
        expect(vorgeschlagen(befund, 'lena-exam')).toEqual(['lena-exam_aufgabe2.pdf', 'transportkosten.py']);
    });

    it('liest innere ZIPs auf oberster Ebene als Pruefling und meldet Doppelte', async () => {
        const innen = await zipDatei('lena.zip', { 'lena/abgabe.pdf': await pdf(1) });
        const zip = await zipDatei('alle.zip', {
            'lena.zip': new Uint8Array(await innen.arrayBuffer()),
            'lena/abgabe.pdf': await pdf(2),
            'max/abgabe.pdf': await pdf(3),
            'Bewertung.xlsx': 'noten'
        });
        const befund = await leseZipAbgaben([zip]);
        expect(namen(befund)).toEqual(['lena', 'max']);
        expect(befund.doppelt).toEqual(['lena']);
        expect(befund.ausserhalb).toEqual(['Bewertung.xlsx']);
    });

    it('nimmt ein ZIP mit nur einem Ordner als einen Pruefling', async () => {
        const zip = await zipDatei('lena-exam.zip', await prueflingsOrdner('lena-exam', await pdf(1)));
        const befund = await leseZipAbgaben([zip]);
        expect(namen(befund)).toEqual(['lena-exam']);
        // Ein Pruefling allein: Vorlagen sind nicht erkennbar — das Fenster zeigt sie, die Lehrkraft waehlt ab.
        expect(vorgeschlagen(befund, 'lena-exam')).toContain('Preisliste.pdf');
    });

    it('uebergeht Beiwerk des Betriebssystems', async () => {
        const zip = await zipDatei('a.zip', {
            'lena/abgabe.pdf': await pdf(1), 'max/abgabe.pdf': await pdf(2),
            '__MACOSX/lena/._abgabe.pdf': 'x', 'lena/.DS_Store': 'x'
        });
        const befund = await leseZipAbgaben([zip]);
        expect(namen(befund)).toEqual(['lena', 'max']);
        expect(befund.prueflinge[0].dateien.map(d => d.pfad)).toEqual(['abgabe.pdf']);
    });
});

describe('buendleAbgabe', () => {
    const datei = (name: string, inhalt: string | Uint8Array, type: string) =>
        new File([typeof inhalt === 'string' ? inhalt : new Uint8Array(inhalt)], name, { type });

    it('fuegt PDFs zu einem PDF zusammen, mit einer Trennseite je Datei', async () => {
        const b = await buendleAbgabe('lena', [
            datei('a1.pdf', await pdf(2), 'application/pdf'),
            datei('a2.pdf', await pdf(1), 'application/pdf')
        ]);
        expect(b!.datei.name).toBe('lena.pdf');
        const gelesen = await PDFDocument.load(await b!.datei.arrayBuffer());
        expect(gelesen.getPageCount()).toBe(2 + 2 + 1);
        expect(b!.textBeilagen).toBeUndefined();
    });

    /** Durch die Bilderkennung ginge die Einrueckung verloren — Quelltext reist woertlich. */
    it('haengt Quelltext woertlich an, statt ihn ins PDF zu legen', async () => {
        const code = 'def kosten(km):\n    if km <= 50:\n        return 2.5 * km';
        const b = await buendleAbgabe('lena', [datei('a.pdf', await pdf(1), 'application/pdf'), datei('kosten.py', code, 'text/plain')]);
        // Im Codeblock, damit die Anzeige `#` nicht als Ueberschrift deutet und
        // die Einrueckung nicht verschluckt (markdown-codebloecke.ts, 15.11.2026).
        expect(b!.textBeilagen).toBe(`${dateiKopf('kosten.py')}\n\`\`\`python\n${code}\n\`\`\``);
        expect((await PDFDocument.load(await b!.datei.arrayBuffer())).getPageCount()).toBe(2);
    });

    it('macht aus reinem Text eine Textdatei', async () => {
        const b = await buendleAbgabe('lena', [datei('a.sql', 'SELECT 1;', 'text/plain')]);
        expect(b!.datei.name).toBe('lena.txt');
        expect(await b!.datei.text()).toBe(`${dateiKopf('a.sql')}\n\`\`\`sql\nSELECT 1;\n\`\`\``);
        expect(b!.textBeilagen).toBeUndefined();
    });

    it('meldet ein kaputtes PDF und nimmt den Rest', async () => {
        const b = await buendleAbgabe('lena', [datei('kaputt.pdf', 'kein pdf', 'application/pdf'), datei('gut.pdf', await pdf(1), 'application/pdf')]);
        expect(b!.unlesbar).toEqual(['kaputt.pdf']);
        expect((await PDFDocument.load(await b!.datei.arrayBuffer())).getPageCount()).toBe(2);
    });

    it('setzt Namen ausserhalb von Latin-1 lesbar auf die Trennseite', async () => {
        await expect(buendleAbgabe('Ayşe', [datei('Ayşe_aufgabe1.pdf', await pdf(1), 'application/pdf')])).resolves.not.toBeNull();
    });
});

describe('mitTextBeilagen', () => {
    it('haengt die Beilage an — genau einmal', () => {
        const einmal = mitTextBeilagen('erkannt', '=== Datei: a.py ===\nx = 1');
        expect(einmal).toBe('erkannt\n\n=== Datei: a.py ===\nx = 1');
        expect(mitTextBeilagen(einmal, '=== Datei: a.py ===\nx = 1')).toBe(einmal);
    });

    it('laesst Text ohne Beilage unveraendert', () => {
        expect(mitTextBeilagen('erkannt')).toBe('erkannt');
    });
});

describe('buendleAuswahl', () => {
    it('buendelt je Pruefling genau die ausgewaehlten Dateien', async () => {
        const zip = await zipDatei('Abgaben.zip', { ...(await prueflingsOrdner('lena', await pdf(1))), ...(await prueflingsOrdner('max', await pdf(3))) });
        const befund = await leseZipAbgaben([zip]);
        const { arbeiten, nichtZuOeffnen } = await buendleAuswahl(befund, standardAuswahl(befund));
        expect(arbeiten.map(a => [a.name, a.datei.name])).toEqual([['lena', 'lena.pdf'], ['max', 'max.pdf']]);
        expect(arbeiten[0].textBeilagen).toContain('    return x  # lena');
        expect(nichtZuOeffnen).toEqual([]);
    });

    it('laesst Prueflinge ohne Auswahl weg und nimmt Unlesbares nie', async () => {
        const zip = await zipDatei('Abgaben.zip', { ...(await prueflingsOrdner('lena', await pdf(1))), ...(await prueflingsOrdner('max', await pdf(3))) });
        const befund = await leseZipAbgaben([zip]);
        const { arbeiten } = await buendleAuswahl(befund, {
            lena: ['transfer/sca/_collect/APT1/Kalkulation.ods', 'transfer/sca/_collect/APT1/transportkosten.py'],
            max: []
        });
        expect(arbeiten.map(a => a.name)).toEqual(['lena']);
        // Nur die .py ist uebrig — daraus wird eine Textdatei, die .ods kam nicht hinein.
        expect(arbeiten[0].datei.name).toBe('lena.txt');
    });
});

describe('alsZipArbeit', () => {
    /**
     * Keine Typ-Frage fuer ZIP-Abgaben (15.11.2026): „Digital" verlöre still jede
     * Seite ohne Textebene — Screenshots, Fotos, Scans — und wuerfelte Tabellen.
     */
    it('legt eine ZIP-Abgabe als Scan an, mit Namen und Text-Beilagen', () => {
        const datei = new File(['%PDF'], 'lena.pdf', { type: 'application/pdf' });
        const beilage = '=== Datei: a.py ===\nx = 1';
        const arbeit = alsZipArbeit({ name: 'lena', datei, textBeilagen: beilage });
        expect(arbeit.documentType).toBe('scanned');
        expect(arbeit.originalName).toBe('lena');
        expect(arbeit.files).toEqual([datei]);
        expect(arbeit.textBeilagen).toBe(beilage);
        expect(arbeit.status).toBe('pending');
    });
});
