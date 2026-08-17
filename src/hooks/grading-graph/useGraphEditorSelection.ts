import { useState, useMemo } from 'react';
import type { GradingGraph, VariableDefinition } from '@/lib/grading/types';
import { collectReferencedVariables } from '@/lib/grading/variable-references';

/**
 * Auswahl und Hervorhebung im Graph-Editor.
 * 🖱️
 *
 * Welche Variable ist ausgewählt, welche liegt unter dem Zeiger — und was
 * folgt daraus für die Darstellung. Reine Ansichtsfragen, die den Graphen
 * selbst nicht anfassen.
 */

export interface UseGraphEditorSelectionParams {
    graph: GradingGraph;
    /** Der Aufgabentyp entscheidet mit über die starre Punktvergabe. */
    taskType?: string;
}

export function useGraphEditorSelection({ graph, taskType }: UseGraphEditorSelectionParams) {
    const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
    const [hoveredVarId, setHoveredVarId] = useState<string | null>(null);
    const [selectedPlugin, setSelectedPlugin] = useState<string>('math');

    /** Variablen nach Subnetz gruppiert (`subnetA_...` → „Subnetz A"). */
    const groupedVariables = useMemo(() => {
        const groups: Record<string, VariableDefinition[]> = {};
        (graph?.variables || []).forEach(v => {
            const m = v.id.match(/^(?:subnet_?)?([A-Za-z0-9_]+)_/i);
            const groupName = m ? `Subnetz ${m[1].toUpperCase()}` : 'Allgemeine Variablen';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(v);
        });
        return groups;
    }, [graph?.variables]);

    /**
     * Vergibt das Modell die Punkte statt der Engine?
     *
     * Der ausdrückliche Schalter am Graphen gewinnt. Fehlt er, entscheidet die
     * Disziplin: Netzwerk-Aufgaben (VLSM) werden starr gerechnet, alles andere
     * hybrid.
     */
    const isPointsDisabled = useMemo(() => {
        if (graph && typeof graph.disablePoints === 'boolean') {
            return graph.disablePoints;
        }
        const discipline = graph?.discipline;
        const isRigid = discipline === 'vlsm' || discipline === 'skill-calc-vlsm'
            || taskType === 'vlsm' || taskType === 'skill-calc-vlsm';
        return !isRigid;
    }, [graph, taskType]);

    /**
     * Variablen, auf die die gerade betrachtete Formel zugreift — für die
     * Hervorhebung der Abhängigkeiten im Editor.
     */
    const dependenciesOfHovered = useMemo(() => {
        const activeId = hoveredVarId || selectedVarId;
        if (!activeId) return new Set<string>();

        const vars = graph?.variables || [];
        const activeVar = vars.find(v => v.id === activeId);
        if (!activeVar || activeVar.type !== 'formula' || !activeVar.expression) {
            return new Set<string>();
        }

        return new Set(collectReferencedVariables(activeVar.expression, vars.map(v => v.id)));
    }, [hoveredVarId, selectedVarId, graph?.variables]);

    /** Auf welche anderen Variablen greift diese Formel zu? */
    const getVariableDependencies = (variable: VariableDefinition) => {
        if (variable.type !== 'formula' || !variable.expression) return [];
        const others = (graph?.variables || []).map(v => v.id).filter(id => id !== variable.id);
        return collectReferencedVariables(variable.expression, others);
    };

    return {
        selectedVarId, setSelectedVarId,
        hoveredVarId, setHoveredVarId,
        selectedPlugin, setSelectedPlugin,
        groupedVariables,
        isPointsDisabled,
        dependenciesOfHovered,
        getVariableDependencies
    };
}
