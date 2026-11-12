import JSZip from 'jszip';

/**
 * Wandelt schlichtes Markdown in eine Word-Datei (.docx).
 *
 * Gebaut für die Unterlagen, die Schulen herunterladen (11.11.2026): Die
 * Markdown-Datei im Repo ist die einzige Quelle, die Word-Datei wird daraus
 * ERZEUGT und nie von Hand gepflegt. Ein Wächter-Test erzeugt sie erneut und
 * vergleicht Byte für Byte — deshalb muss die Ausgabe deterministisch sein:
 * feste Zeitstempel im Archiv, keine Zufallswerte, keine Uhrzeit.
 *
 * Unterstützt genau das, was die Unterlagen brauchen: Überschriften (#, ##),
 * Absätze, Aufzählungen (*, -), nummerierte Listen, Tabellen, Trennlinien,
 * **fett**, *kursiv* und `Ausfüllfelder` — Letztere gelb hinterlegt, damit die
 * Schule sieht, was sie eintragen muss. Links werden als Text übernommen.
 */

export interface DocxMeta {
    titel: string;
    /** ISO-Datum (YYYY-MM-DD) — Erstellungs- und Änderungsdatum der Datei. */
    datum: string;
    autor?: string;
}

type Block =
    | { art: 'h1' | 'h2' | 'h3' | 'p'; text: string }
    | { art: 'liste'; nummeriert: boolean; punkte: string[] }
    | { art: 'tabelle'; zeilen: string[][]; kopf: boolean }
    | { art: 'linie' };

// --- Markdown → Blöcke -------------------------------------------------------

const AUFZAEHLUNG = /^\s*[*-]\s+(.*)$/;
const NUMMER = /^\s*\d+\.\s+(.*)$/;

function zellen(zeile: string): string[] {
    return zeile.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(z => z.trim());
}

