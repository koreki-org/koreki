import { buildPromptForAction, PromptPayload } from '@/lib/ai/prompt-dispatch';
import type { AIAction } from '@/lib/ai/prompt-dispatch';

/**
 * Prompt-Zuordnung, gemeinsam fuer alle Anbieter (Layer 1)
 * 🧭
 *
 * Diese Zuordnung stand dreimal da — je einmal in mistral-provider,
 * openai-provider und ollama-logic. Sie entscheidet, welche Instruktion das
 * Modell fuer eine Aktion bekommt, und ist damit das Herz der Bewertung.
 *
 * Der Compiler haelt ueber den `never`-Zweig fest, dass keine Aktion FEHLT.
 * Diese Datei haelt fest, dass jede auch ein brauchbares Ergebnis liefert —
 * eine Aktion, die still einen leeren Prompt zurueckgibt, waere fuer den
 * Compiler in Ordnung und fuer den Lehrer eine unbrauchbare Korrektur.
 */

/** Alle Aktionen, die ein Anbieter ueber diese Zuordnung schicken kann. */
const ALLE_AKTIONEN: AIAction[] = [
    'correction',
    'clean-and-analyze',
    'clean-and-map',
    'vision',
    'student-simulator',
    'anonymize',
    'second-opinion',
    'generate-graph',
    'refine-graph',
    'variable-extraction',
    'generate-calc-trace',
    'calc-trace-extraction'
];

/** Ein Payload, der alle Felder aller Aktionen fuellt. */
const vollerPayload: PromptPayload = {
    modelSolution: 'Musterlösung: 2 + 2 = 4',
    studentText: 'Schülerantwort: 2 + 2 = 5',
    text: 'Roher Text',
    tasksLayout: [{ name: 'A1', maxPoints: 5 }],
    selectedTasks: ['A1'],
    taskName: 'A1',
    taskInstructions: 'Rechne',
    sampleSolution: '4',
    maxPoints: 5,
    currentPoints: 2,
    currentFeedback: 'Fast',
    teacherDoubt: 'Zu streng?',
    chatHistory: [],
    taskText: 'Berechne 2 + 2',
    discipline: 'mathematik',
    userNotes: 'Kulant bewerten',
    currentGraph: { taskId: 't1', discipline: 'mathematik', variables: [] },
    userInstruction: 'Mach es strenger',
    variables: [{ id: 'x', label: 'X' }],
    extractionInstructions: 'Nimm die letzte Zahl',
    expectedValues: [{ id: 'x', label: 'X' }],
    systemPrompt: 'System',
    correctionInstruction: 'Nachbessern'
};

describe('buildPromptForAction', () => {
    it.each(ALLE_AKTIONEN)('liefert fuer "%s" einen nutzbaren Prompt', (aktion) => {
        const prompt = buildPromptForAction(aktion, vollerPayload, { model: 'qwen3:8b' });

        expect(typeof prompt.system).toBe('string');
        expect(prompt.system.length).toBeGreaterThan(0);
        expect(typeof prompt.user).toBe('string');
    });

    /**
     * Der Grund fuer `pflicht()`: die Bauer setzen ihre Pflichtfelder
     * unveraendert in Textbausteine ein. Kam dort `undefined` an — moeglich,
     * solange der Payload `any` war —, stand im Prompt das WORT "undefined",
     * und das Modell hat es als Aufgabentext gelesen.
     */
    it.each(ALLE_AKTIONEN.filter(a => a !== 'refine-graph'))(
        'schreibt bei leerem Payload kein "undefined" in den Prompt fuer "%s"',
        (aktion) => {
            const prompt = buildPromptForAction(aktion, {}, {});

            expect(prompt.system).not.toContain('undefined');
            expect(prompt.user).not.toContain('undefined');
        }
    );

    /**
     * `refine-graph` ist der eine Fall, in dem ein leerer Payload nicht
     * reparierbar ist: ohne bestehenden Graphen gibt es nichts zu verfeinern.
     * Ihn als `undefined` durchzureichen ergaebe einen Prompt, in dem das WORT
     * "undefined" als aktueller Graph steht — das Modell erfindet daraufhin
     * einen neuen, statt den vorhandenen zu aendern. Der Lehrer sieht dann
     * seine Anpassung nicht, sondern einen fremden Graphen.
     */
    it('wirft, wenn refine-graph ohne bestehenden Graphen aufgerufen wird', () => {
        expect(() => buildPromptForAction('refine-graph', { taskText: 'A', userInstruction: 'B' }))
            .toThrow(/ohne currentGraph/);
    });

    /**
     * Der Kern der Zusammenlegung: derselbe Aufruf muss fuer jeden Anbieter
     * dasselbe ergeben. Vorher war das nur eine Hoffnung — drei getrennt
     * gepflegte Ketten koennen Gleichheit nicht zusichern.
     */
    it('liefert fuer dieselbe Eingabe denselben Prompt, egal welcher Anbieter fragt', () => {
        const alsMistral = buildPromptForAction('correction', vollerPayload, {
            model: 'mistral-medium-latest',
            customPrompt: 'Sei kulant',
            activeSkillIds: ['skill-a']
        });
        const alsOllama = buildPromptForAction('correction', vollerPayload, {
            model: 'mistral-medium-latest',
            customPrompt: 'Sei kulant',
            activeSkillIds: ['skill-a']
        });

        expect(alsOllama).toEqual(alsMistral);
    });

    it('bringt die Zusatzanweisung der Lehrkraft in den Korrektur-Prompt', () => {
        const ohne = buildPromptForAction('correction', vollerPayload, {});
        const mit = buildPromptForAction('correction', vollerPayload, { customPrompt: 'ZUSATZREGEL-XYZ' });

        expect(mit).not.toEqual(ohne);
        expect(mit.system + mit.user).toContain('ZUSATZREGEL-XYZ');
    });

    it('wirft bei einer unbekannten Aktion, statt still einen leeren Prompt zu liefern', () => {
        expect(() => buildPromptForAction('gibt-es-nicht' as AIAction, vollerPayload))
            .toThrow(/Unsupported text action/);
    });
});
