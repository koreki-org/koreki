import { renderHook, act } from '@testing-library/react';
import { useCorrectionRun } from '../../../src/hooks/file-processor/useCorrectionRun';
import { performAIRequest } from '../../../src/lib/ai/ai-orchestrator';
import { useBatchStore } from '../../../src/hooks/store/useBatchStore';
import type { BatchFile, Task, User, AppSettings, AiStatus } from '../../../src/types';
import { meldeHinweis } from '@/lib/notify';

jest.mock('@/lib/notify', () => ({
    meldeErfolg: jest.fn(),
    meldeHinweis: jest.fn(),
    meldeFehler: jest.fn(),
    meldeNachNeuladen: jest.fn()
}));

jest.mock('../../../src/lib/ai/ai-orchestrator', () => ({
    performAIRequest: jest.fn(),
    parseCorrectionResult: jest.fn()
}));
jest.mock('../../../src/lib/grading-memory-sync', () => ({
    ensureActiveGradingMemorySynced: jest.fn().mockResolvedValue(undefined)
}));

/**
 * Der Korrektur-Lauf (Layer 2)
 * ✍️💳
 *
 * Hier faellt die Bewertung UND die Abrechnung. Drei Zusicherungen kosten
 * unmittelbar Geld oder Vertrauen, wenn sie brechen:
 *
 * 1. Im PURE-Modus werden KEINE Credits abgezogen — die Lehrkraft rechnet dort
 *    mit ihrem eigenen Anbieter-Schluessel ab.
 * 2. Die Budgetbremse haelt den Lauf an, BEVOR ein Aufruf hinausgeht.
 * 3. Ohne Schuelertext wird gar nicht erst gefragt. Ein Aufruf auf leerem Text
 *    kostet dasselbe wie einer auf einer vollen Arbeit und liefert nichts.
 *
 * Der Hook war ungeprueft (28,5 % Zweigabdeckung im ganzen Ordner).
 */

const arbeit = (p: Partial<BatchFile> = {}): BatchFile => ({
    name: 'Schüler #1',
    status: 'pending',
    result: null,
    error: null,
    selected: true,
    fileText: 'Die abgegebene Antwort der Schülerin.',
    pageCount: 1,
    ...p
} as BatchFile);

const nutzer = (appMode: User['appMode'], credits = 100): User =>
    ({ id: 'u1', logtoId: 'l1', username: 'T', credits, appMode, avvAccepted: true } as User);

const aufgabe = (name: string): Task => ({ name, maxPoints: 10 } as Task);

const baue = (p: {
    files?: BatchFile[];
    userData?: User | null;
    modelSolution?: string;
    tasksLayout?: Task[];
} = {}) => {
    const dateien = p.files ?? [arbeit()];
    useBatchStore.setState({ batchFiles: dateien });

    const setBatchFiles = jest.fn();
    const setUserData = jest.fn();
    const setCurrentProcessingIndex = jest.fn();
    const setIsLoadingBatch = jest.fn();

    const { result } = renderHook(() => useCorrectionRun({
        setBatchFiles,
        setCurrentProcessingIndex,
        setIsLoadingBatch,
        setUserData,
        userData: p.userData ?? nutzer('STANDARD'),
        settings: { provider: 'mistral' } as AppSettings,
        modelSolution: p.modelSolution ?? 'Die Musterlösung',
        tasksLayout: p.tasksLayout ?? [aufgabe('Aufgabe 1')]
    }));

    return { result, setBatchFiles, setUserData, setCurrentProcessingIndex, setIsLoadingBatch };
};

/** Wendet den letzten an `setBatchFiles` uebergebenen Aktualisierer an. */
const standNach = (mock: jest.Mock, vorher: BatchFile[]): BatchFile[] => {
    const letzter = mock.mock.calls[mock.mock.calls.length - 1][0];
    return typeof letzter === 'function' ? letzter(vorher) : letzter;
};

const antwort = (p: Record<string, unknown> = {}) => ({
    tasks: [{ name: 'Aufgabe 1', pointsObtained: 8, content: 'Antwort' }],
    overallMatchPercentage: 80,
    ...p
});

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (performAIRequest as jest.Mock).mockResolvedValue(antwort());
});