export function zerlegeMarkdown(md: string): Block[] {
    const zeilen = md.replace(/\r\n/g, '\n').split('\n');
    const bloecke: Block[] = [];
    let i = 0;
    while (i < zeilen.length) {
        const zeile = zeilen[i];
        if (!zeile.trim()) { i++; continue; }

        const kopf = /^(#{1,3})\s+(.*)$/.exec(zeile);
        if (kopf) {
            const stufe = kopf[1].length;
            bloecke.push({ art: stufe === 1 ? 'h1' : stufe === 2 ? 'h2' : 'h3', text: kopf[2] });
            i++; continue;
        }
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(zeile)) { bloecke.push({ art: 'linie' }); i++; continue; }

        if (zeile.trim().startsWith('|')) {
            const roh: string[][] = [];
            let kopfzeile = false;
            while (i < zeilen.length && zeilen[i].trim().startsWith('|')) {
                const z = zellen(zeilen[i]);
                if (z.every(c => /^:?-+:?$/.test(c))) kopfzeile = roh.length === 1;
                else roh.push(z);
                i++;
            }
            // Eine leere Kopfzeile (`| | |`) trägt nichts — sie fällt weg.
            const ohneLeerenKopf = kopfzeile && roh[0].every(c => !c) ? roh.slice(1) : roh;
            bloecke.push({ art: 'tabelle', zeilen: ohneLeerenKopf, kopf: kopfzeile && ohneLeerenKopf === roh });
            continue;
        }

        const listenArt = AUFZAEHLUNG.test(zeile) ? AUFZAEHLUNG : NUMMER.test(zeile) ? NUMMER : null;
        if (listenArt) {
            const punkte: string[] = [];
            while (i < zeilen.length && listenArt.test(zeilen[i])) {
                punkte.push((listenArt.exec(zeilen[i]) as RegExpExecArray)[1]);
                i++;
            }
            bloecke.push({ art: 'liste', nummeriert: listenArt === NUMMER, punkte });
            continue;
        }

        const absatz: string[] = [];
        while (i < zeilen.length && zeilen[i].trim() && !/^(#|\||\s*[*-]\s|\s*\d+\.\s|-{3,})/.test(zeilen[i])) {
            absatz.push(zeilen[i].trim());
            i++;
        }
        if (absatz.length === 0) { absatz.push(zeile.trim()); i++; }
        bloecke.push({ art: 'p', text: absatz.join(' ') });
    }
    return bloecke;
}

// --- Inline: **fett**, *kursiv*, `Feld`, [Link](ziel) ------------------------

function xml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function lauf(text: string, opt: { fett?: boolean; kursiv?: boolean; feld?: boolean }): string {
    if (!text) return '';
    const eig = [
        opt.fett ? '<w:b/>' : '',
        opt.kursiv ? '<w:i/>' : '',
        opt.feld ? '<w:highlight w:val="yellow"/>' : '',
    ].join('');
    return `<w:r>${eig ? `<w:rPr>${eig}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

export function inline(text: string, grund: { fett?: boolean } = {}): string {
    const ohneLinks = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    const teile = ohneLinks.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return teile.map(t => {
        if (t.startsWith('**') && t.endsWith('**') && t.length > 4) return lauf(t.slice(2, -2), { fett: true });
        if (t.startsWith('`') && t.endsWith('`') && t.length > 2) return lauf(t.slice(1, -1), { ...grund, feld: true });
        if (t.startsWith('*') && t.endsWith('*') && t.length > 2) return lauf(t.slice(1, -1), { ...grund, kursiv: true });
        return lauf(t, grund);
    }).join('');
}

// --- Blöcke → WordprocessingML ----------------------------------------------

/** Spaltenbreiten in Fünfzigstel-Prozent (5000 = volle Breite). */
function spaltenBreiten(anzahl: number): number[] {
    if (anzahl === 2) return [1500, 3500];
    if (anzahl === 3) return [1300, 1850, 1850];
    return Array.from({ length: anzahl }, () => Math.floor(5000 / anzahl));
}

function tabelle(zeilen: string[][], kopf: boolean): string {
    const spalten = Math.max(...zeilen.map(z => z.length));
    const breiten = spaltenBreiten(spalten);
    const rows = zeilen.map((z, zi) => {
        const istKopf = kopf && zi === 0;
        const tcs = Array.from({ length: spalten }, (_, si) => {
            const schattierung = istKopf ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF0FB"/>' : '';
            return `<w:tc><w:tcPr><w:tcW w:w="${breiten[si]}" w:type="pct"/>${schattierung}</w:tcPr>`
                + `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>${inline(z[si] ?? '', { fett: istKopf })}</w:p></w:tc>`;
        }).join('');
        return `<w:tr>${istKopf ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${tcs}</w:tr>`;
    }).join('');
    const grid = breiten.map(() => '<w:gridCol/>').join('');
    return `<w:tbl><w:tblPr><w:tblStyle w:val="Tabelle"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`
        + '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';
}

function koerper(bloecke: Block[]): { body: string; nummerierungen: number } {
    let naechsteNummer = 2; // 1 = Aufzählung, ab 2 je nummerierte Liste eine eigene (Neustart bei 1)
    const teile = bloecke.map(b => {
        switch (b.art) {
            case 'h1': return `<w:p><w:pPr><w:pStyle w:val="Titel"/></w:pPr>${inline(b.text)}</w:p>`;
            case 'h2': return `<w:p><w:pPr><w:pStyle w:val="Ueberschrift1"/></w:pPr>${inline(b.text)}</w:p>`;
            case 'h3': return `<w:p><w:pPr><w:pStyle w:val="Ueberschrift2"/></w:pPr>${inline(b.text)}</w:p>`;
            case 'p': return `<w:p>${inline(b.text)}</w:p>`;
            case 'linie': return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="C9CCE0"/></w:pBdr></w:pPr></w:p>';
            case 'tabelle': return tabelle(b.zeilen, b.kopf);
            case 'liste': {
                const numId = b.nummeriert ? naechsteNummer++ : 1;
                return b.punkte.map(p =>
                    `<w:p><w:pPr><w:pStyle w:val="Liste"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>${inline(p)}</w:p>`
                ).join('');
            }
        }
    });
    const seite = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1247" w:right="1247" w:bottom="1247" w:left="1247" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>';
    return { body: teile.join('') + seite, nummerierungen: naechsteNummer - 2 };
}

// --- Paketteile --------------------------------------------------------------

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const KOPF = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const STYLES = `${KOPF}<w:styles ${W}>`
    + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="de-DE"/></w:rPr></w:rPrDefault>'
    + '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Standard"><w:name w:val="Normal"/></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Titel"><w:name w:val="Title"/><w:basedOn w:val="Standard"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:b/><w:color w:val="1E1B4B"/><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Ueberschrift1"><w:name w:val="heading 1"/><w:basedOn w:val="Standard"/><w:next w:val="Standard"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="4F46E5"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Ueberschrift2"><w:name w:val="heading 2"/><w:basedOn w:val="Standard"/><w:next w:val="Standard"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Liste"><w:name w:val="List Paragraph"/><w:basedOn w:val="Standard"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="360" w:hanging="360"/></w:pPr></w:style>'
    + '<w:style w:type="table" w:styleId="Tabelle"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders>'
    + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="C9CCE0"/>`).join('')
    + '</w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
    + '</w:styles>';

function numbering(anzahlNummeriert: number): string {
    const ebene = (format: string, text: string) =>
        `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl>`;
    const nummern = Array.from({ length: anzahlNummeriert }, (_, k) =>
        `<w:num w:numId="${k + 2}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`
    ).join('');
    return `${KOPF}<w:numbering ${W}>`
        + `<w:abstractNum w:abstractNumId="0">${ebene('bullet', '•')}</w:abstractNum>`
        + `<w:abstractNum w:abstractNumId="1">${ebene('decimal', '%1.')}</w:abstractNum>`
        + `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${nummern}</w:numbering>`;
}

