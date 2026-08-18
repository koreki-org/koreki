import { renderHook, act } from '@testing-library/react';
import { useOcrActions } from '../../../src/hooks/file-processor/useOcrActions';
import { runExtractionStrategy } from '../../../src/lib/ai/extraction-logic';
import { useBatchStore } from '../../../src/hooks/store/useBatchStore';
import type { BatchFile, User, AppSettings, Task } from '../../../src/types';

jest.mock('../../../src/lib/ai/extraction-logic', () => ({ runExtractionStrategy: jest.fn() }));

/**
 * Texterkennung auf Zuruf (Layer 2)
 * 🔍🛡️
 *
 * Zwei Zusicherungen wiegen hier schwer:
 *
 * 1. DATENSCHUTZ. Ist eine Seite geschwärzt, MUSS die Erkennung die
 *    geschwärzte Fassung bekommen. Nimmt sie das Original, wandert genau der
 *    Name durch die Verarbeitung, den die Lehrkraft eben unkenntlich gemacht
 *    hat — und niemand merkt es, weil das Ergebnis gleich aussieht.
 * 2. ABRECHNUNG. Eine Erkennung zählt doppelt (Faktor 2). Wird der Faktor
 *    verschluckt, rechnet Koreki die Hälfte ab.
 *
 * Der Hook war ungeprüft (28,5 % Zweigabdeckung im Ordner).
 */

const bild = (name: string) => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });

const arbeit = (p: Partial<BatchFile> = {}): BatchFile => ({
    name: 'Schüler #1',
    status: 'pending',
    result: null,
    error: null,
    selected: true,
    ocrDone: false,
    files: [bild('seite.jpg')],
    documentType: 'scanned',
    pageCount: 1,
    ...p
} as BatchFile);

const baue = (p: { files?: BatchFile[]; userData?: User | null; ocrStrategy?: string } = {}) => {
    const dateien = p.files ?? [arbeit()];
    useBatchStore.setState({ batchFiles: dateien });

    const setBatchFiles = jest.fn();
    const internalProcessMapping = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useOcrActions({
        setBatchFiles,
        setCurrentProcessingIndex: jest.fn(),
        setIsLoadingBatch: jest.fn(),
        setUserData: jest.fn(),
        userData: p.userData ?? ({ appMode: 'STANDARD' } as User),
        settings: { provider: 'mistral' } as AppSettings,
        tasksLayout: [] as Task[],
        ocrStrategy: p.ocrStrategy,
        internalProcessMapping
    }));

    return { result, setBatchFiles, internalProcessMapping, dateien };
};

const standNach = (mock: jest.Mock, vorher: BatchFile[]): BatchFile[] => {
    const letzter = mock.mock.calls[mock.mock.calls.length - 1][0];
    return typeof letzter === 'function' ? letzter(vorher) : letzter;
};

beforeEach(() => {
    jest.clearAllMocks();
    (runExtractionStrategy as jest.Mock).mockResolvedValue({
        text: 'Der erkannte Text.',
        pageCount: 2,
        previewDataUrls: ['data:image/jpeg;base64,VORSCHAU']
    });
});