describe('Abrechnung', () => {
    /**
     * DIE ABRECHNUNGSREGEL. Im PURE-Modus laeuft die Anfrage ueber den
     * Schluessel der Lehrkraft — Koreki darf dafuer nichts berechnen.
     */
    it('zieht im PURE-Modus keine Credits ab', async () => {
        const { result, setUserData } = baue({ userData: nutzer('PURE') });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        expect(performAIRequest).toHaveBeenCalled();
        expect(setUserData).not.toHaveBeenCalled();
    });

    it('zieht im STANDARD-Modus einen Credit je Seite ab', async () => {
        const { result, setUserData } = baue({
            files: [arbeit({ pageCount: 3 })],
            userData: nutzer('STANDARD', 100)
        });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        const neu = setUserData.mock.calls[0][0](nutzer('STANDARD', 100));
        expect(neu.credits).toBe(97);
    });

    /** Ein Guthaben darf nie negativ werden. */
    it('bleibt bei null stehen statt ins Minus zu laufen', async () => {
        const { result, setUserData } = baue({
            files: [arbeit({ pageCount: 5 })],
            userData: nutzer('STANDARD', 2)
        });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        expect(setUserData.mock.calls[0][0](nutzer('STANDARD', 2)).credits).toBe(0);
    });

    /** Was nicht bewertet wurde, kostet auch nichts. */
    it('rechnet nichts ab, wenn die Bewertung scheitert', async () => {
        (performAIRequest as jest.Mock).mockRejectedValue(new Error('503'));
        const { result, setUserData } = baue();

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        expect(setUserData).not.toHaveBeenCalled();
    });
});

describe('Wann gar nicht erst gefragt wird', () => {
    /**
     * Ein Aufruf auf leerem Text kostet dasselbe wie einer auf einer vollen
     * Arbeit — und liefert nichts. Die Arbeit wird stattdessen als fehlerhaft
     * markiert, damit die Lehrkraft sie sieht.
     */
    it('fragt nicht, wenn kein Schuelertext da ist', async () => {
        const dateien = [arbeit({ fileText: '   ', tasks: [] })];
        const { result, setBatchFiles } = baue({ files: dateien });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        expect(performAIRequest).not.toHaveBeenCalled();
        expect(standNach(setBatchFiles as jest.Mock, dateien)[0].status).toBe('error');
    });

    it('uebergeht eine abgewaehlte Arbeit', async () => {
        const { result } = baue({ files: [arbeit({ selected: false })] });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        expect(performAIRequest).not.toHaveBeenCalled();
    });

    /** Eine fertige Arbeit wird nicht zweimal bezahlt. */
    it('uebergeht eine bereits fertige Arbeit', async () => {
        const { result } = baue({ files: [arbeit({ status: 'done', result: antwort() as never })] });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        expect(performAIRequest).not.toHaveBeenCalled();
    });

    it('bewertet eine fertige Arbeit auf ausdrueckliche Anforderung neu', async () => {
        const { result } = baue({ files: [arbeit({ status: 'done', result: antwort() as never })] });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0, undefined, true);
        });

        expect(performAIRequest).toHaveBeenCalled();
    });

    /** DIE BUDGETBREMSE. Sie muss greifen, bevor etwas hinausgeht. */
    it('haelt den Stapel an, wenn die Budgetbremse aktiv ist', async () => {
        const { result } = baue();
        const gebremst = { correctionBrakeActive: true, message: 'Budget erschöpft' } as AiStatus;

        await act(async () => {
            await result.current.processBatch(gebremst);
        });

        expect(performAIRequest).not.toHaveBeenCalled();
        expect(meldeHinweis).toHaveBeenCalledWith('Budget erschöpft');
    });

    it('verlangt eine Musterloesung, bevor der Stapel laeuft', async () => {
        const { result } = baue({ modelSolution: '' });

        await act(async () => {
            await result.current.processBatch(null);
        });

        expect(performAIRequest).not.toHaveBeenCalled();
        expect(meldeHinweis).toHaveBeenCalledWith(expect.stringMatching(/Musterlösung/));
    });
});

