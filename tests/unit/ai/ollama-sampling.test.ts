import { berechneSamplingParameter, bestimmeModellArt } from '../../../src/lib/ai/ollama-sampling';
import type { AppSettings } from '../../../src/types';
import type { AIAction } from '../../../src/lib/ai/prompt-dispatch';

/**
 * Sampling-Disziplin fuer lokale Modelle (Layer 1)
 * 🌡️
 *
 * Der Skill `prompt-engineering` §4 nennt die Trennung nach Aufgabenart
 * ausdruecklich "Gesetz, nicht Konvention". Sie war bis 17.08.2026 mitten in
 * einer 678-Zeilen-Datei ausgeschrieben und hatte keinen einzigen Test.
 *
 * Was dabei auf dem Spiel steht:
 * - Zu HEISS beim Abschreiben einer Seite: Das Modell erfindet Schuelertext,
 *   und weil danach alles auf dem erfundenen Text aufbaut, faellt es nie auf.
 * - Zu KALT beim Bewerten: Das Modell erkennt nicht mehr, dass zwei
 *   Formulierungen dasselbe meinen, und zieht fuer Wortwahl Punkte ab.
 * - Zu KALT bei Qwen/Gemma im Freitext: Das Modell wiederholt denselben Satz,
 *   bis der Puffer voll ist. Die Korrektur bricht ab.
 */

const basis: AppSettings = {} as AppSettings;

const rechne = (
    action: AIAction,
    model: string,
    settings: Partial<AppSettings> = {},
    rest: { promptCharCount?: number; imageCount?: number; hasResponseSchema?: boolean } = {}
) => berechneSamplingParameter({
    action,
    model,
    settings: { ...basis, ...settings } as AppSettings,
    promptCharCount: rest.promptCharCount ?? 1000,
    imageCount: rest.imageCount ?? 0,
    hasResponseSchema: rest.hasResponseSchema ?? false
});

describe('Temperatur nach Aufgabenart', () => {
    /**
     * Die beiden Aufbereitungs-Aktionen ignorieren die Profileinstellung
     * VOLLSTAENDIG. Sie schreiben ab, was auf dem Blatt steht — ein im Profil
     * gesetzter Kulanzwert wuerde hier zum Erfinden verleiten.
     */
    it.each(['clean-and-analyze', 'clean-and-map'] as AIAction[])(
        '%s ignoriert eine im Profil gesetzte Temperatur',
        (action) => {
            const heiss = rechne(action, 'llama3', { temperature: 0.9 });
            const ohne = rechne(action, 'llama3');
            expect(heiss.temperature).toBe(ohne.temperature);
            expect(heiss.temperature).toBe(0.2);
        }
    );

    /**
     * Rechenketten und Variablen bilden eine Rechnung ab. Dort ist jede
     * Abweichung ein Fehler, kein Stil — also so kalt wie das Modell erlaubt.
     */
    it.each([
        'calc-trace-extraction',
        'generate-calc-trace',
        'variable-extraction'
    ] as AIAction[])('%s rechnet ohne Spielraum', (action) => {
        // llama hat keinen Stabilitaetsboden ausser der 0-Anhebung auf 0.1.
        expect(rechne(action, 'llama3').temperature).toBe(0.1);
    });

    it('laesst beim Bewerten Spielraum fuer gleichbedeutende Formulierungen', () => {
        expect(rechne('correction', 'llama3').temperature).toBeGreaterThan(0);
    });

    /** Bilderkennung ist Abschreiben. Kreativitaet waere hier Halluzination. */
    it('setzt bei der Bilderkennung keine eigene Kreativitaet an', () => {
        const r = rechne('vision', 'llama3');
        expect(r.art.isVision).toBe(true);
        // 0.0 aus der Regel, angehoben auf den Bild-Stabilitaetsboden.
        expect(r.temperature).toBe(0.4);
    });
});

describe('Stabilitaetsboden lokaler Modelle', () => {
    /**
     * Qwen wiederholt in Ollama bei sehr niedriger Temperatur im FREITEXT ganze
     * Absaetze. Nur dort greift der Boden — in strukturierter Ausgabe haelt das
     * Schema dagegen, und Determinismus ist wichtiger.
     */
    it('hebt Qwen im Freitext an, nicht in strukturierter Ausgabe', () => {
        const freitext = rechne('second-opinion', 'qwen3:8b', { temperature: 0.0 });
        expect(freitext.temperature).toBe(0.2);

        const strukturiert = rechne('second-opinion', 'qwen3:8b', { temperature: 0.0 }, { hasResponseSchema: true });
        expect(strukturiert.temperature).toBe(0.0);
    });

    it('haelt Gemma und MoE bei mindestens 0.5', () => {
        expect(rechne('correction', 'gemma3:12b', { temperature: 0.1 }).temperature).toBe(0.5);
        expect(rechne('correction', 'qwen3-a4b', { temperature: 0.1 }).temperature).toBe(0.5);
    });

    /**
     * Die dichten 31b/32b-Varianten tragen dieselben Namensbestandteile,
     * neigen aber nicht zur Wiederholungsschleife. Ihnen den Boden aufzuzwingen
     * hiesse, unnoetig Praezision zu verschenken.
     */
    it('nimmt die dichten 31b/32b-Varianten aus', () => {
        expect(bestimmeModellArt('correction', 'gemma3-32b-dense').isGemmaOrMoE).toBe(false);
        expect(rechne('correction', 'gemma3-32b-dense', { temperature: 0.1 }).temperature).toBe(0.1);
    });

    it('hebt eine glatte Null bei uebrigen Modellen auf 0.1', () => {
        expect(rechne('correction', 'llama3', { temperature: 0 }).temperature).toBe(0.1);
    });
});

