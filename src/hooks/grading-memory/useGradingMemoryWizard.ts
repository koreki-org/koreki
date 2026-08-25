import { useState, useEffect } from 'react';
import { alsModellzahl } from '@/lib/zahlen';
import type { Task, AppSettings, GradingMemory, GradingMemoryCase } from '@/types';
import { rufeSimulator, type SyntheticAnswer, type SimulatorAnswer, type Calibration } from '@/lib/grading-memory-simulator';
import { isDesktopTarget } from '@/lib/env-context';
import { persistGradingMemory, bestaetigeSchatzName } from '@/lib/grading-memory-persistence';
import { askConfirmation } from '@/lib/confirm-dialog';
import { resolveTaskName } from '@/lib/grading-memory-utils';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Der Assistent: einen Erfahrungsschatz erzeugen und kalibrieren.
 * 🧭
 *
 * Vier Schritte — Aufgaben waehlen, fiktive Abgaben erzeugen lassen, jede
 * einzeln bewerten, speichern. Die Bewertungen der Lehrkraft sind der
 * eigentliche Ertrag: Koreki lernt daran, WIE streng sie liest.
 *
 * Stand als 276 Zeilen im 777-Zeilen-Hook `useGradingMemoryModalState`, neben
 * der Verwaltung der Sammlung und der Aufloesung des aktiven Schatzes. Drei
 * Belange in einer Datei — der Zustandsfluss war nicht mehr ueberblickbar.
 */

export interface UseGradingMemoryWizardParams {
    isOpen: boolean;
    modelSolution: string;
    tasksLayout: Task[];
    settings?: AppSettings;
    /** Die geteilte Liste — der Assistent haengt sein Ergebnis dort an. */
    memories: GradingMemory[];
    setMemories: React.Dispatch<React.SetStateAction<GradingMemory[]>>;
    activeMemoryId: string | null;
    addLocalMemory: (memory: GradingMemory) => void;
}