describe('Welcher Text bewertet wird', () => {
    /**
     * REGRESSION. Wird eine FERTIGE Arbeit erneut bewertet, stehen die
     * Korrekturen der Lehrkraft in `result.tasks` — nicht in `tasks`. Wer die
     * falsche Quelle nimmt, bewertet die unkorrigierte Fassung und verwirft die
     * Handarbeit stillschweigend.
     */
    it('nimmt bei einer erneuten Bewertung die bearbeiteten Texte', async () => {
        const dateien = [arbeit({
            status: 'done',
            tasks: [{ name: 'Aufgabe 1', content: 'ROHTEXT AUS DER ERKENNUNG' } as Task],
            result: {
                tasks: [{ name: 'Aufgabe 1', content: 'VON HAND KORRIGIERT' }]
            } as never
        })];
        const { result } = baue({ files: dateien });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0, undefined, true);
        });

        const gesendet = (performAIRequest as jest.Mock).mock.calls[0][1].studentText;
        expect(gesendet).toContain('VON HAND KORRIGIERT');
        expect(gesendet).not.toContain('ROHTEXT AUS DER ERKENNUNG');
    });

    it('setzt die Aufgaben mit ihren Ueberschriften zusammen', async () => {
        const dateien = [arbeit({
            tasks: [
                { name: 'Aufgabe 1', content: 'Erste Antwort' } as Task,
                { name: 'Aufgabe 2', content: 'Zweite Antwort' } as Task
            ]
        })];
        const { result } = baue({ files: dateien });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        const gesendet = (performAIRequest as jest.Mock).mock.calls[0][1].studentText;
        expect(gesendet).toContain('### Aufgabe 1 ###');
        expect(gesendet).toContain('Erste Antwort');
        expect(gesendet).toContain('### Aufgabe 2 ###');
    });

    /** Ohne zugeordnete Aufgaben zaehlt der Rohtext der Datei. */
    it('faellt ohne Aufgabenzuordnung auf den Rohtext zurueck', async () => {
        const { result } = baue({ files: [arbeit({ tasks: [], fileText: 'Der ganze Text.' })] });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        expect((performAIRequest as jest.Mock).mock.calls[0][1].studentText).toBe('Der ganze Text.');
    });
});

describe('Was nach der Bewertung im Stapel steht', () => {
    it('setzt Ergebnis, Note und Dauer', async () => {
        const dateien = [arbeit()];
        const { result, setBatchFiles } = baue({ files: dateien });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        const nachher = standNach(setBatchFiles as jest.Mock, dateien)[0];
        expect(nachher.status).toBe('done');
        expect(nachher.grade).toBeTruthy();
        expect(nachher.inferenceDuration).toBeGreaterThanOrEqual(0);
        expect(nachher.error).toBeNull();
    });

    /**
     * Ein ABBRUCH durch die Lehrkraft ist kein Fehler. Die Arbeit geht zurueck
     * auf „wartet" — rot gefaerbt saehe sie aus wie eine gescheiterte
     * Bewertung, und niemand traute sich, sie erneut zu starten.
     */
    it('setzt eine abgebrochene Arbeit auf "wartet" statt auf Fehler', async () => {
        const abbruch = new DOMException('The user aborted a request.', 'AbortError');
        (performAIRequest as jest.Mock).mockRejectedValue(abbruch);
        const dateien = [arbeit()];
        const { result, setBatchFiles } = baue({ files: dateien });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        const nachher = standNach(setBatchFiles as jest.Mock, dateien)[0];
        expect(nachher.status).toBe('pending');
        expect(nachher.error).toBeNull();
    });

    it('haelt den Fehlertext fest, wenn die Bewertung scheitert', async () => {
        (performAIRequest as jest.Mock).mockRejectedValue(new Error('KI-Server ausgelastet'));
        const dateien = [arbeit()];
        const { result, setBatchFiles } = baue({ files: dateien });

        await act(async () => {
            await result.current.internalCorrectionPipeline(0);
        });

        const nachher = standNach(setBatchFiles as jest.Mock, dateien)[0];
        expect(nachher.status).toBe('error');
        expect(nachher.error).toContain('KI-Server ausgelastet');
    });

    /**
     * Ein Fehlschlag bei EINER Arbeit darf die uebrigen nicht verhindern —
     * sonst haelt eine einzelne kaputte Abgabe den ganzen Stapel auf.
     */
    it('bewertet den Stapel weiter, wenn eine Arbeit scheitert', async () => {
        (performAIRequest as jest.Mock)
            .mockRejectedValueOnce(new Error('kaputt'))
            .mockResolvedValue(antwort());
        const { result } = baue({ files: [arbeit(), arbeit(), arbeit()] });

        await act(async () => {
            await result.current.processBatch(null);
        });

        expect(performAIRequest).toHaveBeenCalledTimes(3);
    });
});