describe('Datenschutz', () => {
    /**
     * DIE WICHTIGSTE ZUSICHERUNG. Eine geschwärzte Seite darf die Verarbeitung
     * nur in ihrer geschwärzten Fassung verlassen.
     */
    it('schickt die geschwaerzte Fassung an die Erkennung, nicht das Original', async () => {
        const { result } = baue({
            files: [arbeit({
                isRedacted: true,
                redactedDataUrls: ['data:image/jpeg;base64,GESCHWAERZT']
            })]
        });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        const optionen = (runExtractionStrategy as jest.Mock).mock.calls[0][1];
        expect(optionen.sourceOverride).toBeDefined();
        expect(optionen.sourceOverride.buffers).toEqual(['GESCHWAERZT']);
    });

    /**
     * DERSELBE NACHWEIS FÜR DEN STAPEL.
     *
     * Er ist der Weg, den eine Lehrkraft für eine ganze Klasse nimmt — dort
     * wiegt ein Fehler also am schwersten. Beim Gegenprüfen mit einer bewusst
     * eingesetzten Änderung fiel auf, dass genau dieser Zweig ungeprüft war:
     * die Probe „Erkennung bekommt das Original statt der Schwärzung" rutschte
     * durch, weil nur der Einzelweg geprüft wurde. Zwei Wege, zwei Nachweise.
     */
    it('schickt auch im Stapel die geschwaerzte Fassung', async () => {
        const stapel = [arbeit({
            isRedacted: true,
            redactedDataUrls: ['data:image/jpeg;base64,GESCHWAERZT']
        })];
        const { result } = baue({ files: stapel });

        await act(async () => {
            await result.current.handleExtractOCR(stapel);
        });

        const optionen = (runExtractionStrategy as jest.Mock).mock.calls[0][1];
        expect(optionen.sourceOverride).toBeDefined();
        expect(optionen.sourceOverride.buffers).toEqual(['GESCHWAERZT']);
    });

    /** Ohne Schwärzung übernimmt der Standardweg — dafür bleibt die Quelle leer. */
    it('laesst die Quelle offen, wenn nichts geschwaerzt ist', async () => {
        const { result } = baue({ files: [arbeit({ isRedacted: false })] });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect((runExtractionStrategy as jest.Mock).mock.calls[0][1].sourceOverride).toBeUndefined();
    });

    /**
     * Als „geschwärzt" markiert, aber ohne Bilder: dann darf NICHT stillschweigend
     * das Original genommen werden. `resolveOCRSource` liefert `null`, der
     * Standardweg greift — der Fall ist damit sichtbar, nicht unterlaufen.
     */
    it('faellt bei leerer Schwaerzungsliste nicht auf das Original zurueck', async () => {
        const { result } = baue({ files: [arbeit({ isRedacted: true, redactedDataUrls: [] })] });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect((runExtractionStrategy as jest.Mock).mock.calls[0][1].sourceOverride).toBeUndefined();
    });
});

describe('Abrechnung und Aufbereitung', () => {
    /** Eine Erkennung zaehlt doppelt — auf BEIDEN Wegen. */
    it('reicht den doppelten Kostenfaktor weiter (einzeln)', async () => {
        const { result, internalProcessMapping } = baue();

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect(internalProcessMapping.mock.calls[0][3]).toBe(2);
    });

    it('reicht den doppelten Kostenfaktor weiter (Stapel)', async () => {
        const stapel = [arbeit()];
        const { result, internalProcessMapping } = baue({ files: stapel });

        await act(async () => {
            await result.current.handleExtractOCR(stapel);
        });

        expect(internalProcessMapping.mock.calls[0][3]).toBe(2);
    });

    /** Die Seitenzahl der ERKENNUNG gewinnt — sie kennt das Dokument wirklich. */
    it('nimmt die erkannte Seitenzahl statt der geschaetzten', async () => {
        const { result, internalProcessMapping } = baue({ files: [arbeit({ pageCount: 1 })] });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect(internalProcessMapping.mock.calls[0][2]).toBe(2);
    });

    it('reicht den erkannten Text weiter', async () => {
        const { result, internalProcessMapping } = baue();

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect(internalProcessMapping.mock.calls[0][1]).toBe('Der erkannte Text.');
    });

    it('meldet eine Handschrift als aufwendig', async () => {
        const { result } = baue({ ocrStrategy: 'handwriting' });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect((runExtractionStrategy as jest.Mock).mock.calls[0][1].isComplex).toBe(true);
    });

    it('unterscheidet Scan und getippten Text', async () => {
        const { result } = baue({ files: [arbeit({ documentType: 'typed' })] });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect((runExtractionStrategy as jest.Mock).mock.calls[0][1].isScan).toBe(false);
    });
});

