import { useState } from 'react';
import type { CustomSkillDefinition } from '@/types';
import type { GradingGraph } from '@/lib/grading/types';
import type { TargetGoal } from '@/lib/grading/calc-trace-types';
import { toErrorMessage } from '@/lib/error-message';

/**
 * Bewertungs-Engine für einen eigenen Skill von der KI erzeugen lassen.
 * ✨
 *
 * Zwei Wege, dieselbe Form: ein Bewertungsgraph (für netzwerkartige Aufgaben)
 * oder ein Rechenziel (für MINT). Beide nehmen den Aufgabentext, rufen die KI
 * und tragen das Ergebnis in den bearbeiteten Skill ein.
 *
 * Sie standen als zwei nahezu wortgleiche Funktionen nebeneinander — bis auf
 * das Zielfeld und die Ladeanzeige identisch. Hier ist der gemeinsame Ablauf
 * einmal beschrieben und nur der Unterschied benannt.
 */

/**
 * Was der Hook nach aussen gibt — zugleich die Requisiten der beiden
 * Editor-Komponenten.
 *
 * Als eigener Typ, weil `SkillEditorPanel` und `SkillEngineSection` sonst
 * dieselben sieben Zeilen deklarieren. Der Duplikat-Waechter hat das beim
 * Herausziehen sofort gemeldet.
 */
export interface SkillGenerationHandles {
    isGeneratingGraph: boolean;
    isGeneratingTrace: boolean;
    setGraphGenTaskText: (text: string) => void;
    handleAIGraphGenerate: () => void;
    handleAICalcTraceGenerate: () => void;
    onGenerateGraph?: (taskText: string, discipline?: string) => Promise<GradingGraph | null>;
    onGenerateCalcTrace?: (taskText: string, userNotes?: string) => Promise<TargetGoal | null>;
}

export interface UseSkillGenerationParams {
    editingSkillData: CustomSkillDefinition | null;
    setEditingSkillData: React.Dispatch<React.SetStateAction<CustomSkillDefinition | null>>;
    onGenerateGraph?: (taskText: string, discipline?: string) => Promise<GradingGraph | null>;
    onGenerateCalcTrace?: (taskText: string, userNotes?: string) => Promise<TargetGoal | null>;
}

export function useSkillGeneration(p: UseSkillGenerationParams) {
    const { editingSkillData, setEditingSkillData, onGenerateGraph, onGenerateCalcTrace } = p;

    const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
    const [isGeneratingTrace, setIsGeneratingTrace] = useState(false);
    /**
     * Aufgabentext, solange der Skill selbst noch keinen trägt.
     *
     * Der Text am Skill hat Vorrang: Wurde schon einmal erzeugt, soll dieselbe
     * Grundlage gelten und nicht das, was gerade im Eingabefeld steht.
     */
    const [graphGenTaskText, setGraphGenTaskText] = useState('');

    const erzeuge = async <T,>(
        aufruf: ((text: string) => Promise<T | null>) | undefined,
        zielfeld: 'gradingGraph' | 'calcTrace',
        setLaeuft: (laeuft: boolean) => void,
        bezeichnung: string
    ) => {
        const textToGen = editingSkillData?.taskText || graphGenTaskText;
        if (!aufruf || !textToGen.trim()) return;

        setLaeuft(true);
        try {
            const result = await aufruf(textToGen);
            if (result) {
                setEditingSkillData(prev => ({ ...prev, [zielfeld]: result, taskText: textToGen }));
            }
        } catch (err) {
            console.error(`${bezeichnung} generation failed:`, toErrorMessage(err));
        } finally {
            setLaeuft(false);
        }
    };

    const handleAIGraphGenerate = () => erzeuge(
        onGenerateGraph && (text => onGenerateGraph(text, editingSkillData?.category)),
        'gradingGraph',
        setIsGeneratingGraph,
        'Graph'
    );

    const handleAICalcTraceGenerate = () => erzeuge(
        onGenerateCalcTrace && (text => onGenerateCalcTrace(text)),
        'calcTrace',
        setIsGeneratingTrace,
        'CalcTrace'
    );

    return {
        isGeneratingGraph,
        isGeneratingTrace,
        graphGenTaskText,
        setGraphGenTaskText,
        handleAIGraphGenerate,
        handleAICalcTraceGenerate
    };
}
