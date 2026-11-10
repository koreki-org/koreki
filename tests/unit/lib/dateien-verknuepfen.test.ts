import { verknuepfeDateien, meldeVerknuepfung } from '@/lib/dateien-verknuepfen';

/**
 * Nachgereichte Dateien finden zur richtigen Arbeit (Layer 1).
 * S. Kopf von `src/lib/dateien-verknuepfen.ts`.
 */

const datei = (name: string) => new File(['x'], name, { type: 'application/pdf' });

interface Eintrag {
    name: string;
    files?: File[];
    originalName?: string;
    splitInfo?: { originalIdx: number; originalName: string; sourceFileName?: string };
    pageRange?: [number, number];
}

const einzel = (originalName: string): Eintrag => ({ name: 'Schüler #1', originalName });
const teil = (sammel: string, schueler: string | undefined, von: number, bis: number): Eintrag => ({
    name: 'Schüler #1',
    originalName: schueler,
    splitInfo: { originalIdx: 0, originalName: 'Schüler #1', sourceFileName: sammel },
    pageRange: [von, bis]
});

describe('verknuepfeDateien', () => {
    it('ordnet Einzel-PDFs ueber den Dateinamen zu, unabhaengig von der Auswahl-Reihenfolge', () => {
        const mueller = datei('Mueller_Max.pdf');
        const schmidt = datei('Schmidt_Lea.pdf');
        const { liste, verknuepft, uebrig } = verknuepfeDateien(
            [einzel('Mueller_Max'), einzel('Schmidt_Lea')],
            [schmidt, mueller]
        );
        expect(liste[0].files).toEqual([mueller]);
        expect(liste[1].files).toEqual([schmidt]);
        expect(verknuepft).toBe(2);
        expect(uebrig).toEqual([]);
    });

    it('verwechselt Schueler1 nicht mit Schueler10', () => {
        const zehn = datei('Schueler10.pdf');
        const eins = datei('Schueler1.pdf');
        // Schueler10 liegt ZUERST in der Auswahl — frueher gewann er.
        const { liste } = verknuepfeDateien([einzel('Schueler1'), einzel('Schueler10')], [zehn, eins]);
        expect(liste[0].files).toEqual([eins]);
        expect(liste[1].files).toEqual([zehn]);
    });

    it('ignoriert Gross/klein, Endung und Unicode-Form der Umlaute', () => {
        const nfd = datei('Jürgen.PDF'.normalize('NFD'));
        const { liste } = verknuepfeDateien([einzel('jürgen')], [nfd]);
        expect(liste[0].files).toEqual([nfd]);
    });

    it('meldet Dateien zurueck, die zu keiner Arbeit passen', () => {
        const fremd = datei('Klassenliste.pdf');
        const { verknuepft, uebrig } = verknuepfeDateien([einzel('Mueller_Max')], [fremd]);
        expect(verknuepft).toBe(0);
        expect(uebrig).toEqual([fremd]);
    });

    it('laesst Arbeiten mit Datei unangetastet', () => {
        const vorhanden = datei('Mueller_Max.pdf');
        const neu = datei('Mueller_Max.pdf');
        const eintrag: Eintrag = { ...einzel('Mueller_Max'), files: [vorhanden] };
        const { liste, uebrig } = verknuepfeDateien([eintrag], [neu]);
        expect(liste[0]).toBe(eintrag);
        expect(uebrig).toEqual([neu]);
    });

    it('gibt allen Teilen eines Sammel-PDFs dieselbe Datei und behaelt die Seitenbereiche', () => {
        const sammel = datei('Klasse7a.pdf');
        const { liste, verknuepft, uebrig } = verknuepfeDateien(
            [teil('Klasse7a', 'Max Mueller', 1, 3), teil('Klasse7a', undefined, 4, 6)],
            [sammel]
        );
        expect(liste.map(e => e.files)).toEqual([[sammel], [sammel]]);
        expect(liste.map(e => e.pageRange)).toEqual([[1, 3], [4, 6]]);
        expect(verknuepft).toBe(2);
        expect(uebrig).toEqual([]);
    });

    it('verknuepft einen Teil nicht ueber den Schuelernamen und eine Arbeit ohne Namen gar nicht', () => {
        const namensDatei = datei('Max Mueller.pdf');
        const { verknuepft } = verknuepfeDateien(
            [teil('Klasse7a', 'Max Mueller', 1, 3), { name: 'Schüler #2' }],
            [namensDatei]
        );
        expect(verknuepft).toBe(0);
    });
});

describe('meldeVerknuepfung', () => {
    const fremd = datei('Klassenliste.pdf');

    it('nennt beim Verknuepfen jede Datei, die nicht passte', () => {
        const text = meldeVerknuepfung({ liste: [], verknuepft: 2, uebrig: [fremd] }, 'verknuepfen');
        expect(text).toContain('2 Arbeit(en)');
        expect(text).toContain('Klassenliste.pdf');
    });

    it('nennt beim Hochladen nur die Zuordnung — der Rest sind neue Arbeiten', () => {
        const text = meldeVerknuepfung({ liste: [], verknuepft: 1, uebrig: [fremd] }, 'hochladen');
        expect(text).toContain('1 Arbeit(en)');
        expect(text).not.toContain('Klassenliste.pdf');
    });
});
