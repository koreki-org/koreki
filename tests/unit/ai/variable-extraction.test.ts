import { extractStudentAnswersWithLLM } from '../../../src/lib/ai/variable-extraction';
import { executeMistralRequest } from '../../../src/lib/ai/mistral-provider';
import { executeOllamaRequest } from '../../../src/lib/ai/ollama-logic';
import { executeOpenAIRequest } from '../../../src/lib/ai/openai-provider';
import { isDesktopTarget } from '../../../src/lib/env-context';
import type { GradingGraph } from '../../../src/lib/grading/types';
import type { AppSettings } from '../../../src/types';

jest.mock('../../../src/lib/ai/mistral-provider', () => ({ executeMistralRequest: jest.fn() }));
jest.mock('../../../src/lib/ai/ollama-logic', () => ({ executeOllamaRequest: jest.fn() }));
jest.mock('../../../src/lib/ai/openai-provider', () => ({ executeOpenAIRequest: jest.fn() }));
jest.mock('../../../src/lib/env-context', () => ({ isDesktopTarget: jest.fn(() => false) }));

/**
 * Was die Bewertungs-Engine zu sehen bekommt (Layer 1)
 * 🔎⚖️
 *
 * Diese Funktion liest aus dem Schuelertext heraus, welchen Wert die Schuelerin
 * fuer jede Variable angegeben hat. Alles, was danach passiert — Vergleich,
 * Folgefehler-Kulanz, Punktevergabe — baut auf ihrem Ergebnis auf.
 *
 * Sie war vollstaendig ungeprueft (0 % Zweigabdeckung). Zwei ihrer Zusicherungen
 * entscheiden ueber die Gerechtigkeit der Bewertung, nicht bloss ueber
 * Robustheit:
 *
 * 1. Der ERWARTUNGSWERT wird aus der Anfrage entfernt. Saehe das Modell, was
 *    herauskommen soll, neigte es dazu, genau das zu berichten — und die
 *    Schuelerin bekaeme Punkte fuer eine Antwort, die sie nie gegeben hat.
 * 2. Die Temperatur ist 0.0. Abschreiben ist kein kreativer Vorgang; jede
 *    Abweichung waere eine erfundene Schuelerantwort.
 */

const graph = (): GradingGraph => ({
    taskId: 'aufgabe-1',
    discipline: 'mathematics',
    variables: [
        { id: 'ergebnis', type: 'input', validationType: 'exact', defaultValue: 42 },
        { id: 'weg', type: 'input', validationType: 'exact', defaultValue: 'Formel X' }
    ]
});

const settings = (p: Partial<AppSettings> = {}): AppSettings =>
    ({ provider: 'mistral', mistralKey: 'k', ...p }) as AppSettings;

const mistral = executeMistralRequest as jest.Mock;
const ollama = executeOllamaRequest as jest.Mock;
const openai = executeOpenAIRequest as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    (isDesktopTarget as jest.Mock).mockReturnValue(false);
    mistral.mockResolvedValue({});
    ollama.mockResolvedValue({});
    openai.mockResolvedValue({});
});

describe('Bewertungsgerechtigkeit', () => {
    /**
     * DIE WICHTIGSTE ZUSICHERUNG.
     *
     * `defaultValue` ist der erwartete Wert aus der Musterloesung. Ginge er mit
     * in die Anfrage, bekaeme das Modell die Loesung vorgelegt und sollte
     * gleichzeitig sagen, was die Schuelerin geschrieben hat. Modelle
     * uebernehmen in dieser Lage bevorzugt den vorgelegten Wert — die Bewertung
     * bestaetigte dann sich selbst.
     */
    it('entfernt den Erwartungswert aus der Anfrage ans Modell', async () => {
        await extractStudentAnswersWithLLM('Mein Ergebnis ist 7', graph(), 'PURE', settings());

        const payload = mistral.mock.calls[0][1];
        expect(payload.variables).toHaveLength(2);
        payload.variables.forEach((v: Record<string, unknown>) => {
            expect(v).not.toHaveProperty('defaultValue');
        });
    });

    /** Der Graph selbst darf dabei nicht beschaedigt werden — er wird weiterbenutzt. */
    it('laesst den uebergebenen Graphen unveraendert', async () => {
        const g = graph();
        await extractStudentAnswersWithLLM('x', g, 'PURE', settings());

        expect(g.variables[0].defaultValue).toBe(42);
        expect(g.variables[1].defaultValue).toBe('Formel X');
    });

    /**
     * Abschreiben ist kein kreativer Vorgang (prompt-engineering §4). Jede
     * Abweichung waere eine erfundene Schuelerantwort — und die faellt
     * niemandem auf, weil sie plausibel aussieht.
     */
    it('fordert Temperatur 0.0 an', async () => {
        await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings());
        expect(mistral.mock.calls[0][3].temperature).toBe(0);
    });

    it('fordert auch beim OpenAI-Weg Temperatur 0.0 an', async () => {
        await extractStudentAnswersWithLLM('x', graph(), 'PURE',
            settings({ provider: 'openai-compatible', openaiUrl: 'u', openaiKey: 'k' }));
        expect(openai.mock.calls[0][4].temperature).toBe(0);
    });

    it('reicht den Schuelertext unveraendert weiter', async () => {
        const text = 'Antwort: 7,5 mA  (gerundet)';
        await extractStudentAnswersWithLLM(text, graph(), 'PURE', settings());
        expect(mistral.mock.calls[0][1].studentText).toBe(text);
    });
});

