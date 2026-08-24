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
 * Zwei Schueler mit gegenlaeufigem Profil — erst dadurch zeigt der Stapel, wozu er da
 * ist: Der eine rechnet sauber und irrt fachlich, der andere umgekehrt.
 *
 * Schueler #1 loest Aufgabe 1 vollstaendig (3/3) und traegt in Aufgabe 2 bewusst einen
 * unzweideutigen Fachfehler: Er dreht den wirtschaftlichen Mechanismus um (behauptet,
 * die Einspeisevergütung liege ÜBER dem Bezugspreis und man verdiene am Verkauf, statt
 * am gesparten Eigenverbrauch — real ist es umgekehrt). Anders als bei Aufgabe 1 gibt
 * es hier keine Sandbox, die das deterministisch garantiert — nur ein moeglichst
 * eindeutiger Fachfehler, den eine vernuenftig kalibrierte Korrektur zuverlaessig als
 * falsch erkennen sollte.
 *
 * Schueler #2 erreicht in Aufgabe 1 deterministisch 2 von 3 Punkten. Entscheidend ist
 * die ART des Fehlers, gemessen an der Engine:
 *
 *   - Ein echter Verrechner (richtige Werte, falsches Ergebnis) kostet BEIDE
 *     deterministischen Punkte — die Sandbox meldet "Formel ergibt X, Schueler
 *     notierte Y", damit faellt proofA UND proofB.
 *   - Ein falsch abgelesener Eingangswert (hier 1000 statt 1200 kWh/m²) laesst den
 *     Rechenweg in sich fehlerfrei: proofA haelt, nur proofB faellt.
 *
 * Genau deshalb liest Schueler #2 falsch ab, statt sich zu verrechnen — nur so ergibt
 * sich 2/3, und es zeigt die Folgefehler-Logik: Methode richtig, Ergebnis falsch,
 * Teilpunkt trotzdem. Aufgabe 2 beantwortet er vollstaendig, Aufgabe 3 gar nicht.
 *
 * ZUR FORMULIERUNG DER PUNKTEBLOECKE (24.08.2026): Jeder Block nennt die geforderte
 * LEISTUNG, nicht das Themengebiet. Der Block "Paedagogischer Nutzen" hiess frueher
 * "Vorbild- und Bildungsfunktion im Bereich Klimaschutz" — und das Themenwort baute
 * dem Modell eine Bruecke: Ein Schueler, der nur "man muss etwas gegen den Klimawandel
 * tun" schrieb, bekam den Block angerechnet. Gemessen an einer duennen Antwort ueber
 * 10 Laeufe: volle Punktzahl in 7 von 10 Faellen, mit der jetzigen Formulierung in 3
 * von 10. Eine umformulierte Zeile wirkte damit staerker als sechs durchgemessene
 * Prompt-Varianten. Dieses Szenario ist die Vorlage, an der Lehrkraefte lernen, wie
 * ein Erwartungshorizont auszusehen hat — deshalb steht hier die scharfe Fassung.
 */
export interface DemoScenario {
    modelSolution: string;
    modelSolutionContext: string;
    tasksLayout: Task[];
    studentBatchFiles: BatchFile[];
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
            content: `### Aufgabe 2: Wirtschaftlichkeit der Anlage (AFB II) (6 P) ###\nFragestellung: Erläutere, warum sich die Investition in eine eigene Solaranlage für die Schule langfristig lohnen kann.\n\nMusterlösung: Erwartet wird eine begründete Erläuterung ökonomischer und pädagogischer Vorteile.\n- Kernmechanismus (2P): Der Nutzen entsteht vor allem durch Eigenverbrauch — die Schule muss weniger teuren Strom vom Netzbetreiber zukaufen, statt mit der Einspeisevergütung Gewinn zu erzielen (diese liegt heute unter dem Bezugspreis, nicht darüber).\n- Weiterer Vorteil (2P): Unabhängigkeit von steigenden Energiepreisen und/oder korrekt eingeordnete Einspeisevergütung als Zusatzeinnahme (nicht als Hauptgewinnquelle).\n- Pädagogischer Nutzen (2P): Die Schule wirkt als Vorbild, und die Schülerinnen und Schüler lernen im Unterricht an der eigenen Anlage.`
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

