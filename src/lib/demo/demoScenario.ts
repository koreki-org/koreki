import type { Task, BatchFile } from '@/types';
import { buildModelSolutionFromTasks } from '@/lib/task-utils';

/**
 * Demo-Szenario "Solaranlage für die Schule" — reine Daten, keine UI/React-Logik
 * (siehe architectural-vision Skill, Punkt 6: "Logic in Lib, State in Hook").
 *
 * Ein gemeinsamer Rahmen, drei fachlich unterschiedliche Aufgaben (Physik/Mathe,
 * Wirtschaft, Ethik) mit steigendem AFB.
 *
 * Aufgabe 1 haengt bewusst an der CalcTrace-Engine (siehe src/lib/grading/CalcTrace.ts):
 * 1P Formel (llm-bewertet), 1P Rechenweg (proofA, deterministisch), 1P Ergebnis
 * (proofB, deterministisch) — zwei der drei Kriterien sind damit sandbox-gepruefte
 * Fakten statt KI-Ermessen, was das Risiko einer schiefen Demo-Bewertung senkt.
 *
 * Aufgabe 2 traegt bewusst einen echten, unzweideutigen Fachfehler statt einer guten
 * Antwort: Der Schueler dreht den wirtschaftlichen Mechanismus um (behauptet, die
 * Einspeisevergütung liege ÜBER dem Bezugspreis und man verdiene am Verkauf, statt am
 * gesparten Eigenverbrauch — real ist es umgekehrt). Anders als bei Aufgabe 1 gibt es
 * hier keine Sandbox, die das deterministisch garantiert — nur ein moeglichst
 * eindeutiger Fachfehler, den eine vernuenftig kalibrierte Korrektur zuverlaessig als
 * falsch erkennen sollte.
 */
export interface DemoScenario {
    modelSolution: string;
    modelSolutionContext: string;
    tasksLayout: Task[];
    studentBatchFile: BatchFile;
}

