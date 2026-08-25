import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Check, AlertCircle, Plus, Trash2, Code, Eye, 
    Sparkles, RefreshCw, Layers, ArrowRight, HelpCircle, Link2Off,
    Send, MessageSquare
} from 'lucide-react';
import { GradingGraph, VariableDefinition, VariableType, ValidationType } from '../../lib/grading/types';
import { renameVariableReferences, freieVariablenKennung } from '../../lib/grading/variable-references';
import { buildPerfectInputs, computeExpectedValues, parsePlaygroundInputs } from '../../lib/grading/graph-preview';
import { GraphJsonPanel } from './parts/GraphJsonPanel';
import { GraphTestingPanel } from './parts/GraphTestingPanel';
import { GraphAiPanel } from './parts/GraphAiPanel';
import { GraphEditorPanel } from './parts/GraphEditorPanel';
import { extractRefinementResponse, isUsableGraph, mergeRefinedGraph, parseGraphJson } from '../../lib/grading/graph-intake';
import { useGraphDocument } from '@/hooks/grading-graph/useGraphDocument';
import { useGraphEditorSelection } from '@/hooks/grading-graph/useGraphEditorSelection';
import { useGraphPlayground } from '@/hooks/grading-graph/useGraphPlayground';
import { useGraphAiRefinement } from '@/hooks/grading-graph/useGraphAiRefinement';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { cn } from '@/lib/utils';
import { AppSettings } from '../../types';
import { apiClient } from '@/lib/api-client';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';
import { isLocalInstance } from '@/lib/env-context';
import { toErrorMessage } from '../../lib/error-message';
import { meldeErfolg, meldeFehler, meldeHinweis } from '@/lib/notify';

interface GradingGraphModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialGraph?: GradingGraph;
    taskName?: string;
    taskContent?: string;
    taskType?: string;
    customSkills?: Record<string, any>;
    settings?: AppSettings;
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    isGenerating?: boolean;
    onEngineChange?: (newEngine: string) => void;
    onRegenerateGraph?: (discipline: string, userNotes?: string) => Promise<any>;
    onDeleteGraph?: () => void;
    onSaveCustomSkill?: (name: string, graph: GradingGraph) => void;
    onSave: (graph: GradingGraph) => void;
    isLocked?: boolean;
}