    const studentTextNele = `=== TASK: Aufgabe 1 ===\nIch nutze die Formel E = A · η · H.\nEinsetzen: E = 40 m² · 0,2 · 1200 kWh/m²\nE = 9600 kWh\n\n=== TASK: Aufgabe 2 ===\nEine Solaranlage lohnt sich vor allem, weil man den Strom teurer verkaufen kann, als man ihn selbst einkaufen müsste. Für den Strom, den die Schule ins Netz einspeist, gibt es mehr Geld, als sie für Strom vom Anbieter zahlen würde — deswegen macht man damit Gewinn, egal wie viel man selbst verbraucht. Außerdem ist es gut fürs Klima.\n\n=== TASK: Aufgabe 3 ===\nDie Aussage stimmt teilweise. Eine einzelne Anlage auf einem Dach spart nur sehr wenig CO2 im Vergleich zu dem, was weltweit ausgestoßen wird. Trotzdem finde ich, dass es nicht „gar nichts“ bringt: Wenn viele Schulen das machen, kommt schon mehr zusammen, und die Schüler lernen dabei, wie sowas funktioniert. Das kann später mal wichtiger sein als der direkte CO2-Effekt.`;

    // Aufgabe 1: Formel korrekt genannt, Rechenweg in sich fehlerfrei — aber mit
    // H = 1000 statt 1200 kWh/m² aus der Aufgabenstellung abgelesen. Ergebnis-Punkt
    // faellt, Rechenweg-Punkt haelt (siehe Kopf der Datei).
    const studentTextJonas = `=== TASK: Aufgabe 1 ===\nFormel: E = A · η · H\nEinsetzen: E = 40 m² · 0,2 · 1000 kWh/m²\nE = 8000 kWh\n\n=== TASK: Aufgabe 2 ===\nDer größte Vorteil ist, dass die Schule den Strom, den sie selbst erzeugt, auch direkt selbst verbraucht. Dadurch muss sie weniger teuren Strom vom Netzbetreiber einkaufen, und genau diese Ersparnis macht den Hauptteil des Nutzens aus. Für überschüssigen Strom gibt es zwar eine Einspeisevergütung, die liegt heute aber unter dem Preis, den man für Netzstrom zahlt — damit allein würde sich die Anlage also nicht rechnen.\n\nAußerdem macht sich die Schule unabhängiger von steigenden Strompreisen, weil ein Teil des Verbrauchs vom eigenen Dach kommt und nicht mehr eingekauft werden muss.\n\nDazu kommt der pädagogische Nutzen: Die Schule zeigt, dass sie das Thema Klimaschutz ernst nimmt, und wir können im Unterricht direkt an einer echten Anlage lernen, wie sowas funktioniert.\n\n=== TASK: Aufgabe 3 ===\nWeiß ich leider nicht.`;

    const studentBatchFiles: BatchFile[] = [
        {
            name: "Schüler #1",
            originalName: "Nele Beispielfeld",
            status: 'pending',
            result: null,
            error: null,
            fileText: studentTextNele,
            tasks: [],
            documentType: 'typed',
            pageCount: 1,
            estimatedCredits: 1,
            selected: true,
            ocrDone: true
        },
        {
            name: "Schüler #2",
            originalName: "Jonas Beispielfeld",
            status: 'pending',
            result: null,
            error: null,
            fileText: studentTextJonas,
            tasks: [],
            documentType: 'typed',
            pageCount: 1,
            estimatedCredits: 1,
            selected: true,
            ocrDone: true
        }
    ];

    return { modelSolution, modelSolutionContext, tasksLayout, studentBatchFiles };
}