describe('Der Stapel', () => {
    it('uebergeht abgewaehlte und bereits erkannte Arbeiten', async () => {
        const stapel = [
            arbeit({ selected: false }),
            arbeit({ ocrDone: true }),
            arbeit()
        ];
        const { result } = baue({ files: stapel });

        await act(async () => {
            await result.current.handleExtractOCR(stapel);
        });

        expect(runExtractionStrategy).toHaveBeenCalledTimes(1);
    });

    /**
     * Anders als bei der Korrektur laeuft die Erkennung WEITER, wenn eine Seite
     * scheitert — die uebrigen Arbeiten sind davon unberuehrt.
     */
    it('erkennt weiter, wenn eine Arbeit scheitert', async () => {
        (runExtractionStrategy as jest.Mock)
            .mockRejectedValueOnce(new Error('unlesbar'))
            .mockResolvedValue({ text: 'Text', pageCount: 1 });
        const stapel = [arbeit(), arbeit()];
        const { result, setBatchFiles } = baue({ files: stapel });

        await act(async () => {
            await result.current.handleExtractOCR(stapel);
        });

        expect(runExtractionStrategy).toHaveBeenCalledTimes(2);
        expect(standNach(setBatchFiles as jest.Mock, stapel)[0].error).toContain('unlesbar');
    });

    /** Ein Abbruch haelt den GANZEN Stapel an, nicht nur die eine Arbeit. */
    it('haelt den Stapel beim Abbruch an', async () => {
        const abbruch = new DOMException('The user aborted a request.', 'AbortError');
        (runExtractionStrategy as jest.Mock).mockRejectedValue(abbruch);
        const stapel = [arbeit(), arbeit(), arbeit()];
        const { result } = baue({ files: stapel });

        await act(async () => {
            await result.current.handleExtractOCR(stapel);
        });

        expect(runExtractionStrategy).toHaveBeenCalledTimes(1);
    });
});

describe('Einzelne Arbeit', () => {
    /**
     * Vor der erneuten Erkennung wird die Arbeit zurueckgesetzt. Bliebe die
     * alte Note stehen, zeigte die Oberflaeche eine Bewertung zu einem Text,
     * den es nicht mehr gibt.
     */
    it('raeumt Ergebnis, Note und Fehler weg, bevor sie neu erkennt', async () => {
        const vorher = [arbeit({
            status: 'done', ocrDone: true, grade: '2', error: 'alt',
            result: { tasks: [] } as never
        })];
        const { result, setBatchFiles } = baue({ files: vorher });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        const ersterAufruf = (setBatchFiles as jest.Mock).mock.calls[0][0](vorher)[0];
        expect(ersterAufruf.result).toBeNull();
        expect(ersterAufruf.grade).toBeUndefined();
        expect(ersterAufruf.error).toBeNull();
        expect(ersterAufruf.ocrDone).toBe(false);
    });

    it('tut nichts, wenn die Arbeit keine Datei hat', async () => {
        const { result } = baue({ files: [arbeit({ files: [] })] });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect(runExtractionStrategy).not.toHaveBeenCalled();
    });

    it('setzt eine abgebrochene Arbeit auf "wartet" statt auf Fehler', async () => {
        const abbruch = new DOMException('The user aborted a request.', 'AbortError');
        (runExtractionStrategy as jest.Mock).mockRejectedValue(abbruch);
        const vorher = [arbeit()];
        const { result, setBatchFiles } = baue({ files: vorher });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        const nachher = standNach(setBatchFiles as jest.Mock, vorher)[0];
        expect(nachher.status).toBe('pending');
        expect(nachher.error).toBeNull();
    });

    /**
     * Eine Auslastung des Servers ist kein Fehler der Arbeit — sie geht nach
     * einer Wartezeit von allein weg. Die Meldung sagt deshalb, was zu tun ist.
     */
    it('nennt bei Auslastung die Wartezeit statt der technischen Ursache', async () => {
        const ausgelastet = Object.assign(new Error('429 Too Many Requests'), { status: 429 });
        (runExtractionStrategy as jest.Mock).mockRejectedValue(ausgelastet);
        const vorher = [arbeit()];
        const { result, setBatchFiles } = baue({ files: vorher });

        await act(async () => {
            await result.current.processSingleOCR(0);
        });

        expect(standNach(setBatchFiles as jest.Mock, vorher)[0].error).toMatch(/30s|ausgelastet/);
    });
});
