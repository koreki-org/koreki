import { runLocalGradingEngines } from '@/lib/ai/local-grading-pass';
import { extractStudentAST } from '@/lib/grading/calc-trace-extraction';
import { extractStudentAnswersWithLLM } from '@/lib/ai/variable-extraction';
import { GraphRunner } from '@/lib/grading/GraphRunner';
import type { Task, AppSettings } from '@/types';

jest.mock('@/lib/grading/calc-trace-extraction', () => ({ extractStudentAST: jest.fn() }));
jest.mock('@/lib/ai/variable-extraction', () => ({ extractStudentAnswersWithLLM: jest.fn() }));
jest.mock('@/lib/task-utils', () => ({ splitTextByTasks: () => [] }));

const mockAst = extractStudentAST as jest.Mock;
const mockVars = extractStudentAnswersWithLLM as jest.Mock;

/**
 * Gemeinsamer Vorlauf der deterministischen Engines (Layer 1)
 * ⚙️📐
 *
 * Dieser Lauf stand vorher zweimal da — im ai-orchestrator fuer PURE/Desktop
 * und in pages/api/ai-correct fuer SaaS/Community — und die beiden Kopien waren
 * auseinandergelaufen. Die Faelle hier bewachen genau die Stellen, an denen sie
 * sich unterschieden haben.
 */
describe('runLocalGradingEngines', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const einstellungen = (extra: Partial<AppSettings> = {}): AppSettings => ({
        provider: 'mistral',
        customSkills: {},
        activeSkillIds: [],
        ...extra
    }) as AppSettings;

    const lauf = (tasksLayout: Task[], settings: AppSettings, herkunft: 'Client' | 'Server' = 'Server') =>
        runLocalGradingEngines({
            tasksLayout,
            studentText: 'Schuelerantwort',
            appMode: herkunft === 'Server' ? 'STANDARD' : 'PURE',
            settings,
            herkunft
        });

    /**
     * DER DEFEKT, DEN DIE ZUSAMMENLEGUNG BEHOBEN HAT.
     *
     * Der Server-Weg setzte `task.targetGoal` nie. Scheiterte die Extraktion,
     * blieb es leer — und `mapModelTask` erkennt die Aufgabe dann nicht mehr als
     * Rechenaufgabe. Der Warnhinweis "ohne Sandbox-Pruefung, bitte manuell
     * gegenpruefen" blieb aus, und der Lehrer bekam ungeprueft KI-Punkte auf
     * eine Mathe-Aufgabe.
     *
     * Betroffen sind Ziele aus EIGENEN Skills: dort greifen weder
     * `task.calcTrace` noch `taskType === 'calc-trace'`.
     */
    it('setzt targetGoal auch dann, wenn die Extraktion scheitert', async () => {
        mockAst.mockRejectedValue(new Error('Extraktion abgestuerzt'));

        const task: Task = { name: 'A1', maxPoints: 5, taskType: 'skill-eigen-mathe' };
        const settings = einstellungen({
            customSkills: {
                'skill-eigen-mathe': {
                    isCalcTrace: true,
                    targetGoal: { targetValue: 42, maxPoints: 5 }
                }
            }
        });

        await lauf([task], settings);

        expect(task.targetGoal).toBeDefined();
        expect(task.targetGoal?.targetValue).toBe(42);
        // Ohne calcTraceResult greift der Warnhinweis — genau so soll es sein.
        expect(task.calcTraceResult).toBeUndefined();
    });

    /**
     * Zweiter Unterschied: der Client glich maxPoints vor der Extraktion ab,
     * der Server erst danach. Scheiterte sie, unterblieb der Abgleich
     * serverseitig ganz.
     */
    it('uebernimmt maxPoints aus dem Ziel, wenn die Aufgabe keine nennt', async () => {
        mockAst.mockRejectedValue(new Error('Extraktion abgestuerzt'));

        const task: Task = { name: 'A1', taskType: 'calc-trace' };
        const settings = einstellungen({
            customSkills: { 'calc-trace': { targetGoal: { targetValue: 1, maxPoints: 7 } } }
        });

        await lauf([task], settings);

        expect(task.maxPoints).toBe(7);
    });

    /**
     * Die Punktzahl der Lehrkraft schlaegt die des Ziels — sie ist die Quelle,
     * das Ziel ist bestenfalls daraus abgeleitet.
     */
    it('laesst die Punktzahl der Aufgabe unangetastet', async () => {
        mockAst.mockRejectedValue(new Error('egal'));

        const task: Task = { name: 'A1', maxPoints: 3, targetGoal: { targetValue: 1, maxPoints: 99 } };
        await lauf([task], einstellungen());

        expect(task.maxPoints).toBe(3);
    });

    /**
     * `isGraphSkill` wurde in beiden Kopien berechnet und in keiner benutzt.
     * Wer es beim Aufraeumen "repariert", schickt Aufgaben ohne angehaengten
     * Graphen in den Graph-Zweig — GraphRunner bekaeme nichts zu rechnen.
     */
    it('laesst eine Graph-Skill-Aufgabe OHNE angehaengten Graphen in Ruhe', async () => {
        const graphSpy = jest.spyOn(GraphRunner, 'grade');
        const task: Task = { name: 'A1', taskType: 'vlsm', maxPoints: 4 };

        await lauf([task], einstellungen({ activeSkillIds: ['vlsm'] }));

        expect(graphSpy).not.toHaveBeenCalled();
        expect(mockVars).not.toHaveBeenCalled();
        expect(task.gradingResult).toBeUndefined();
        graphSpy.mockRestore();
    });

    /**
     * Die Ollama-Bremse stand bisher nur auf dem Server-Weg, obwohl sie auf dem
     * Desktop — wo Ollama am haeufigsten laeuft — noch mehr Sinn ergibt.
     */
    it('gibt Ollama nur einen Nachbesserungsversuch', async () => {
        mockAst.mockResolvedValue([{ id: 's1' }]);

        const task: Task = { name: 'A1', maxPoints: 5, targetGoal: { targetValue: 1, maxPoints: 5 } };
        await lauf([task], einstellungen({ provider: 'ollama' }), 'Client');

        // Erstaufruf plus hoechstens ein Nachbesserungsversuch.
        expect(mockAst.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('bricht bei einem Fehler in einer Aufgabe nicht den ganzen Lauf ab', async () => {
        mockAst
            .mockRejectedValueOnce(new Error('erste kaputt'))
            .mockResolvedValue([{ id: 's1' }]);

        const tasks: Task[] = [
            { name: 'A1', maxPoints: 5, targetGoal: { targetValue: 1, maxPoints: 5 } },
            { name: 'A2', maxPoints: 5, targetGoal: { targetValue: 2, maxPoints: 5 } }
        ];

        await lauf(tasks, einstellungen());

        expect(tasks[0].calcTraceResult).toBeUndefined();
        expect(tasks[1].calcTraceResult).toBeDefined();
    });

    it('ignoriert Aufgaben, die weder Graph noch Rechenkette haben', async () => {
        const task: Task = { name: 'Freitext', maxPoints: 5 };
        await lauf([task], einstellungen());

        expect(mockAst).not.toHaveBeenCalled();
        expect(task.calcTraceResult).toBeUndefined();
        expect(task.targetGoal).toBeUndefined();
    });
});