export const GradingGraphModal: React.FC<GradingGraphModalProps> = ({
    isOpen,
    onClose,
    initialGraph,
    taskName = "Bewertungs-Aufgabe",
    taskContent,
    taskType,
    customSkills = {},
    settings,
    appMode,
    isGenerating = false,
    onEngineChange,
    onRegenerateGraph,
    onDeleteGraph,
    onSaveCustomSkill,
    onSave,
    isLocked = false
}) => {
    const hasTemplates = useMemo(
        () => Object.values(customSkills || {}).some(sk => sk && sk.gradingGraph),
        [customSkills]
    );

    const { graph, setGraph, jsonText, jsonError, handleJsonChange } =
        useGraphDocument({ initialGraph });

    const {
        selectedVarId, setSelectedVarId,
        hoveredVarId, setHoveredVarId,
        selectedPlugin, setSelectedPlugin,
        groupedVariables, isPointsDisabled, dependenciesOfHovered,
        getVariableDependencies
    } = useGraphEditorSelection({ graph, taskType });

    const {
        playgroundInputs, setPlaygroundInputs, playgroundResult,
        evaluatedContext,
        handleFillPerfect: handleFillPerfectPlayground,
        handleRun: handleRunPlayground
    } = useGraphPlayground({ graph });

    const {
        chatInput, setChatInput,
        chatHistory, setChatHistory,
        isRefining,
        initialUserNotes, setInitialUserNotes,
        showAdvancedInspector, setShowAdvancedInspector,
        handleRefineGraph
    } = useGraphAiRefinement({
        graph, setGraph, taskContent, discipline: selectedPlugin, appMode, settings
    });

    // Mount state for SSR safe Portal mounting
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const [activeTab, setActiveTab] = useState<'ai' | 'editor' | 'testing' | 'json'>(() => {
        const hasGraph = initialGraph && Array.isArray(initialGraph.variables) && initialGraph.variables.length > 0;
        return hasGraph ? 'testing' : 'ai';
    });

    // Nur im SaaS-Betrieb kosten KI-Aktionen Credits. PURE (eigener Key), Community und
    // Desktop rechnen nicht ab — dort waere ein Preis-Hinweis schlicht falsch.
    const showsCreditCost = !isLocalInstance() && (appMode === 'STANDARD' || appMode === 'TRIAL');

    const [skillName, setSkillName] = useState(() => {
        if (taskType && taskType.startsWith('custom-skill-') && customSkills?.[taskType]) {
            return customSkills[taskType].name || "";
        }
        return taskName || "";
    });

    useEffect(() => {
        // Only override the user's input if the actual taskType (Dropdown) changes
        // to a new template. We do not want to override it simply because customSkills reference changed.
        if (taskType && taskType.startsWith('custom-skill-') && customSkills?.[taskType]) {
            setSkillName(customSkills[taskType].name || "");
        } else {
            setSkillName(taskName || "");
        }
    }, [taskName, taskType]); // Removed customSkills from dependency array to prevent typing interruption

    // AI wizard suggestion chips
    const noteSuggestions = [
        "Toleranz für Masken auf 0.1 setzen",
        "Erlaube Subnetz-Rotationen",
        "subnetA_broadcast als Formel deklarieren",
        "Broadcast-IPs nicht bewerten",
        "Zusätzliche Punkte für den Broadcast-Schritt"
    ];

    const handleAddSuggestion = (suggestion: string) => {
        setInitialUserNotes(prev => {
            const trimmed = prev.trim();
            if (!trimmed) return suggestion;
            if (trimmed.endsWith('.') || trimmed.endsWith(',') || trimmed.endsWith('!')) return `${trimmed} ${suggestion}`;
            return `${trimmed}, ${suggestion}`;
        });
    };

    // Sync edited form inputs
    const handleUpdateVariable = (id: string, updated: Partial<VariableDefinition>) => {
        setGraph(prev => {
            const vars = prev?.variables || [];
            const nextVars = vars.map(v => {
                if (v.id === id) {
                    // If ID changed, we also rename references in formulas (bonus smart-logic!)
                    const nextId = updated.id || v.id;
                    return { ...v, ...updated } as VariableDefinition;
                }
                return v;
            });
            return { ...prev, variables: nextVars };
        });
    };

    // Save edited variable ID and rename references downstream
    const handleRenameVariableId = (oldId: string, newId: string) => {
        if (!newId || newId === oldId) return;
        const vars = graph?.variables || [];
        if (vars.some(v => v.id === newId)) {
            meldeFehler("Fehler: Eine Variable mit dieser ID existiert bereits.");
            return;
        }

        setGraph(prev => {
            const prevVars = prev?.variables || [];
            const nextVars = prevVars.map(v => {
                let updatedVar = { ...v };
                if (v.id === oldId) {
                    updatedVar.id = newId;
                }
                // Downstream reference update
                if (v.type === 'formula' && v.expression) {
                    updatedVar.expression = renameVariableReferences(v.expression, oldId, newId);
                }
                return updatedVar;
            });
            return { ...prev, variables: nextVars };
        });
        setSelectedVarId(newId);
    };

    const handleAddVariable = (groupName?: string) => {
        // Guess prefix from group name
        let prefix = "var_";
        if (groupName && groupName.startsWith("Subnetz ")) {
            prefix = `subnet${groupName.replace("Subnetz ", "").toLowerCase()}_`;
        }

        const newId = freieVariablenKennung(graph?.variables || [], prefix);
        const newVar: VariableDefinition = {
            id: newId,
            type: 'input',
            defaultValue: 10,
            validationType: 'exact',
            maxPoints: 1
        };

        setGraph(prev => ({
            ...prev,
            variables: [...(prev?.variables || []), newVar]
        }));
        setSelectedVarId(newId);
    };

    const handleDeleteVariable = (id: string) => {
        setGraph(prev => ({
            ...prev,
            variables: (prev?.variables || []).filter(v => v.id !== id)
        }));
        if (selectedVarId === id) setSelectedVarId(null);
    };


    if (!isOpen || !mounted) return null;

    const selectedVar = (graph?.variables || []).find(v => v.id === selectedVarId);

    return createPortal(
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-0 sm:p-4 bg-foreground backdrop-blur-md animate-fade-in font-inter text-foreground">
            <div className="bg-white border border-border shadow-2xl rounded-none sm:rounded-[var(--radius)] w-full max-w-6xl h-[100dvh] sm:h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
                
                {/* Header */}
                <div className="px-4 py-4 sm:px-8 sm:py-5 border-b border-border bg-muted flex flex-col lg:flex-row gap-4 lg:gap-3 justify-between items-start lg:items-center shrink-0">
                    <div className="flex items-center justify-between w-full lg:w-auto gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md border border-border overflow-hidden shrink-0">
                                <img src="/logo.png" alt="Koreki Logo" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm sm:text-lg font-black text-foreground font-outfit tracking-tight">
                                    Grading Graph Designer
                                </h3>
                                <p className="text-xxs sm:text-xs text-muted-foreground font-medium truncate">{taskName} (Variable Beziehungen, Toleranzen & Folgefehler-Pfade)</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="lg:hidden text-muted-foreground hover:text-muted-foreground transition-colors p-1.5 hover:bg-muted rounded-full shrink-0 h-8 w-8 flex items-center justify-center border-0 bg-transparent"
                        >
                            <X size={20} />
                        </Button>
                    </div>

                    {/* Mode selector tab */}
                    <div className="flex w-full lg:w-auto overflow-x-auto max-w-full min-w-0 no-scrollbar scrollbar-none bg-muted p-1 rounded-xl gap-1 shrink-0 lg:ml-auto lg:mr-6">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('ai')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'ai' ? "bg-white text-primary shadow-sm font-black" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Sparkles size={12} className={cn(activeTab === 'ai' && "text-primary")} />
                            KI-Assistent 🪄
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setActiveTab('testing'); handleRunPlayground(); }}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'testing' ? "bg-white text-primary shadow-sm font-black" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Eye size={12} className={cn(activeTab === 'testing' && "text-primary")} />
                            Graph testen 🧪
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('editor')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'editor' ? "bg-white text-primary shadow-sm font-black" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Layers size={12} className={cn(activeTab === 'editor' && "text-primary")} />
                            Knoten-Editor 📊
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('json')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'json' ? "bg-white text-primary shadow-sm font-black" : "text-muted-foreground hover:text-foreground")}
                        >
                            <Code size={12} className={cn(activeTab === 'json' && "text-primary")} />
                            JSON-Editor 💻
                        </button>
                    </div>

                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-muted-foreground transition-colors p-1.5 hover:bg-muted rounded-full hidden lg:flex h-8 w-8 items-center justify-center border-0 bg-transparent"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {isLocked && (
                    <div className="bg-warning/10 border-b border-warning/20 text-warning px-4 sm:px-8 py-3 flex items-center gap-2 text-xs font-semibold shrink-0">
                        <AlertCircle size={16} className="text-warning shrink-0" />
                        <span>Der Graph befindet sich im schreibgeschützten Modus (Read-Only), da bereits korrigierte Schülerarbeiten vorliegen. Änderungen sind deaktiviert.</span>
                    </div>
                )}

                {/* Subheader/Actions Panel Toolbar */}
                <div className="px-4 sm:px-8 py-3 bg-muted border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                        {/* 1. Assign Existing Graph Skill from Skill Center */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider text-left block">Bestehender Skill:</span>
                            <select
                                value={taskType || 'default'}
                                disabled={isLocked}
                                onChange={(e) => onEngineChange?.(e.target.value)}
                                className="w-full sm:w-auto h-8 px-2.5 rounded-xl border border-border bg-white text-foreground hover:border-border text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-inter"
                            >
                                <option value="default">-- Kein Graph-Skill aktiv (Standard) --</option>
                                {Object.entries(customSkills || {})
                                    .filter(([_, s]) => s && (s.isGraphBased || s.gradingGraph))
                                    .map(([id, skill]) => (
                                        <option key={id} value={id}>
                                            {skill.name || id}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Divider line */}
                        <div className="hidden md:block h-6 w-px bg-muted"></div>

                        {/* 3. Name & Save Custom Skill (Template) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider text-left block">Skill Name:</span>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                                <Input 
                                    value={skillName}
                                    disabled={isLocked}
                                    onChange={(e) => setSkillName(e.target.value)}
                                    placeholder="z.B. Subnetz-Berechnung"
                                    className="h-8 w-full sm:w-44 rounded-xl border border-border text-xs font-bold px-2.5 focus:border-primary bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    {!isLocked && (
                                        <Button
                                            onClick={() => {
                                                if (!skillName.trim()) {
                                                    meldeHinweis("Bitte gib einen Namen für den Skill ein.");
                                                    return;
                                                }
                                                if (onSaveCustomSkill) {
                                                    onSaveCustomSkill(skillName.trim(), graph);
                                                } else {
                                                    onSave(graph);
                                                    meldeErfolg(`Änderungen am Graphen wurden in den Skill "${skillName.trim()}" übernommen. Klicke gleich im Skill-Editor unten auf 'Speichern', um sie dauerhaft zu sichern!`);
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial h-8 rounded-full text-xs font-black uppercase border border-primary/20 text-primary bg-primary/5 hover:bg-primary/5 gap-1.5 px-4 transition-all flex items-center justify-center shrink-0 shadow-xs duration-300 active:scale-95"
                                            title="Als wiederverwendbaren Custom Skill im Skill Center speichern bzw. übernehmen"
                                        >
                                            <Check size={14} /> Speichern
                                        </Button>
                                    )}
                                    {onDeleteGraph && initialGraph && !isLocked && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (confirm("Möchtest du den Bewertungs-Graphen wirklich unwiderruflich löschen?")) {
                                                    onDeleteGraph();
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial h-8 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all text-xs font-bold gap-1 px-3 flex items-center justify-center shrink-0"
                                            title="Bewertungs-Graph löschen und Aufgabe zurücksetzen"
                                        >
                                            <Trash2 size={13} />
                                            <span>Löschen</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hint text / spacer */}
                    <span className="text-xs text-muted-foreground font-medium hidden xl:flex items-center gap-1.5 ml-auto">
                        <Sparkles size={11} className="text-primary" />
                        PANG Engine berechnet Folgefehler vollautomatisch
                    </span>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden min-h-0">
                    
                    {/* Tab 1: AI Assistant & Generation */}
                    {activeTab === 'ai' && (
                        <GraphAiPanel
                            graph={graph}
                            taskContent={taskContent}
                            hoveredVarId={hoveredVarId}
                            evaluatedContext={evaluatedContext}
                            setGraph={setGraph}
                            isLocked={isLocked}
                            isGenerating={isGenerating}
                            isRefining={isRefining}
                            isPointsDisabled={isPointsDisabled}
                            showsCreditCost={showsCreditCost}
                            selectedPlugin={selectedPlugin}
                            setSelectedPlugin={setSelectedPlugin}
                            initialUserNotes={initialUserNotes}
                            setInitialUserNotes={setInitialUserNotes}
                            chatInput={chatInput}
                            setChatInput={setChatInput}
                            chatHistory={chatHistory}
                            setHoveredVarId={setHoveredVarId}
                            onRefineGraph={handleRefineGraph}
                            onRegenerateGraph={onRegenerateGraph}
                        />
                    )}

                    {/* Tab 2: Visual Node Editor & Simplified Inspector */}
                    {activeTab === 'editor' && (
                        <GraphEditorPanel
                            graph={graph}
                            hoveredVarId={hoveredVarId}
                            groupedVariables={groupedVariables}
                            selectedVar={selectedVar}
                            selectedVarId={selectedVarId}
                            setSelectedVarId={setSelectedVarId}
                            setHoveredVarId={setHoveredVarId}
                            dependenciesOfHovered={dependenciesOfHovered}
                            evaluatedContext={evaluatedContext}
                            isLocked={isLocked}
                            isPointsDisabled={isPointsDisabled}
                            showAdvancedInspector={showAdvancedInspector}
                            setShowAdvancedInspector={setShowAdvancedInspector}
                            getVariableDependencies={getVariableDependencies}
                            onAddVariable={handleAddVariable}
                            onDeleteVariable={handleDeleteVariable}
                            onUpdateVariable={handleUpdateVariable}
                            onRenameVariableId={handleRenameVariableId}
                        />
                    )}

                    {/* Tab 3: Testing Sandbox */}
                    {activeTab === 'testing' && (
                        <GraphTestingPanel
                            graph={graph}
                            playgroundInputs={playgroundInputs}
                            setPlaygroundInputs={setPlaygroundInputs}
                            playgroundResult={playgroundResult}
                            evaluatedContext={evaluatedContext}
                            isPointsDisabled={isPointsDisabled}
                            onFillPerfect={handleFillPerfectPlayground}
                            onRun={handleRunPlayground}
                        />
                    )}

                    {/* Tab 4: JSON Editor */}
                    {activeTab === 'json' && (
                        <GraphJsonPanel
                            jsonText={jsonText}
                            jsonError={jsonError}
                            isLocked={isLocked}
                            onJsonChange={handleJsonChange}
                        />
                    )}

                </div>

                {/* Footer */}
                <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-border bg-muted flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                    <p className="text-xs text-muted-foreground font-inter text-center sm:text-left leading-normal">
                        * Die Variablen ID wird beim Parsen von Schülerlösungen automatisch gematcht (z. B. &quot;subnetA_hosts&quot;).
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto justify-stretch sm:justify-end">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="h-10 flex-1 sm:flex-initial rounded-xl px-5 font-bold text-muted-foreground hover:bg-muted"
                        >
                            {isLocked ? "Schließen" : "Abbrechen"}
                        </Button>
                        {!isLocked && (
                            <Button 
                                onClick={() => { onSave(graph); onClose(); }}
                                disabled={!!jsonError}
                                className="h-10 flex-1 sm:flex-initial rounded-xl px-6 bg-primary hover:bg-primary text-white font-black shadow-lg shadow-primary/10 transition-all"
                            >
                                Zuweisen
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
