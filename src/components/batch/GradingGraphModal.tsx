import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Check, AlertCircle, Plus, Trash2, Code, Eye, 
    Sparkles, RefreshCw, Layers, ArrowRight, HelpCircle, Link2Off,
    Send, MessageSquare
} from 'lucide-react';
import { GradingGraph, VariableDefinition, VariableType, ValidationType } from '../../lib/grading/types';
import { evaluateExpression } from '../../lib/grading/plugins';
import { GraphRunner } from '../../lib/grading/GraphRunner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '@/lib/utils';
import { AppSettings } from '../../types';
import { apiClient } from '@/lib/api-client';
import { performAIRequest } from '@/lib/ai/ai-orchestrator';

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
    // Standard template if none provided (clean blank canvas)
    const defaultGraph: GradingGraph = {
        taskId: `task-${Date.now()}`,
        discipline: 'general',
        variables: []
    };

    const hasTemplates = useMemo(() => {
        return Object.values(customSkills || {}).some(s => s && s.gradingGraph);
    }, [customSkills]);

    const [graph, setGraph] = useState<GradingGraph>(() => {
        if (initialGraph && Array.isArray(initialGraph.variables)) {
            return initialGraph;
        }
        return defaultGraph;
    });
    const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
    const [hoveredVarId, setHoveredVarId] = useState<string | null>(null);
    const [selectedPlugin, setSelectedPlugin] = useState<string>('math');
    
    // Mount state for SSR safe Portal mounting
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    
    // Collapsible states
    const [jsonText, setJsonText] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Mock student answer playground values
    const [playgroundInputs, setPlaygroundInputs] = useState<Record<string, string>>({});
    const [playgroundResult, setPlaygroundResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'ai' | 'editor' | 'testing' | 'json'>(() => {
        const hasGraph = initialGraph && Array.isArray(initialGraph.variables) && initialGraph.variables.length > 0;
        return hasGraph ? 'testing' : 'ai';
    });
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; text: string; hasError?: boolean }[]>([]);
    const [isRefining, setIsRefining] = useState(false);
    const [initialUserNotes, setInitialUserNotes] = useState("");
    const [showAdvancedInspector, setShowAdvancedInspector] = useState(false);

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

    // Sync JSON text when graph changes
    useEffect(() => {
        setJsonText(JSON.stringify(graph, null, 2));
    }, [graph]);

    // Handle initialGraph change
    useEffect(() => {
        if (initialGraph && Array.isArray(initialGraph.variables)) {
            setGraph(initialGraph);
        }
    }, [initialGraph]);

    // Group variables by Subnet Name (e.g., subnetA, subnetB, generic)
    const groupedVariables = useMemo(() => {
        const groups: Record<string, VariableDefinition[]> = {};
        const vars = graph?.variables || [];
        vars.forEach(v => {
            const m = v.id.match(/^(?:subnet_?)?([A-Za-z0-9_]+)_/i);
            const groupName = m ? `Subnetz ${m[1].toUpperCase()}` : 'Allgemeine Variablen';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(v);
        });
        return groups;
    }, [graph?.variables]);

    const isPointsDisabled = useMemo(() => {
        if (graph && typeof graph.disablePoints === 'boolean') {
            return graph.disablePoints;
        }
        const discipline = graph?.discipline;
        const isRigid = discipline === 'vlsm' || discipline === 'skill-calc-vlsm' ||
                        taskType === 'vlsm' || taskType === 'skill-calc-vlsm';
        return !isRigid;
    }, [graph?.disablePoints, graph?.discipline, taskType]);

    // Check which variables are dependencies of the hovered/selected variable
    const dependenciesOfHovered = useMemo(() => {
        const activeId = hoveredVarId || selectedVarId;
        if (!activeId) return new Set<string>();
        
        const vars = graph?.variables || [];
        const activeVar = vars.find(v => v.id === activeId);
        if (!activeVar || activeVar.type !== 'formula' || !activeVar.expression) {
            return new Set<string>();
        }

        const deps = new Set<string>();
        vars.forEach(v => {
            // If variable ID is mentioned in the formula expression (e.g. "subnetA_netId")
            const wordRegex = new RegExp(`\\b${v.id}\\b`);
            if (wordRegex.test(activeVar.expression || "")) {
                deps.add(v.id);
            }
        });
        return deps;
    }, [hoveredVarId, selectedVarId, graph?.variables]);

    // Verify mathematical expressions and build evaluation context in real time
    const evaluatedContext = useMemo(() => {
        const context: Record<string, any> = {};
        const errors: Record<string, string> = {};
        const vars = graph?.variables || [];

        vars.forEach(v => {
            if (v.type === 'input') {
                context[v.id] = v.defaultValue;
            } else if (v.type === 'formula' && v.expression) {
                try {
                    context[v.id] = evaluateExpression(v.expression, context);
                } catch (err: any) {
                    context[v.id] = 'Error ⚠️';
                    errors[v.id] = err.message || 'Evaluation error';
                }
            }
        });

        return { context, errors };
    }, [graph?.variables]);

    // Helper to extract which variables a formula depends on
    const getVariableDependencies = (variable: VariableDefinition) => {
        if (variable.type !== 'formula' || !variable.expression) return [];
        return (graph?.variables || [])
            .filter(other => other.id !== variable.id && new RegExp(`\\b${other.id}\\b`).test(variable.expression || ""))
            .map(other => other.id);
    };

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
            alert("Fehler: Eine Variable mit dieser ID existiert bereits.");
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
                    const regex = new RegExp(`\\b${oldId}\\b`, 'g');
                    updatedVar.expression = v.expression.replace(regex, newId);
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

        const newId = `${prefix}new_${Date.now().toString().slice(-4)}`;
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

    // Parse raw JSON text editor input safely
    const handleJsonChange = (val: string) => {
        setJsonText(val);
        try {
            const parsed = JSON.parse(val);
            if (!parsed.variables || !Array.isArray(parsed.variables)) {
                throw new Error("Das JSON muss eine 'variables'-Liste enthalten.");
            }
            setGraph(parsed);
            setJsonError(null);
        } catch (err: any) {
            setJsonError(err.message || "Ungültiges JSON-Format");
        }
    };

    // Launch mock grading computation
    const handleRunPlayground = () => {
        // Collect actual mock student values
        const studentValues: Record<string, any> = {};
        const vars = graph?.variables || [];
        vars.forEach(v => {
            const inputVal = playgroundInputs[v.id];
            if (inputVal !== undefined && inputVal.trim() !== '') {
                // Heuristic parse numeric input
                if (!isNaN(Number(inputVal))) {
                    studentValues[v.id] = Number(inputVal);
                } else {
                    studentValues[v.id] = inputVal.trim();
                }
            }
        });

        try {
            const res = GraphRunner.grade(graph, studentValues);
            setPlaygroundResult(res);
        } catch (e: any) {
            alert(`Fehler beim Berechnen der Bewertung: ${e.message}`);
        }
    };

    // Auto-fill perfect playground answers for quick testing
    const handleFillPerfectPlayground = () => {
        const perfect: Record<string, string> = {};
        const vars = graph?.variables || [];
        vars.forEach(v => {
            perfect[v.id] = String(evaluatedContext.context[v.id] ?? "");
        });
        setPlaygroundInputs(perfect);
    };

    const handleRefineGraph = async () => {
        if (!chatInput.trim() || isRefining) return;

        const instruction = chatInput.trim();
        setChatInput('');
        setIsRefining(true);
        setChatHistory(prev => [...prev, { role: 'user', text: instruction }]);

        try {
            const responseData = await performAIRequest(
                'refine-graph',
                {
                    taskText: taskContent || '',
                    currentGraph: graph,
                    userInstruction: instruction,
                    discipline: selectedPlugin
                },
                appMode,
                settings!
            );

            let updatedGraph = responseData;
            let explanation = '';

            if (responseData && responseData.graph) {
                updatedGraph = responseData.graph;
                explanation = responseData.explanation || '';
            }

            if (updatedGraph && Array.isArray(updatedGraph.variables)) {
                // Preserve critical meta-settings from the current graph
                // so the LLM doesn't accidentally reset the points distribution mode or discipline
                const mergedGraph = {
                    ...updatedGraph,
                    discipline: updatedGraph.discipline || graph.discipline,
                    disablePoints: graph.disablePoints !== undefined ? graph.disablePoints : updatedGraph.disablePoints
                };
                
                setGraph(mergedGraph);
                setChatHistory(prev => [...prev, { 
                    role: 'assistant', 
                    text: explanation || `Graph erfolgreich verfeinert!\nEs wurden ${updatedGraph.variables.length} Variablen deklariert.` 
                }]);
            } else {
                throw new Error("Ungültiges Graphen-Format von KI zurückgegeben.");
            }
        } catch (err: any) {
            const errMsg = err instanceof Error ? err.message : 'Verbindungsfehler';
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                text: `Fehler: ${errMsg}`, 
                hasError: true 
            }]);
        } finally {
            setIsRefining(false);
        }
    };

    if (!isOpen || !mounted) return null;

    const selectedVar = (graph?.variables || []).find(v => v.id === selectedVarId);

    return createPortal(
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-inter text-slate-700">
            <div className="bg-white border border-slate-100 shadow-2xl rounded-none sm:rounded-[var(--radius)] w-full max-w-6xl h-[100dvh] sm:h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
                
                {/* Header */}
                <div className="px-4 py-4 sm:px-8 sm:py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 lg:gap-3 justify-between items-start lg:items-center shrink-0">
                    <div className="flex items-center justify-between w-full lg:w-auto gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                                <Layers size={20} className="text-indigo-600 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm sm:text-lg font-black text-slate-900 font-outfit tracking-tight flex items-center gap-2 flex-wrap">
                                    Grading Graph Designer
                                    <Badge className="bg-indigo-600 text-white font-bold py-0.5 px-2.5 text-xs rounded-full uppercase">PANG engine</Badge>
                                </h3>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">{taskName} (Variable Beziehungen, Toleranzen & Folgefehler-Pfade)</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-full shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Mode selector tab */}
                    <div className="flex w-full lg:w-auto overflow-x-auto max-w-full min-w-0 no-scrollbar scrollbar-none bg-slate-200/50 p-1 rounded-xl gap-1 shrink-0 lg:ml-auto lg:mr-6">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('ai')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'ai' ? "bg-white text-indigo-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800")}
                        >
                            <Sparkles size={12} className={cn(activeTab === 'ai' && "text-indigo-600")} />
                            KI-Assistent 🪄
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setActiveTab('testing'); handleRunPlayground(); }}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'testing' ? "bg-white text-indigo-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800")}
                        >
                            <Eye size={12} className={cn(activeTab === 'testing' && "text-indigo-600")} />
                            Graph testen 🧪
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('editor')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'editor' ? "bg-white text-indigo-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800")}
                        >
                            <Layers size={12} className={cn(activeTab === 'editor' && "text-indigo-600")} />
                            Knoten-Editor 📊
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('json')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'json' ? "bg-white text-indigo-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800")}
                        >
                            <Code size={12} className={cn(activeTab === 'json' && "text-indigo-600")} />
                            JSON-Editor 💻
                        </button>
                    </div>

                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-full hidden lg:block"
                    >
                        <X size={20} />
                    </button>
                </div>

                {isLocked && (
                    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 sm:px-8 py-3 flex items-center gap-2 text-xs font-semibold shrink-0">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <span>Der Graph befindet sich im schreibgeschützten Modus (Read-Only), da bereits korrigierte Schülerarbeiten vorliegen. Änderungen sind deaktiviert.</span>
                    </div>
                )}

                {/* Subheader/Actions Panel Toolbar */}
                <div className="px-4 sm:px-8 py-3 bg-slate-50/20 border-b border-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                        {/* 1. Assign Existing Graph Skill from Skill Center */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider text-left block">Bestehender Skill:</span>
                            <select
                                value={taskType || 'default'}
                                disabled={isLocked}
                                onChange={(e) => onEngineChange?.(e.target.value)}
                                className="w-full sm:w-auto h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-inter"
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
                        <div className="hidden md:block h-6 w-px bg-slate-200"></div>

                        {/* 3. Name & Save Custom Skill (Template) */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider text-left block">Skill Name:</span>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                                <Input 
                                    value={skillName}
                                    disabled={isLocked}
                                    onChange={(e) => setSkillName(e.target.value)}
                                    placeholder="z.B. Subnetz-Berechnung"
                                    className="h-8 w-full sm:w-44 rounded-xl border border-slate-200 text-xs font-bold px-2.5 focus:border-indigo-500 bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    {(onSaveCustomSkill || onSave) && !isLocked && (
                                        <Button
                                            onClick={() => {
                                                if (!skillName.trim()) {
                                                    alert("Bitte gib einen Namen für den Skill ein.");
                                                    return;
                                                }
                                                if (onSaveCustomSkill) {
                                                    onSaveCustomSkill(skillName.trim(), graph);
                                                } else {
                                                    onSave(graph);
                                                    alert(`Änderungen am Graphen wurden in den Skill "${skillName.trim()}" übernommen. Klicke gleich im Skill-Editor unten auf 'Speichern', um sie dauerhaft zu sichern!`);
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial h-8 rounded-full text-xs font-black uppercase border border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 gap-1.5 px-4 transition-all flex items-center justify-center shrink-0 shadow-xs duration-300 active:scale-95"
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
                                            className="flex-1 sm:flex-initial h-8 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all text-xs font-bold gap-1 px-3 flex items-center justify-center shrink-0"
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
                    <span className="text-xs text-slate-400 font-medium hidden xl:flex items-center gap-1.5 ml-auto">
                        <Sparkles size={11} className="text-indigo-500" />
                        PANG Engine berechnet Folgefehler vollautomatisch
                    </span>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden min-h-0">
                    
                    {/* Tab 1: AI Assistant & Generation */}
                    {activeTab === 'ai' && (
                        <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50/30">
                            {graph.variables.length === 0 ? (
                                <div className="flex-1 flex min-h-0 overflow-hidden bg-slate-50/10">
                                    {/* Left Panel: Pure Chat Layout */}
                                    <div className="flex-grow flex flex-col overflow-hidden min-h-0 bg-white">
                                        <div className="px-4 sm:px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center shrink-0 gap-3 sm:gap-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider text-left block">KI-Generierungs-Engine:</span>
                                                <select
                                                    value={selectedPlugin}
                                                    disabled={isLocked}
                                                    onChange={(e) => setSelectedPlugin(e.target.value)}
                                                    className="w-full sm:w-auto h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-inter"
                                                >
                                                    <option value="math">Mathematik-Plugin (Standard-Rechner)</option>
                                                    <option value="computer-science-networking">Netzwerk-Plugin (VLSM)</option>
                                                </select>
                                            </div>

                                            {/* Divider */}
                                            <div className="hidden sm:block h-5 w-px bg-slate-200"></div>

                                            {/* Bewertung Dropdown */}
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider text-left block">Bewertung:</span>
                                                <select
                                                    value={isPointsDisabled ? 'hybrid' : 'strict'}
                                                    disabled={isLocked}
                                                    onChange={(e) => {
                                                        setGraph({
                                                            ...graph,
                                                            disablePoints: e.target.value === 'hybrid'
                                                        });
                                                    }}
                                                    className="w-full sm:w-auto h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-inter"
                                                    title={isPointsDisabled 
                                                        ? "Hybrid-Grading aktiv: PANG prüft nur die mathematische Korrektheit. Die finale Punktevergabe erfolgt didaktisch flexibel durch das LLM." 
                                                        : "Strenge Punktevergabe aktiv: PANG bestimmt die Punkte absolut starr und mathematisch exakt."
                                                    }
                                                >
                                                    <option value="hybrid">✨ Hybrid-Grading (Didaktisch tolerant)</option>
                                                    <option value="strict">🔒 Strenge Punkte (Mathematisch starr)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Greeting area */}
                                        <div className="flex-1 bg-slate-50/50 p-4 sm:p-6 overflow-y-auto flex flex-col space-y-4 custom-scrollbar">
                                            <div className="p-4 bg-white border border-slate-200/60 text-slate-700 rounded-2xl rounded-tl-none shadow-3xs text-xs leading-relaxed font-medium max-w-[90%] sm:max-w-[85%] animate-in fade-in slide-in-from-left-2 duration-300">
                                                <p className="font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-indigo-600 animate-pulse" />
                                                    PANG KI-Assistent
                                                </p>
                                                Hallo! Ich bin dein PANG-Assistent. Gib mir einfach deine Wünsche oder Richtlinien für diese Aufgabe ein (z. B. Toleranzen, Formeln oder Punkteverteilung) und klicke auf „Graph generieren“, um deinen Bewertungs-Graphen vollautomatisch zu erstellen.
                                            </div>
                                        </div>

                                        {/* Input Box at the bottom */}
                                        <div className="px-4 sm:px-8 py-5 border-t border-slate-100 flex flex-col gap-4 bg-white shrink-0">
                                            <textarea
                                                value={initialUserNotes}
                                                disabled={isLocked}
                                                onChange={(e) => setInitialUserNotes(e.target.value)}
                                                placeholder={isLocked ? "Der Graph ist schreibgeschützt, da bereits Schülerarbeiten korrigiert wurden." : "z. B. Setze die Toleranz für alle Variablen auf 0.1, bestimme bestimmte Werte als Formel oder passe die Punkteverteilung an..."}
                                                className="w-full p-4 h-24 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 bg-slate-50/30 placeholder-slate-400 transition-all duration-200 resize-none leading-relaxed shadow-inner disabled:opacity-60"
                                            />

                                            {onRegenerateGraph && taskContent && taskContent.trim().length > 10 && (
                                                <Button
                                                    disabled={isGenerating || isLocked}
                                                    onClick={async () => {
                                                        const result = await onRegenerateGraph(selectedPlugin, initialUserNotes);
                                                        if (result && Array.isArray(result.variables)) {
                                                            setGraph(result);
                                                            setInitialUserNotes('');
                                                        }
                                                    }}
                                                    className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black shadow-lg shadow-indigo-100/60 transition-all active:scale-[0.98] text-xs gap-2 flex-grow flex items-center justify-center cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    {isGenerating ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={14} />
                                                    )}
                                                    <span>{isGenerating ? "Erstelle Graph..." : "🪄 Graph mit KI generieren"}</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Panel: Widescreen Info Box */}
                                    <div className="hidden lg:flex w-80 border-l border-slate-100 bg-white flex flex-col p-6 space-y-4 shrink-0 overflow-y-auto animate-in fade-in duration-300">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 shrink-0">
                                            <span className="text-lg">💡</span>
                                            <h4 className="text-xs font-black uppercase text-slate-800 font-outfit tracking-tight">Was leistet der PANG-Bewertungsgraph?</h4>
                                        </div>
                                        
                                        <div className="space-y-4 text-xs leading-relaxed text-slate-600">
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-800 flex items-center gap-1">
                                                    <span className="text-indigo-600 font-extrabold">✓</span> Folgefehlerkompensation
                                                </p>
                                                <p className="pl-4 text-slate-400 font-medium leading-normal">Ein Rechenfehler führt nicht zu Kettenabzügen. Folgefehler werden vollautomatisch mathematisch kompensiert.</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-800 flex items-center gap-1">
                                                    <span className="text-indigo-600 font-extrabold">✓</span> Didaktische Toleranzen
                                                </p>
                                                <p className="pl-4 text-slate-400 font-medium leading-normal">Definiere Abweichungen für Rundungs- oder Format-Fehler, um Schülerarbeiten fair zu bewerten.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
                                    {/* Left half: Interactive chat assistant */}
                                    <div className="w-full lg:w-1/2 flex flex-col overflow-hidden bg-white p-4 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 h-[50vh] lg:h-full shrink-0 lg:shrink">
                                        <div className="space-y-1.5 shrink-0 pb-4 border-b border-slate-100">
                                            <h4 className="text-xs font-black uppercase text-slate-800 font-outfit tracking-tight flex items-center gap-2">
                                                <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                                                Interaktiver KI-Assistent
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                                Passe Formeln, Toleranzen oder Punktgewichtungen flexibel mit natürlicher Sprache im Chat an.
                                            </p>
                                        </div>

                                        {/* Chat History Panel */}
                                        <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200/40 p-4 my-4 overflow-y-auto space-y-3 custom-scrollbar flex flex-col">
                                            {chatHistory.length === 0 ? (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 gap-2 select-none my-auto">
                                                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-500 mb-1">
                                                        <MessageSquare size={16} />
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-600">Keine Chat-Historie</p>
                                                    <p className="text-xs leading-relaxed font-medium px-2 text-slate-400">
                                                        Gib unten eine Anweisung ein, z.B. <em>"Setze die Toleranz von subnetA_mask auf 0.1"</em>.
                                                    </p>
                                                </div>
                                            ) : (
                                                chatHistory.map((msg, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "p-3 rounded-2xl text-xs leading-relaxed max-w-[90%] font-medium transition-all duration-200",
                                                            msg.role === 'user'
                                                                ? "bg-indigo-600 text-white rounded-tr-none ml-auto shadow-xs"
                                                                : msg.hasError
                                                                    ? "bg-rose-50 border border-rose-100 text-rose-700 rounded-tl-none font-mono"
                                                                    : "bg-white border border-slate-200/60 text-slate-700 rounded-tl-none shadow-3xs"
                                                        )}
                                                    >
                                                        {msg.text}
                                                    </div>
                                                ))
                                            )}
                                            {isRefining && (
                                                <div className="bg-slate-200/50 text-slate-500 border border-slate-200/40 p-3 rounded-2xl rounded-tl-none text-xs font-bold leading-relaxed max-w-[80%] flex items-center gap-2 animate-pulse">
                                                    <RefreshCw size={11} className="animate-spin text-indigo-500 shrink-0" />
                                                    <span>Passe Graph an...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Chat Input Bar */}
                                        <div className="flex items-end gap-2 shrink-0 pt-2 border-t border-slate-100">
                                            <textarea
                                                value={chatInput}
                                                disabled={isRefining || isLocked}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (chatInput.trim() && !isLocked) {
                                                            handleRefineGraph();
                                                        }
                                                    }
                                                }}
                                                rows={1}
                                                placeholder={isLocked ? "Graph ist schreibgeschützt..." : "z.B. Erhöhe Toleranzen..."}
                                                className="flex-grow min-h-[38px] max-h-[120px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 bg-white placeholder-slate-400 disabled:opacity-60 transition-all duration-200 resize-none custom-scrollbar leading-relaxed"
                                            />
                                            <button
                                                onClick={handleRefineGraph}
                                                disabled={isRefining || !chatInput.trim() || isLocked}
                                                className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center transition-all duration-200 shadow-sm shrink-0 mb-0.5"
                                            >
                                                <Send size={13} className="relative -left-0.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right half: visual preview of nodes */}
                                    <div className="w-full lg:w-1/2 overflow-y-auto p-4 sm:p-8 bg-slate-50/10 h-[50vh] lg:h-full">
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-outfit">Visualisierte Graphen-Struktur</h4>
                                                <Badge className="bg-slate-100 text-slate-600 border border-slate-200/50 py-0.5 px-2 rounded-full font-bold text-xs uppercase">{graph.variables.length} Variablen</Badge>
                                            </div>

                                            {(graph as any).validation?.dryRunChecked && (
                                                <div className={cn(
                                                    "rounded-2xl p-4 text-xs leading-normal flex items-start gap-3 border shadow-xs animate-in fade-in slide-in-from-top-2 duration-300",
                                                    (graph as any).validation.isValid
                                                        ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-950/80"
                                                        : "bg-rose-50/50 border-rose-100/50 text-rose-950/80"
                                                )}>
                                                    <span className="text-xl shrink-0 mt-0.5">{(graph as any).validation.isValid ? "🛡️" : "⚠️"}</span>
                                                    <div className="space-y-1">
                                                        <p className={cn("font-extrabold leading-none", (graph as any).validation.isValid ? "text-emerald-900" : "text-rose-950")}>
                                                            {(graph as any).validation.isValid ? "Plausibilität verifiziert!" : "Simulationsfehler erkannt"}
                                                        </p>
                                                        <p className="leading-relaxed font-medium text-slate-500 mt-1">
                                                            {(graph as any).validation.isValid 
                                                                ? `Dieser Graph wurde mathematisch fehlerfrei simuliert. Alle Formeln werten korrekt aus. ${(graph as any).validation.retriesUsed ? `(Selbst-Korrektur aktiv: ${(graph as any).validation.retriesUsed}x)` : ""}`
                                                                : `Fehler: ${(graph as any).validation.error || "Unbekannter Fehler während der Berechnung."}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {graph.variables.map(v => (
                                                    <div 
                                                        key={v.id} 
                                                        className={cn(
                                                            "p-3.5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center justify-between transition-all",
                                                            hoveredVarId === v.id && "border-indigo-200 shadow-md shadow-indigo-50"
                                                        )}
                                                        onMouseEnter={() => setHoveredVarId(v.id)}
                                                        onMouseLeave={() => setHoveredVarId(null)}
                                                    >
                                                        <div className="space-y-0.5 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-xs text-slate-800 truncate leading-none">{v.id}</span>
                                                                {v.type === 'input' ? (
                                                                    <Badge className="bg-slate-100 text-slate-500 border border-slate-200/30 text-[8px] py-0 px-1 rounded-sm uppercase font-black">IN</Badge>
                                                                ) : (
                                                                    <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100/50 text-[8px] py-0 px-1 rounded-sm uppercase font-black">FORMEL</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-slate-400 font-mono truncate leading-none mt-1">
                                                                {v.type === 'input' ? `Standardwert: ${v.defaultValue}` : `Formel: ${v.expression}`}
                                                            </p>
                                                        </div>

                                                        <div className="text-right shrink-0 ml-4 font-mono font-bold text-xs text-indigo-900 bg-indigo-50/50 border border-indigo-100/40 py-1 px-2.5 rounded-xl">
                                                            {String(evaluatedContext.context[v.id])}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Visual Node Editor & Simplified Inspector */}
                    {activeTab === 'editor' && (
                        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden min-h-0 bg-slate-50/30 relative">
                            {/* Left part: Variables visual list */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-8 min-h-0">
                                <div className="space-y-8 pb-12">
                                    <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-3xl p-5 flex gap-4 text-xs text-indigo-950/80 items-start shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                                        <span className="text-xl">💡</span>
                                        <div className="space-y-1">
                                            <p className="font-extrabold text-indigo-900 leading-none">Manuelle Knotengestaltung</p>
                                            <p className="leading-relaxed">
                                                Fügen Sie manuelle Variablen hinzu oder passen Sie Formeln und Punkte an. Wählen Sie einen Knoten aus, um ihn rechts im Detail-Inspektor einfach anzupassen.
                                            </p>
                                        </div>
                                    </div>

                                    {(graph as any).validation?.dryRunChecked && (
                                        <div className={cn(
                                            "rounded-3xl p-5 text-xs leading-normal flex items-start gap-3 border shadow-xs animate-in fade-in slide-in-from-top-2 duration-300 mt-4",
                                            (graph as any).validation.isValid
                                                ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-950/80"
                                                : "bg-rose-50/50 border-rose-100/50 text-rose-950/80"
                                        )}>
                                            <span className="text-xl shrink-0 mt-0.5">{(graph as any).validation.isValid ? "🛡️" : "⚠️"}</span>
                                            <div className="space-y-1">
                                                <p className={cn("font-extrabold leading-none", (graph as any).validation.isValid ? "text-emerald-900" : "text-rose-950")}>
                                                    {(graph as any).validation.isValid ? "Automatische Validierung: Bestanden" : "Automatische Validierung: Fehler"}
                                                </p>
                                                <p className="leading-relaxed font-medium text-slate-500 mt-1">
                                                    {(graph as any).validation.isValid 
                                                        ? `Dieser Graph hat alle Dry-Run-Tests im Backend erfolgreich bestanden. Er ist absolut deterministisch auswertbar. ${(graph as any).validation.retriesUsed ? `(Selbst-Korrektur benötigt: ${(graph as any).validation.retriesUsed} Versuche)` : ""}`
                                                        : `Warnung: ${(graph as any).validation.error || "Es wurde ein mathematischer Berechnungsfehler oder Zirkelbezug im Graphen festgestellt."}`}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {Object.keys(groupedVariables).length === 0 ? (
                                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center gap-4 shadow-lg shadow-slate-100/50 mt-8 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                                <Sparkles size={24} className="text-indigo-600 animate-pulse" />
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-slate-800 text-sm">Noch kein Bewertungs-Graph vorhanden</h4>
                                                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                                                    Dieser Task hat noch keine mathematische Struktur hinterlegt. Du kannst oben im KI-Assistenten 🪄 einen Graphen generieren lassen oder hier direkt eine manuelle Variable hinzufügen.
                                                </p>
                                            </div>
                                            {!isLocked && (
                                                <div className="flex gap-3 mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAddVariable()}
                                                        className="h-8 text-xs font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                                                    >
                                                        + Erste Variable hinzufügen
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        Object.entries(groupedVariables).map(([groupName, vars]) => (
                                            <div key={groupName} className="space-y-3">
                                                <div className="flex justify-between items-center px-1">
                                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-outfit flex items-center gap-2">
                                                        <Layers size={13} className="text-indigo-400" />
                                                        {groupName}
                                                    </h4>
                                                    {!isLocked && (
                                                        <button
                                                            onClick={() => handleAddVariable(groupName)}
                                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 py-0.5 px-2 hover:bg-indigo-50 rounded-md"
                                                        >
                                                            <Plus size={11} /> Variable hinzufügen
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {vars.map(v => {
                                                        const isSelected = selectedVarId === v.id;
                                                        const isHovered = hoveredVarId === v.id;
                                                        const isDependency = dependenciesOfHovered.has(v.id);
                                                        const evalVal = evaluatedContext.context[v.id];
                                                        const hasError = evaluatedContext.errors[v.id];

                                                        return (
                                                            <div
                                                                key={v.id}
                                                                onClick={() => setSelectedVarId(v.id)}
                                                                onMouseEnter={() => setHoveredVarId(v.id)}
                                                                onMouseLeave={() => setHoveredVarId(null)}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 transition-all flex flex-col gap-3 select-none relative group cursor-pointer text-left",
                                                                    hasError ? "bg-rose-50/20 border-rose-300 hover:border-rose-400 shadow-rose-50/20 shadow-sm" :
                                                                    isSelected ? "bg-white border-indigo-500 shadow-md shadow-indigo-100 ring-1 ring-indigo-500/10" :
                                                                    isDependency ? "bg-indigo-50/40 border-indigo-200 shadow-sm" :
                                                                    isHovered ? "bg-white border-slate-300/80 shadow-sm" :
                                                                    "bg-white border-slate-100 hover:border-slate-200"
                                                                )}
                                                            >
                                                                {/* Variable ID Title and Badges */}
                                                                <div className="flex justify-between items-start gap-3">
                                                                    <div className="space-y-0.5 min-w-0">
                                                                        <h5 className={cn("text-xs font-black font-mono truncate leading-none pt-0.5", isSelected || isDependency ? "text-indigo-950" : "text-slate-800")}>
                                                                            {v.id}
                                                                        </h5>
                                                                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                                            {v.type === 'input' ? 'Statische Eingabe' : 'Formel-Kalkulation'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-1.5 shrink-0 items-center">
                                                                        {hasError && (
                                                                            <Badge className="bg-rose-600 text-white text-[8px] py-0 px-1.5 rounded font-black uppercase flex items-center gap-0.5">
                                                                                <AlertCircle size={8} /> FEHLER
                                                                            </Badge>
                                                                        )}
                                                                        {v.type === 'input' ? (
                                                                            <Badge className="bg-slate-100 border-slate-200 text-slate-600 text-[8px] py-0 px-1.5 rounded font-black uppercase">INPUT</Badge>
                                                                        ) : (
                                                                            <Badge className="bg-indigo-50 border-indigo-100 text-indigo-700 text-[8px] py-0 px-1.5 rounded font-black uppercase">FORMULA</Badge>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Expected Output / Master value */}
                                                                <div className={cn("rounded-xl p-2.5 flex justify-between items-center text-xs border", hasError ? "bg-rose-50/50 border-rose-100/50" : "bg-slate-50 border-slate-100/50")}>
                                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Erwarteter Wert:</span>
                                                                    <span className={cn("font-mono font-bold text-slate-800", hasError ? "text-rose-600" : "text-slate-800")}>
                                                                        {String(evalVal)}
                                                                    </span>
                                                                </div>

                                                                {hasError && (
                                                                    <div className="bg-rose-50 border border-rose-100/50 text-rose-700 rounded-xl p-2.5 text-[10px] leading-normal font-mono flex items-start gap-1.5">
                                                                        <AlertCircle size={12} className="shrink-0 mt-0.5 text-rose-600" />
                                                                        <span className="break-all">{hasError}</span>
                                                                    </div>
                                                                )}

                                                                {/* Small display of expression / default value */}
                                                                <div className="text-xs leading-tight font-medium text-slate-500 truncate font-mono">
                                                                    {v.type === 'input' ? (
                                                                        `Standardwert: ${v.defaultValue}`
                                                                    ) : (
                                                                        `Formel: ${v.expression}`
                                                                    )}
                                                                </div>

                                                                {/* Visual formula dependencies */}
                                                                {v.type === 'formula' && (
                                                                    (() => {
                                                                        const deps = getVariableDependencies(v);
                                                                        if (deps.length === 0) return null;
                                                                        return (
                                                                            <div className="flex flex-wrap gap-1 mt-1 items-center">
                                                                                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider mr-1 shrink-0">🔗 Berechnet aus:</span>
                                                                                {deps.map(d => (
                                                                                    <Badge key={d} className="bg-indigo-50/50 border border-indigo-100/30 text-indigo-600 text-[8px] py-0 px-1 font-mono rounded-sm select-none font-bold">
                                                                                        {d}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        );
                                                                    })()
                                                                )}

                                                                {/* Hover Delete Action Icon */}
                                                                {!isLocked && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteVariable(v.id); }}
                                                                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-100 shadow-md hover:bg-red-50 hover:text-red-500 hover:border-red-100 p-1.5 rounded-lg text-slate-400"
                                                                        title="Variable löschen"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right part: Simplified Node Inspector */}
                            <div className={cn(
                                "absolute inset-0 lg:relative bg-white flex flex-col overflow-hidden shrink-0 transition-all duration-300 min-h-0 lg:w-80 lg:border-l lg:border-t-0 border-t border-slate-100",
                                selectedVar ? "flex h-full z-40" : "h-0 lg:h-full lg:flex hidden"
                            )}>
                                {selectedVar ? (
                                    <div className="flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-6">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                                            <h4 className="text-xs font-black uppercase text-slate-800 font-outfit tracking-tight flex items-center gap-1.5">
                                                <Layers size={12} className="text-indigo-600" />
                                                <span>Knoten-Inspektor</span>
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {!isLocked && (
                                                    <button 
                                                        onClick={() => handleDeleteVariable(selectedVar.id)}
                                                        className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 py-0.5 px-2 hover:bg-red-50 rounded-md cursor-pointer"
                                                    >
                                                        <Trash2 size={11} />
                                                        <span className="hidden sm:inline">Löschen</span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setSelectedVarId(null)}
                                                    className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
                                                    title="Inspektor schließen"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Edit ID Field */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Variablen-ID</label>
                                            <Input
                                                value={selectedVar.id}
                                                disabled={isLocked}
                                                onChange={(e) => handleRenameVariableId(selectedVar.id, e.target.value.trim())}
                                                className="h-9 font-mono text-xs font-bold disabled:opacity-60"
                                            />
                                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                                                Eindeutiger Name der Variable in Schülerlösungen (z.B. <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-600">subnetA_hosts</code>).
                                            </p>
                                        </div>

                                        {/* Type Selector (Input vs Formula) */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Knotentyp</label>
                                            <select
                                                value={selectedVar.type}
                                                disabled={isLocked}
                                                onChange={(e) => handleUpdateVariable(selectedVar.id, { type: e.target.value as VariableType })}
                                                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                <option value="input">📥 Statische Eingabe (Input)</option>
                                                <option value="formula">⚙️ Berechnete Formel (Formula)</option>
                                            </select>
                                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                                                {selectedVar.type === 'input' 
                                                    ? 'Fester Vorgabewert aus der Musterlösung (z.B. Hostanzahl).' 
                                                    : 'Wert wird dynamisch berechnet, um Folgefehler von vorherigen Schritten zu kompensieren.'}
                                            </p>
                                        </div>

                                        {/* Default Value / Expression fields */}
                                        {selectedVar.type === 'input' ? (
                                            <div className="space-y-1">
                                                <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Musterlösung (Wert)</label>
                                                <Input
                                                    value={selectedVar.defaultValue !== undefined ? String(selectedVar.defaultValue) : ''}
                                                    disabled={isLocked}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const num = Number(val);
                                                        handleUpdateVariable(selectedVar.id, { defaultValue: isNaN(num) || val.trim() === '' ? val : num });
                                                    }}
                                                    className="h-9 text-xs font-semibold disabled:opacity-60"
                                                />
                                                <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                                                    Der didaktisch korrekte Wert aus der Musterlösung.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">Berechnungs-Formel</label>
                                                    {evaluatedContext.errors[selectedVar.id] && (
                                                        <Badge className="bg-red-50 text-red-600 text-[8px] py-0 px-1 border-red-100 rounded">Error ⚠️</Badge>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={selectedVar.expression || ''}
                                                    disabled={isLocked}
                                                    onChange={(e) => handleUpdateVariable(selectedVar.id, { expression: e.target.value })}
                                                    rows={3}
                                                    placeholder="z.B. network.calculateMask(subnetA_hosts)"
                                                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white leading-relaxed resize-none shadow-3xs disabled:opacity-60"
                                                />
                                                <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                                                    Berechnungsvorschrift. Verwende Variablen-IDs (z.B. <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-600">subnetA_hosts</code>).
                                                </p>
                                                {evaluatedContext.errors[selectedVar.id] && (
                                                    <p className="text-xs text-red-500 font-semibold font-mono leading-tight pt-1">
                                                        {evaluatedContext.errors[selectedVar.id]}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Points allocation */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-slate-500 tracking-wider text-left block">Punkte für diesen Schritt</label>
                                            <Input
                                                type="number"
                                                value={selectedVar.maxPoints !== undefined ? selectedVar.maxPoints : 1}
                                                disabled={isLocked}
                                                onChange={(e) => handleUpdateVariable(selectedVar.id, { maxPoints: Number(e.target.value) })}
                                                className="h-9 text-xs font-semibold disabled:opacity-60"
                                            />
                                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5 text-left">
                                                Wie viele Punkte der Schüler für diesen korrektten Wert erhält.
                                            </p>
                                            {isPointsDisabled && (
                                                <p className="text-xs text-amber-700 font-semibold leading-relaxed mt-1.5 bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-start gap-1 text-left">
                                                    <span>⚠️</span>
                                                    <span>Hybrid-Grading aktiv: Diese Punkte dienen als relative Gewichtung und mathematische Empfehlung. Die finale Vergabe erfolgt didaktisch flexibel durch das LLM.</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* Collapsible Advanced Settings for Laypeople ease */}
                                        <div className="border-t border-slate-100 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowAdvancedInspector(!showAdvancedInspector)}
                                                className="w-full text-left text-xs font-black uppercase text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-between py-1 cursor-pointer"
                                            >
                                                <span>⚙️ Erweiterte Einstellungen (Toleranzen)</span>
                                                <span className="font-bold text-xs">{showAdvancedInspector ? "−" : "+"}</span>
                                            </button>

                                            {showAdvancedInspector && (
                                                <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {/* Validation Type */}
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Validierungsart</label>
                                                        <select
                                                            value={selectedVar.validationType}
                                                            disabled={isLocked}
                                                            onChange={(e) => handleUpdateVariable(selectedVar.id, { validationType: e.target.value as ValidationType })}
                                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            <option value="exact">Exakte Übereinstimmung</option>
                                                            <option value="tolerance">Abweichung (Toleranz)</option>
                                                            <option value="contains">Enthält Substring</option>
                                                        </select>
                                                        <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                                                            {selectedVar.validationType === 'exact' && 'Der Schüler-Wert muss mathematisch exakt übereinstimmen.'}
                                                            {selectedVar.validationType === 'tolerance' && 'Erlaubt kleine Abweichungen (z.B. Rundungsfehler).'}
                                                            {selectedVar.validationType === 'contains' && 'Prüft, ob der Schüler-Wert einen bestimmten Text enthält.'}
                                                        </p>
                                                    </div>

                                                    {/* Tolerance offset field */}
                                                    {selectedVar.validationType === 'tolerance' && (
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Zulässige Toleranz (+/-)</label>
                                                            <Input
                                                                type="number"
                                                                value={selectedVar.tolerance !== undefined ? selectedVar.tolerance : 0}
                                                                disabled={isLocked}
                                                                onChange={(e) => handleUpdateVariable(selectedVar.id, { tolerance: Number(e.target.value) })}
                                                                className="h-9 text-xs font-semibold disabled:opacity-60"
                                                            />
                                                            <p className="text-xs text-slate-400 font-medium leading-normal mt-0.5">
                                                                Zulässige Rundungs-Abweichung (z.B. <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-slate-600">0.1</code>).
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Evaluated Value Preview block */}
                                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 shrink-0">
                                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Echtzeit-Berechnung (Musterlösung)</span>
                                            <div className="bg-indigo-50/30 rounded-xl p-3 border border-indigo-100/20 flex flex-col gap-1 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-slate-500">Erwarteter Wert:</span>
                                                    <span className="font-mono font-bold text-indigo-900 truncate pl-4">
                                                        {String(evaluatedContext.context[selectedVar.id])}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2 select-none">
                                        <HelpCircle size={32} className="stroke-1 opacity-70" />
                                        <p className="text-xs font-semibold leading-relaxed">
                                            Wähle links einen Knoten aus, um seine Werte manuell anzupassen.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Testing Sandbox */}
                    {activeTab === 'testing' && (
                        <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0 bg-slate-50/30 p-4 lg:p-8 gap-4 lg:gap-8">
                            {/* Left Panel: Inputs (45% width) */}
                            <div className="w-full lg:w-[45%] flex flex-col shrink-0 bg-white border border-slate-100 shadow-glass rounded-[2rem] h-auto lg:h-full overflow-visible lg:overflow-hidden">
                                {/* Sticky Header with Actions */}
                                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                    <div>
                                        <h4 className="text-xs font-black uppercase text-slate-800 font-outfit">Schüler-Eingaben</h4>
                                        <p className="text-xs text-slate-400 font-medium font-inter">Simulationswerte zum Testen</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleFillPerfectPlayground}
                                            className="h-8 text-xs font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 rounded-lg px-2.5"
                                        >
                                            Musterlösung
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            onClick={handleRunPlayground}
                                            className="h-8 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3.5 shadow-md shadow-indigo-100"
                                        >
                                            Berechnen
                                        </Button>
                                    </div>
                                </div>

                                {/* Scrollable Inputs Grid */}
                                <div className="flex-grow lg:flex-1 lg:overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {graph.variables.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-4 font-medium text-center">Keine Variablen deklariert. Erstelle zuerst einen Graphen.</p>
                                    ) : (
                                        <div className="space-y-3.5">
                                            {(graph?.variables || []).map(v => (
                                                <div key={v.id} className="flex flex-col gap-1">
                                                    <label className="text-xs font-bold text-slate-500 font-mono truncate">{v.id}</label>
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            value={playgroundInputs[v.id] || ''}
                                                            onChange={(e) => setPlaygroundInputs({ ...playgroundInputs, [v.id]: e.target.value })}
                                                            placeholder={`Erwartet: ${evaluatedContext.context[v.id]}`}
                                                            className="w-full text-xs font-semibold font-mono border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus:bg-white focus:border-indigo-500 focus:ring-0 focus:outline-hidden transition-all text-slate-800"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Simulation Results (55% width) */}
                            <div className="w-full lg:w-[55%] flex flex-col min-h-0 bg-white border border-slate-100 shadow-glass rounded-[2rem] h-auto lg:h-full overflow-visible lg:overflow-hidden shrink-0">
                                {playgroundResult ? (
                                    <div className="flex flex-col h-full overflow-hidden">
                                        {/* Sticky Score Header */}
                                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                            <div className="text-left">
                                                <h4 className="text-xs font-black uppercase text-slate-800 font-outfit">Simulations-Ergebnis</h4>
                                                <p className="text-xs text-slate-400 font-medium font-inter">Bewertung des Schülerversuchs</p>
                                            </div>
                                            {isPointsDisabled ? (
                                                <Badge className="bg-indigo-50 border-indigo-100 text-indigo-700 font-black px-3 py-1 text-xs rounded-full">
                                                    Variablen: {playgroundResult.stepResults.filter((s: any) => s.status === 'correct' || s.status === 'consecutive_correct').length} / {playgroundResult.stepResults.length} korrekt
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-indigo-50 border-indigo-100 text-indigo-700 font-black px-3 py-1 text-xs rounded-full">
                                                    Gesamtpunkte: {playgroundResult.totalPoints} / {playgroundResult.maxPoints} P
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Scrollable Individual Step Results */}
                                        <div className="flex-grow lg:flex-1 lg:overflow-y-auto p-6 space-y-2.5 custom-scrollbar">
                                            {playgroundResult.stepResults.map((step: any) => (
                                                <div 
                                                    key={step.variableId} 
                                                    className={cn(
                                                        "p-3 rounded-2xl border flex items-center justify-between text-xs transition-all gap-4",
                                                        step.status === 'correct' ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                                                        step.status === 'consecutive_correct' ? "bg-blue-50/50 border-blue-100 text-blue-800" :
                                                        "bg-red-50/50 border-red-100 text-red-800"
                                                    )}
                                                >
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold truncate">{step.variableId}</span>
                                                            <Badge className={cn(
                                                                "text-[8px] py-0 px-1.5 rounded font-black uppercase border shrink-0",
                                                                step.status === 'correct' ? "bg-emerald-100 border-emerald-200 text-emerald-700" :
                                                                step.status === 'consecutive_correct' ? "bg-blue-100 border-blue-200 text-blue-700" :
                                                                "bg-red-100 border-red-200 text-red-700"
                                                            )}>
                                                                {step.status === 'correct' ? 'KORREKT' :
                                                                 step.status === 'consecutive_correct' ? 'FOLGEFEHLER OK' :
                                                                 'PRIMÄRFEHLER'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs opacity-80 leading-relaxed font-medium">
                                                            {step.note}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right font-medium">
                                                            <p className="text-xs opacity-60">Schüler-Wert</p>
                                                            <p className="font-mono font-bold">{step.studentValue !== undefined ? String(step.studentValue) : 'Fehlt'}</p>
                                                        </div>
                                                        {!isPointsDisabled && (
                                                            <Badge variant="outline" className="border-transparent font-black px-2.5 py-1 rounded-full text-xs">
                                                                +{step.points} P
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-grow lg:flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-4 select-none min-h-[250px] lg:min-h-0">
                                        <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center text-indigo-500 mb-2">
                                            <Eye size={28} className="animate-pulse" />
                                        </div>
                                        <div className="max-w-xs space-y-1.5">
                                            <h4 className="font-extrabold text-slate-800 text-sm font-outfit leading-none mb-1">Bereit zum Testen 🧪</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed font-medium font-inter">
                                                Fülle die Musterlösung aus, verändere Werte absichtlich, um Fehler zu simulieren, und klicke auf <strong>Berechnen</strong>, um die Folgefehler-Diagnose live zu prüfen.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: JSON Editor */}
                    {activeTab === 'json' && (
                        <div className="flex-grow flex flex-col overflow-hidden bg-slate-900 border-l border-slate-100 animate-in slide-in-from-left-4 duration-300">
                            <div className="px-6 py-2 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono">raw_graph_config.json</span>
                                {jsonError ? (
                                    <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                                        <AlertCircle size={10} /> Syntax-Fehler!
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                        <Check size={10} /> Validiert
                                    </span>
                                )}
                            </div>
                            <textarea
                                value={jsonText}
                                readOnly={isLocked}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                className="flex-grow p-6 bg-slate-950 text-slate-300 font-mono text-xs outline-hidden border-none resize-none overflow-y-auto leading-relaxed"
                            />
                            {jsonError && (
                                <div className="p-3 bg-red-950/40 border-t border-red-900/40 text-xs font-bold text-red-300 leading-relaxed font-mono">
                                    {jsonError}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                    <p className="text-xs text-slate-400 font-inter text-center sm:text-left leading-normal">
                        * Die Variablen ID wird beim Parsen von Schülerlösungen automatisch gematcht (z. B. "subnetA_hosts").
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto justify-stretch sm:justify-end">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="h-10 flex-1 sm:flex-initial rounded-xl px-5 font-bold text-slate-500 hover:bg-slate-100"
                        >
                            {isLocked ? "Schließen" : "Abbrechen"}
                        </Button>
                        {!isLocked && (
                            <Button 
                                onClick={() => { onSave(graph); onClose(); }}
                                disabled={!!jsonError}
                                className="h-10 flex-1 sm:flex-initial rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 transition-all"
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