describe('Auswertung der Modell-Antwort', () => {
    it('uebernimmt Zahlen und Zeichenketten', async () => {
        mistral.mockResolvedValue({ ergebnis: 7, weg: 'Dreisatz' });

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings()))
            .toEqual({ ergebnis: 7, weg: 'Dreisatz' });
    });

    /** Modelle liefern Zahlen oft als Text. Die Engine rechnet mit Zahlen. */
    it('macht aus einer Zahl in Textform eine Zahl', async () => {
        mistral.mockResolvedValue({ ergebnis: ' 7.5 ', weg: '-3' });

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings()))
            .toEqual({ ergebnis: 7.5, weg: -3 });
    });

    it('laesst eine echte Textantwort Text bleiben', async () => {
        mistral.mockResolvedValue({ weg: '7 Aepfel' });

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings()))
            .toEqual({ weg: '7 Aepfel' });
    });

    /**
     * REGRESSION. Ein Objekt oder eine Liste haette in der Engine still JEDEN
     * Vergleich verloren und die Aufgabe als falsch bewertet. Frueher landete
     * so ein Wert trotzdem in der Auswertung, weil der Typ `any` war.
     */
    it('verwirft Werte, die kein Skalar sind', async () => {
        mistral.mockResolvedValue({ ergebnis: { wert: 7 }, weg: ['a', 'b'] });

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings())).toEqual({});
    });

    /**
     * „Nicht gefunden" und „als leer erkannt" sind verschieden. Die Engine
     * unterscheidet unbeantwortet von falsch beantwortet — deshalb darf hier
     * kein Wert erfunden werden.
     */
    it('uebergeht fehlende Werte, statt sie zu belegen', async () => {
        mistral.mockResolvedValue({ ergebnis: null, weg: undefined });

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings())).toEqual({});
    });

    /** Nur was im Graphen steht, zaehlt — ein erfundener Schluessel nicht. */
    it('nimmt keine Variablen an, die der Graph nicht kennt', async () => {
        mistral.mockResolvedValue({ ergebnis: 7, erfunden: 99 });

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings()))
            .toEqual({ ergebnis: 7 });
    });

    it('nimmt Wahrheitswerte an', async () => {
        mistral.mockResolvedValue({ ergebnis: true });

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings()))
            .toEqual({ ergebnis: true });
    });
});

describe('Anbieterwahl', () => {
    it('nutzt im PURE-Modus Ollama, wenn eingestellt', async () => {
        await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings({ provider: 'ollama' }));

        expect(ollama).toHaveBeenCalledWith('variable-extraction', expect.anything(), expect.anything());
        expect(mistral).not.toHaveBeenCalled();
    });

    /** Die Desktop-Fassung rechnet immer lokal, unabhaengig vom Modus. */
    it('rechnet auf dem Desktop lokal, auch ohne PURE', async () => {
        (isDesktopTarget as jest.Mock).mockReturnValue(true);

        await extractStudentAnswersWithLLM('x', graph(), 'STANDARD', settings({ provider: 'ollama' }));

        expect(ollama).toHaveBeenCalled();
    });
});

describe('Wenn etwas schiefgeht', () => {
    /**
     * Die Extraktion darf die Korrektur NICHT abbrechen. Ohne erkannte Werte
     * bewertet die Engine als „nicht beantwortet" — das ist nachvollziehbar
     * und von Hand korrigierbar. Eine Ausnahme bis nach oben risse dagegen die
     * ganze Arbeit mit.
     */
    it('liefert eine leere Belegung, wenn der Anbieter wirft', async () => {
        mistral.mockRejectedValue(new Error('503 Service Unavailable'));

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings())).toEqual({});
    });

    it('liefert eine leere Belegung, wenn im PURE-Modus der Schluessel fehlt', async () => {
        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings({ mistralKey: undefined })))
            .toEqual({});
        expect(mistral).not.toHaveBeenCalled();
    });

    it('liefert eine leere Belegung ohne Einstellungen', async () => {
        expect(await extractStudentAnswersWithLLM(
            'x', graph(), 'PURE', undefined as unknown as AppSettings
        )).toEqual({});
    });

    /**
     * Im STANDARD-Modus laeuft die Extraktion auf dem SERVER. Im Browser gibt
     * es dafuer keinen Weg — hier faellt die Bewertung auf „nicht beantwortet"
     * zurueck, statt einen Anbieter-Schluessel im Client zu suchen.
     */
    it('ruft im Browser keinen Anbieter fuer den Server-Modus auf', async () => {
        expect(await extractStudentAnswersWithLLM('x', graph(), 'STANDARD', settings())).toEqual({});
        expect(mistral).not.toHaveBeenCalled();
        expect(ollama).not.toHaveBeenCalled();
        expect(openai).not.toHaveBeenCalled();
    });

    it('kommt mit einer Antwort zurecht, die gar kein Objekt ist', async () => {
        mistral.mockResolvedValue('kein Objekt');

        expect(await extractStudentAnswersWithLLM('x', graph(), 'PURE', settings())).toEqual({});
    });
});