const CONTENT_TYPES = `${KOPF}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    + '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + '</Types>';

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PAKET_RELS = `${KOPF}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>`
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + '</Relationships>';
const DOKUMENT_RELS = `${KOPF}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/>`
    + `<Relationship Id="rId2" Type="${REL}/numbering" Target="numbering.xml"/>`
    + '</Relationships>';

function core(meta: DocxMeta): string {
    const zeit = `${meta.datum}T00:00:00Z`;
    return `${KOPF}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
        + `<dc:title>${xml(meta.titel)}</dc:title><dc:creator>${xml(meta.autor ?? 'Koreki')}</dc:creator><dc:language>de-DE</dc:language>`
        + `<dcterms:created xsi:type="dcterms:W3CDTF">${zeit}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${zeit}</dcterms:modified>`
        + '</cp:coreProperties>';
}

export async function markdownZuDocx(md: string, meta: DocxMeta): Promise<Uint8Array> {
    const { body, nummerierungen } = koerper(zerlegeMarkdown(md));
    const dokument = `${KOPF}<w:document ${W}><w:body>${body}</w:body></w:document>`;

    // Fester Zeitstempel für jeden Archiv-Eintrag: dieselbe Quelle ergibt
    // dieselben Bytes, sonst könnte der Wächter-Test nicht vergleichen.
    // JSZip schreibt die DOS-Zeitfelder mit `getUTC*`. Der Zeitpunkt muss
    // also in UTC feststehen: Mitternacht in Ortszeit ergab auf dem Rechner
    // (MEZ) andere Bytes als in der CI (UTC) — der Wächter war dort rot
    // (12.11.2026), lokal grün.
    const [jahr, monat, tag] = meta.datum.split('-').map(Number);
    const date = new Date(Date.UTC(jahr, monat - 1, tag));
    const zip = new JSZip();
    zip.file('[Content_Types].xml', CONTENT_TYPES, { date, createFolders: false });
    zip.file('_rels/.rels', PAKET_RELS, { date, createFolders: false });
    zip.file('word/document.xml', dokument, { date, createFolders: false });
    zip.file('word/_rels/document.xml.rels', DOKUMENT_RELS, { date, createFolders: false });
    zip.file('word/styles.xml', STYLES, { date, createFolders: false });
    zip.file('word/numbering.xml', numbering(nummerierungen), { date, createFolders: false });
    zip.file('docProps/core.xml', core(meta), { date, createFolders: false });
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 9 } });
}