export function useGradingMemoryWizard({
    isOpen,
    modelSolution,
    tasksLayout,
    settings,
    memories,
    setMemories,
    activeMemoryId,
    addLocalMemory
}: UseGradingMemoryWizardParams) {
    const [step, setStep] = useState<'start' | 'generating' | 'calibrate' | 'saved'>('start');
    const [profileName, setProfileName] = useState('');
    const [syntheticAnswers, setSyntheticAnswers] = useState<SyntheticAnswer[]>([]);
    const [activeCaseIndex, setActiveCaseIndex] = useState<number>(0);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
    const [calibrations, setCalibrations] = useState<Record<string, Calibration>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Beim Oeffnen einen Vorschlagsnamen setzen und alle Aufgaben vorauswaehlen,
     * beim Schliessen den Assistenten zuruecksetzen.
     *
     * Ohne das Zuruecksetzen zeigte ein erneutes Oeffnen die Kalibrierung des
     * vorigen Laufs — mit Abgaben zu einer laengst anderen Musterloesung.
     */
    useEffect(() => {
        if (isOpen) {
            const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            setProfileName(`Erfahrungsschatz (${dateStr})`);
            setSelectedTasks(
                Array.isArray(tasksLayout)
                    ? tasksLayout.map(t => t.name).filter((name): name is string => !!name)
                    : []
            );
        } else {
            setStep('start');
            setSyntheticAnswers([]);
            setCalibrations({});
            setActiveCaseIndex(0);
            setSelectedTasks([]);
            setError(null);
        }
    }, [isOpen, tasksLayout]);

    const handleGenerate = async () => {
        if (!modelSolution || !modelSolution.trim()) {
            setError('Bitte lade zuerst eine Musterlösung im Dashboard hoch, um darauf basierende Schülerfehler zu simulieren.');
            return;
        }

        if (selectedTasks.length === 0) {
            setError('Bitte wähle mindestens eine Aufgabe für die Simulation aus.');
            return;
        }

        setIsGenerating(true);
        setStep('generating');
        setError(null);
        try {
            const data = await rufeSimulator({ modelSolution, tasksLayout, selectedTasks, settings });

            if (data.studentAnswers && Array.isArray(data.studentAnswers)) {
                const ansItems: SyntheticAnswer[] = data.studentAnswers.map((ans: SimulatorAnswer, idx: number) => ({
                    ...ans,
                    uid: `case-uid-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`
                }));

                setSyntheticAnswers(ansItems);
                
                const initialCalibs: Record<string, Calibration> = {};
                ansItems.forEach(ans => {
                    const key = ans.uid;
                    
                    // Der Simulator paraphrasiert den Aufgabennamen gelegentlich, deshalb der Teilstring-Vergleich.
                    // Er darf aber nur bei nicht-leerem Namen greifen: includes('') trifft sonst immer die erste Aufgabe.
                    const simulatedName = (ans.taskName || '').trim().toLowerCase();
                    const matchedTask = simulatedName
                        ? (tasksLayout?.find(t => t.name?.toLowerCase() === simulatedName)
                            || tasksLayout?.find(t => t.name?.toLowerCase().includes(simulatedName)))
                        : undefined;

                    // Liegt ein Layout vor, ist ausschliesslich ein Treffer daraus eine gueltige Zuordnung.
                    // Der paraphrasierte Name des Simulators wuerde sonst eine Aufgabe vortaeuschen, die es nicht gibt.
                    const hasLayout = !!tasksLayout && tasksLayout.length > 0;
                    const actualTaskName = hasLayout ? (matchedTask?.name || '') : (ans.taskName || '');
                    // `alsModellzahl`: `maxPoints` ist `number | string` (getippt).
                    // Eine untippbare Angabe ergab NaN — und `Math.min(NaN, ...)`
                    // darunter machte daraus auch gleich NaN Punkte.
                    const actualMaxPoints = matchedTask
                        ? alsModellzahl(matchedTask.maxPoints, 5)
                        : alsModellzahl(ans.maxPoints, 5);
                    const actualPointsObtained = ans.pointsObtained !== undefined 
                        ? Math.min(actualMaxPoints, ans.pointsObtained) 
                        : Math.round(actualMaxPoints * 0.6);

                    initialCalibs[key] = {
                        taskName: actualTaskName,
                        pointsObtained: actualPointsObtained,
                        maxPoints: actualMaxPoints,
                        correctionNotes: ans.recommendedNotes || '',
                        feedback: ans.recommendedFeedback || ''
                    };
                });
                
                setCalibrations(initialCalibs);
                setActiveCaseIndex(0);
                setStep('calibrate');
            } else {
                throw new Error('Ungültiges Antwortformat der KI erhalten.');
            }
        } catch (err) {
            setError(toErrorMessage(err, 'Verbindungsfehler beim Aufruf der Simulator-Schnittstelle.'));
            setStep('start');
        } finally {
            setIsGenerating(false);
        }
    };

    /** Legt einen leeren Schatz an, den die Lehrkraft von Hand befuellt. */
    const handleCreateEmptyMemory = async () => {
        const pruefung = await bestaetigeSchatzName(profileName, memories);
        if (!pruefung.ok) {
            if (pruefung.fehler) setError(pruefung.fehler);
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            await persistGradingMemory({ name: profileName, cases: [], addLocalMemory });
            setStep('start');
        } catch (err) {
            setError(toErrorMessage(err, 'Fehler beim Sichern des leeren Profils.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCaseManually = () => {
        if (!activeMemoryId) return;

        const newCase: GradingMemoryCase = {
            id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            studentText: 'Beispiel Schülerantwort...',
            taskName: tasksLayout && tasksLayout.length > 0 ? tasksLayout[0].name : 'Aufgabe 1',
            expectedCorrection: {
                pointsObtained: 0,
                // Ohne Rueckfall stand hier NaN — und das wandert als
                // "0 von NaN" in den Korrektur-Prompt.
                maxPoints: alsModellzahl(tasksLayout?.[0]?.maxPoints, 5),
                correctionNotes: 'Begründung für die Korrektur...',
                feedback: ''
            }
        };

        setMemories(prev => prev.map(m => {
            if (m.id !== activeMemoryId) return m;
            return {
                ...m,
                cases: [...(m.cases || []), newCase]
            };
        }));
    };

    const handleSkip = async () => {
        if (!syntheticAnswers || syntheticAnswers.length === 0) return;
        
        const newAnswers = [...syntheticAnswers];
        newAnswers.splice(activeCaseIndex, 1);
        setSyntheticAnswers(newAnswers);
        
        if (newAnswers.length === 0) {
            const proceed = await askConfirmation({ title: 'Leeren Erfahrungsschatz anlegen?', message: 'Alle fiktiven Schülerabgaben wurden übersprungen. Möchtest du den Erfahrungsschatz trotzdem als leeres Profil erstellen?' });
            if (proceed) {
                handleSave([]);
            } else {
                setStep('start');
            }
        } else if (activeCaseIndex >= newAnswers.length) {
            setActiveCaseIndex(newAnswers.length - 1);
        }
        // Bleibt auf dem gleichen Index, zeigt aber den nächsten (nachgerückten) Fall
    };

    /**
     * Speichert den kalibrierten Erfahrungsschatz.
     *
     * `answersToSave` gibt es, weil der letzte Fall beim Klick auf "Speichern"
     * noch nicht im Zustand steht. Aufrufer MUESSEN die Funktion umschliessen
     * (`onClick={() => handleSave()}`) — direkt als Ereignisbehandler landet
     * sonst das Maus-Ereignis hier. Das ging bisher nur gut, weil `Array.isArray`
     * es abgefangen hat, und war unsichtbar, solange der Parameter `any` war.
     */
    const handleSave = async (answersToSave?: SyntheticAnswer[]) => {
        const actualAnswers = Array.isArray(answersToSave) ? answersToSave : syntheticAnswers;

        const pruefung = await bestaetigeSchatzName(profileName, memories);
        if (!pruefung.ok) {
            if (pruefung.fehler) setError(pruefung.fehler);
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            const cases: GradingMemoryCase[] = actualAnswers.map(ans => {
                const cal = calibrations[ans.uid];
                const assignedTaskName = cal?.taskName?.trim() || undefined;
                // Das [Aufgabe: ...]-Praefix ist der Fallback-Anker von resolveTaskName().
                // Ohne echte Zuordnung darf es nicht geschrieben werden, sonst wird "Allgemein"
                // spaeter als hochkonfidenter Aufgabenname zurueckgelesen.
                const notes = cal?.correctionNotes || '';
                return {
                    id: `case-${ans.uid}-${Date.now()}`,
                    studentText: ans.text,
                    taskName: assignedTaskName,
                    expectedCorrection: {
                        pointsObtained: cal?.pointsObtained || 0,
                        maxPoints: cal?.maxPoints,
                        correctionNotes: assignedTaskName ? `[Aufgabe: ${assignedTaskName}] ${notes}` : notes,
                        feedback: cal?.feedback || undefined
                    }
                };
            });

            await persistGradingMemory({ name: profileName, cases, addLocalMemory });
            setStep('saved');
        } catch (err) {
            setError(toErrorMessage(err, 'Fehler beim Sichern des Profils im lokalen Speicher.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCalibration = (char: string, fields: Partial<{ taskName: string; pointsObtained: number; maxPoints: number; correctionNotes: string; feedback: string }>) => {
        setCalibrations(prev => ({
            ...prev,
            [char]: {
                ...prev[char],
                ...fields
            }
        }));
    };

    return {
        step, setStep,
        profileName, setProfileName,
        syntheticAnswers, setSyntheticAnswers,
        activeCaseIndex, setActiveCaseIndex,
        selectedTasks, setSelectedTasks,
        calibrations, setCalibrations,
        isSaving, setIsSaving,
        isGenerating, setIsGenerating,
        error, setError,
        handleGenerate,
        handleCreateEmptyMemory,
        handleAddCaseManually,
        handleSkip,
        handleSave,
        handleUpdateCalibration
    };
}