describe('Denken', () => {
    /**
     * Struktur-Aktionen und Bilderkennung denken nicht laut: der Denktext
     * landete sonst in dem JSON, das sie erzeugen sollen.
     */
    it.each(['vision', 'clean-and-map', 'generate-graph'] as AIAction[])(
        '%s denkt nicht laut, auch wenn eingeschaltet',
        (action) => {
            expect(rechne(action, 'llama3', { enableThinking: true }).think).toBe(false);
        }
    );

    it('laesst die Korrektur laut denken, wenn eingeschaltet', () => {
        expect(rechne('correction', 'llama3', { enableThinking: true }).think).toBe(true);
        expect(rechne('correction', 'llama3', { enableThinking: false }).think).toBe(false);
    });

    it('erkennt Denk-Modelle am Namen', () => {
        expect(bestimmeModellArt('correction', 'deepseek-r1:8b').isReasoningModel).toBe(true);
        expect(bestimmeModellArt('correction', 'qwq:32b').isReasoningModel).toBe(true);
        expect(bestimmeModellArt('correction', 'llama3').isReasoningModel).toBe(false);
    });
});

describe('Kontextfenster', () => {
    /**
     * Wird der Bedarf unterschaetzt, schneidet Ollama den Prompt still ab — die
     * Bewertung laeuft dann auf einer halben Schuelerarbeit, ohne Fehlermeldung.
     */
    it('waechst mit der Prompt-Laenge', () => {
        const klein = rechne('correction', 'llama3', {}, { promptCharCount: 500 });
        const gross = rechne('correction', 'llama3', {}, { promptCharCount: 60000 });
        expect(gross.numCtx!).toBeGreaterThan(klein.numCtx!);
    });

    it('rechnet Seitenbilder mit ein', () => {
        const ohne = rechne('vision', 'llama3', {}, { imageCount: 0 });
        const mit = rechne('vision', 'llama3', {}, { imageCount: 3 });
        expect(mit.numCtx!).toBeGreaterThan(ohne.numCtx!);
    });

    /**
     * Denkt das Modell laut, braucht es Platz fuer den Denktext ZUSAETZLICH zur
     * Antwort. Ohne den groesseren Puffer faellt die eigentliche Antwort hinten
     * heraus.
     */
    it('legt fuer lautes Denken einen groesseren Puffer an', () => {
        const still = rechne('correction', 'llama3', { enableThinking: false }, { promptCharCount: 8000 });
        const laut = rechne('correction', 'llama3', { enableThinking: true }, { promptCharCount: 8000 });
        expect(laut.numCtx!).toBeGreaterThan(still.numCtx!);
    });

    it('sichert Rechenketten ein Mindestfenster von 16k zu', () => {
        expect(rechne('generate-calc-trace', 'llama3', {}, { promptCharCount: 10 }).numCtx)
            .toBeGreaterThanOrEqual(16384);
    });

    it('nimmt eine ausdrueckliche Einstellung unveraendert an', () => {
        expect(rechne('correction', 'llama3', { ollamaNumCtx: 4096 }).numCtx).toBe(4096);
    });

    /**
     * Cloud-Varianten kennen `num_ctx` nicht und brechen bei abweichenden
     * Werten ab. Dort entscheidet der Server.
     */
    it('ueberlaesst Cloud-Varianten die Entscheidung', () => {
        expect(rechne('correction', 'qwen3:480b-cloud', { ollamaNumCtx: 8192 }).numCtx).toBeUndefined();
    });

    /** Antwortlaenge und Prompt teilen sich EIN Fenster. */
    it('laesst der Antwort immer Platz im Fenster', () => {
        const r = rechne('correction', 'llama3', { ollamaNumCtx: 8192 }, { promptCharCount: 100000 });
        expect(r.maxTokens).toBeGreaterThanOrEqual(1000);
        expect(r.numCtx).toBe(8192);
    });

    it('deckelt Struktur-Aktionen bei 8192 Antwort-Token', () => {
        expect(rechne('clean-and-map', 'llama3', { maxTokens: 32768 }).maxTokens)
            .toBeLessThanOrEqual(8192);
    });
});
