import type { Task, AppSettings, User } from '@/types';
import type { GradingGraph } from '@/lib/grading/types';
import type { TargetGoal } from '@/lib/grading/calc-trace-types';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { alsAnfrageModus } from '@/lib/ai/app-mode';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Bewertungs-Engines von der KI erzeugen lassen.
 * ⚙️✨
 *
 * Vier Einstiege, zwei Erzeugnisse: ein Bewertungsgraph (netzwerkartige
 * Aufgaben) oder ein Rechenziel (MINT) — jeweils entweder direkt in eine
 * Aufgabe der Musterlösung geschrieben oder nur zurückgegeben, damit der
 * Aufrufer selbst entscheidet.
 *
 * Stand als vier fast gleiche Funktionen über 190 Zeilen in `pages/app.tsx`.
 * Der lange Erklärtext für den 422-Fall war darin wortgleich dupliziert, die
 * Übersetzung des Betriebsmodus stand viermal.
 */

/**
 * Der Hinweis, wenn die KI keinen Graphen bauen konnte.
 *
 * Bewusst ausführlich: Die häufigste Ursache ist keine Störung, sondern eine
 * Aufgabe, für die ein Rechengraph schlicht nicht das richtige Werkzeug ist.
 * Ohne diese Erklärung versucht es die Lehrkraft ein zweites und drittes Mal.
 */
const GRAPH_NICHT_MOEGLICH =
    'Fehler bei der Graph-Generierung:\n\n' +
    'Die KI konnte keinen Bewertungs-Graphen erstellen.\n\n' +
    'Hinweis: Das PANG-System ist für strukturierte, netzwerkartige Aufgaben ' +
    '(z. B. Subnetting) optimiert. Für rein textuelle/konzeptionelle Fragen ' +
    '(wie z. B. Freitext-Erklärungen) ist kein Rechengraph erforderlich – ' +
    'nutze hierfür einfach die Standard-Korrektur ohne Graph.';

/** Deutet die Fehlermeldung: fachlich unmöglich oder technisch gescheitert? */
const meldeGraphFehler = (error: unknown) => {
    const msg = toErrorMessage(error, '');
    const lower = msg.toLowerCase();
    const fachlich = lower.includes('422') || lower.includes('validation')
        || lower.includes('keinen') || lower.includes('bewertungs') || lower.includes('gültig');

    alert(fachlich ? GRAPH_NICHT_MOEGLICH : `Fehler bei der Graph-Generierung: ${msg}`);
};

export interface UseTaskEngineGenerationParams {
    tasksLayout: Task[];
    setTasksLayout: React.Dispatch<React.SetStateAction<Task[]>>;
    userData: User | null;
    aiSettings: AppSettings;
}

export function useTaskEngineGeneration(p: UseTaskEngineGenerationParams) {
    const { tasksLayout, setTasksLayout, userData, aiSettings } = p;
    const modus = () => alsAnfrageModus(userData?.appMode);

    /**
     * Die Disziplin des erzeugten Graphen bestimmt den Aufgabentyp.
     *
     * Netzwerk-Graphen laufen über das VLSM-Plugin, Speicher-Aufgaben über die
     * Standard-Bewertung. Alles andere behält seinen bisherigen Typ.
     */
    const typAusDisziplin = (bisher: string | undefined, disziplin?: string): string => {
        if (disziplin === 'computer-science-storage') return 'default';
        if (disziplin === 'computer-science-networking') return 'skill-calc-vlsm';
        return bisher || 'default';
    };

    const erzeugeGraph = async (taskText: string, discipline?: string, userNotes?: string) =>
        await performAIRequest('generate-graph', { taskText, discipline, userNotes }, modus(), aiSettings) as GradingGraph | null;

    const erzeugeRechenziel = async (taskText: string, userNotes?: string, maxPoints?: number) =>
        await performAIRequest('generate-calc-trace', { taskText, userNotes, maxPoints }, modus(), aiSettings) as TargetGoal | null;

    /** Erzeugt einen Graphen UND trägt ihn in die Aufgabe ein. */
    const handleGenerateGraphForTask = async (
        taskIndex: number,
        taskText: string,
        userNotes?: string,
        disciplineOverride?: string
    ) => {
        try {
            const discipline = disciplineOverride || tasksLayout[taskIndex]?.taskType;
            const response = await erzeugeGraph(taskText, discipline, userNotes);
            if (!response) return null;

            setTasksLayout(prevTasks => {
                const updated = [...prevTasks];
                if (updated[taskIndex]) {
                    updated[taskIndex] = {
                        ...updated[taskIndex],
                        taskType: typAusDisziplin(updated[taskIndex].taskType, response.discipline),
                        gradingGraph: response
                    };
                }
                return updated;
            });
            return response;
        } catch (error) {
            console.error('Error generating graph:', toErrorMessage(error));
            meldeGraphFehler(error);
            // Weiterreichen: der Aufrufer zeigt seine eigene Ladeanzeige und
            // muss wissen, dass sie enden darf.
            throw error;
        }
    };

    /** Erzeugt ein Rechenziel UND trägt es in die Aufgabe ein. */
    const handleGenerateCalcTraceForTask = async (taskIndex: number, taskText: string, userNotes?: string) => {
        try {
            // Die Punktzahl der Aufgabe ist hier bekannt. Ohne sie muesste die KI sie aus dem
            // Aufgabentext raten — und eine falsch geratene Summe verbiegt alle Einzelpunkte.
            const taskMaxPoints = Number(tasksLayout[taskIndex]?.maxPoints ?? 0);
            const response = await erzeugeRechenziel(taskText, userNotes, taskMaxPoints > 0 ? taskMaxPoints : undefined);
            if (!response) return null;

            setTasksLayout(prevTasks => {
                const updated = [...prevTasks];
                if (updated[taskIndex]) {
                    updated[taskIndex] = {
                        ...updated[taskIndex],
                        taskType: 'calc-trace',
                        targetGoal: response
                    };
                }
                return updated;
            });
            return response;
        } catch (error) {
            console.error('Error generating calc trace:', toErrorMessage(error));
            alert(`Fehler bei der Rechenketten-Generierung: ${toErrorMessage(error)}`);
            throw error;
        }
    };

    /** Erzeugt einen Graphen, ohne ihn einzutragen — für den Skill-Editor. */
    const handleGenerateGraphFromText = async (taskText: string, discipline?: string, userNotes?: string) => {
        try {
            return await erzeugeGraph(taskText, discipline, userNotes);
        } catch (error) {
            console.error('Error generating custom graph:', toErrorMessage(error));
            meldeGraphFehler(error);
            return null;
        }
    };

    /** Erzeugt ein Rechenziel, ohne es einzutragen — für den Skill-Editor. */
    const handleGenerateCalcTraceFromText = async (taskText: string, userNotes?: string) => {
        try {
            return await erzeugeRechenziel(taskText, userNotes);
        } catch (error) {
            console.error('Error generating custom calc trace:', toErrorMessage(error));
            alert(`Fehler bei der Rechenketten-Generierung: ${toErrorMessage(error)}`);
            return null;
        }
    };

    return {
        handleGenerateGraphForTask,
        handleGenerateCalcTraceForTask,
        handleGenerateGraphFromText,
        handleGenerateCalcTraceFromText
    };
}