export function buildDemoScenario(): DemoScenario {
    const tasksLayout: Task[] = [
        {
            name: "Aufgabe 1",
            maxPoints: 3,
            taskType: 'calc-trace',
            content: `### Aufgabe 1: Energieertrag der Solaranlage (AFB I) (3 P) ###\nFragestellung: Die Schule plant eine Photovoltaikanlage auf dem Dach der Sporthalle. Berechne den zu erwartenden jährlichen Energieertrag E. Gegeben: Modulfläche A = 40 m², Wirkungsgrad η = 20 % (0,2), mittlere Jahres-Sonneneinstrahlung H = 1200 kWh/m². Nutze die Formel E = A · η · H.\n\nMusterlösung: E = A · η · H = 40 m² · 0,2 · 1200 kWh/m² = 9600 kWh. Bewertung: 1 P Formel, 1 P Rechenweg, 1 P Ergebnis.`,
            targetGoal: {
                targetValue: '9600',
                maxPoints: 3,
                unit: 'kWh',
                gradingRubric: '1 P Formel, 1 P Rechenweg, 1 P Ergebnis',
                criteria: [
                    { id: 'formel', label: 'Formel E = A · η · H korrekt genannt', punktwert: 1, source: 'llm', targetIndex: 0 },
                    { id: 'rechenweg', label: 'Rechenweg fehlerfrei', punktwert: 1, source: 'proofA', targetIndex: 0 },
                    { id: 'ergebnis', label: 'Endergebnis 9600 kWh erreicht', punktwert: 1, source: 'proofB', targetIndex: 0 }
                ]
            }
        },
        {
            name: "Aufgabe 2",
            maxPoints: 6,
            content: `### Aufgabe 2: Wirtschaftlichkeit der Anlage (AFB II) (6 P) ###\nFragestellung: Erläutere, warum sich die Investition in eine eigene Solaranlage für die Schule langfristig lohnen kann.\n\nMusterlösung: Erwartet wird eine begründete Erläuterung ökonomischer und pädagogischer Vorteile.\n- Kernmechanismus (2P): Der Nutzen entsteht vor allem durch Eigenverbrauch — die Schule muss weniger teuren Strom vom Netzbetreiber zukaufen, statt mit der Einspeisevergütung Gewinn zu erzielen (diese liegt heute unter dem Bezugspreis, nicht darüber).\n- Weiterer Vorteil (2P): Unabhängigkeit von steigenden Energiepreisen und/oder korrekt eingeordnete Einspeisevergütung als Zusatzeinnahme (nicht als Hauptgewinnquelle).\n- Pädagogischer Nutzen (2P): Vorbild- und Bildungsfunktion im Bereich Klimaschutz.`
        },
        {
            name: "Aufgabe 3",
            maxPoints: 6,
            content: `### Aufgabe 3: Symbolwert vs. echter Klimaeffekt (AFB III) (6 P) ###\nFragestellung: Setze dich kritisch mit der Aussage auseinander: „Eine einzelne Solaranlage auf einem Schuldach ändert am Klimawandel gar nichts.“\n\nMusterlösung: Erwartet wird eine kritische Auseinandersetzung mit der Aussage.\n- Pro (2P): Der CO2-Beitrag einer einzelnen Anlage ist im Vergleich zu globalen Emissionen verschwindend gering.\n- Contra (2P): Symbol- und Vorbildwirkung sowie Bildungseffekt bei Schüler:innen — bzw. Skaleneffekt, wenn andere Schulen nachziehen.\n- Fazit (2P): Eine begründete Abwägung, die zeigt, dass der unmittelbare Klimaeffekt klein, der mittelbare Effekt (Bildung, Vorbild) aber relevant sein kann.`
        }
    ];

    // Der "Gemeinsame Rahmen" ist ein eigenes Feld (siehe ModelSolutionCard) und muss
    // deshalb ueber buildModelSolutionFromTasks eingebunden werden — sonst geht das
    // Szenario beim Zusammensetzen der Musterloesung verloren und die Karte zeigt nur
    // den leeren Platzhalter.
    const modelSolutionContext = `Die Schule plant eine eigene Photovoltaikanlage auf dem Dach der Sporthalle. Alle drei Aufgaben drehen sich um dieses gemeinsame Projekt "Solaranlage für die Schule" — jede aus einer anderen fachlichen Perspektive (Physik/Mathe, Wirtschaft, Ethik).`;
    const modelSolution = buildModelSolutionFromTasks(modelSolutionContext, tasksLayout);

    const studentText = `=== TASK: Aufgabe 1 ===\nIch nutze die Formel E = A · η · H.\nEinsetzen: E = 40 m² · 0,2 · 1200 kWh/m²\nE = 9600 kWh\n\n=== TASK: Aufgabe 2 ===\nEine Solaranlage lohnt sich vor allem, weil man den Strom teurer verkaufen kann, als man ihn selbst einkaufen müsste. Für den Strom, den die Schule ins Netz einspeist, gibt es mehr Geld, als sie für Strom vom Anbieter zahlen würde — deswegen macht man damit Gewinn, egal wie viel man selbst verbraucht. Außerdem ist es gut fürs Klima.\n\n=== TASK: Aufgabe 3 ===\nDie Aussage stimmt teilweise. Eine einzelne Anlage auf einem Dach spart nur sehr wenig CO2 im Vergleich zu dem, was weltweit ausgestoßen wird. Trotzdem finde ich, dass es nicht „gar nichts“ bringt: Wenn viele Schulen das machen, kommt schon mehr zusammen, und die Schüler lernen dabei, wie sowas funktioniert. Das kann später mal wichtiger sein als der direkte CO2-Effekt.`;

    const studentBatchFile: BatchFile = {
        name: "Schüler #1",
        originalName: "Nele Beispielfeld",
        status: 'pending',
        result: null,
        error: null,
        fileText: studentText,
        tasks: [],
        documentType: 'typed',
        pageCount: 1,
        estimatedCredits: 1,
        selected: true,
        ocrDone: true
    };

    return { modelSolution, modelSolutionContext, tasksLayout, studentBatchFile };
}
