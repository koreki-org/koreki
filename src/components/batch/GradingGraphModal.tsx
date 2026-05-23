import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Check, AlertCircle, Plus, Trash2, Code, Eye, 
    Sparkles, RefreshCw, Layers, ArrowRight, HelpCircle, Link2Off
} from 'lucide-react';
import { GradingGraph, VariableDefinition, VariableType, ValidationType } from '../../lib/grading/types';
import { evaluateExpression } from '../../lib/grading/plugins';
import { GraphRunner } from '../../lib/grading/GraphRunner';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '@/lib/utils';

interface GradingGraphModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialGraph?: GradingGraph;
    taskName?: string;
    taskContent?: string;
    taskType?: string;
    customSkills?: Record<string, any>;
    isGenerating?: boolean;
    onEngineChange?: (newEngine: string) => void;
    onRegenerateGraph?: (discipline: string) => Promise<any>;
    onDeleteGraph?: () => void;
    onSaveCustomSkill?: (name: string, graph: GradingGraph) => void;
    onSave: (graph: GradingGraph) => void;
}

export const GradingGraphModal: React.FC<GradingGraphModalProps> = ({
    isOpen,
    onClose,
    initialGraph,
    taskName = "VLSM Subnetting-Aufgabe",
    taskContent,
    taskType,
    customSkills = {},
    isGenerating = false,
    onEngineChange,
    onRegenerateGraph,
    onDeleteGraph,
    onSaveCustomSkill,
    onSave
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
    const [selectedPlugin, setSelectedPlugin] = useState<string>('computer-science-networking');
    
    // Mount state for SSR safe Portal mounting
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    
    // Collapsible states
    const [isJsonOpen, setIsJsonOpen] = useState(false);
    const [jsonText, setJsonText] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Mock student answer playground values
    const [playgroundInputs, setPlaygroundInputs] = useState<Record<string, string>>({});
    const [playgroundResult, setPlaygroundResult] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'designer' | 'playground'>('designer');

    const [skillName, setSkillName] = useState(() => {
        if (taskType && taskType.startsWith('custom-skill-') && customSkills?.[taskType]) {
            return customSkills[taskType].name || "";
        }
        return taskName || "";
    });

    useEffect(() => {
        if (taskType && taskType.startsWith('custom-skill-') && customSkills?.[taskType]) {
            setSkillName(customSkills[taskType].name || "");
        } else {
            setSkillName(taskName || "");
        }
    }, [taskName, taskType, customSkills]);

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

    if (!isOpen || !mounted) return null;

    const selectedVar = (graph?.variables || []).find(v => v.id === selectedVarId);

    return createPortal(
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-inter text-slate-700">
            <div className="bg-white border border-slate-100 shadow-2xl rounded-[2.5rem] w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
                            <Layers size={20} className="text-indigo-600 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 font-outfit tracking-tight flex items-center gap-2">
                                Grading Graph Designer
                                <Badge className="bg-indigo-600 text-white font-bold py-0 px-2 text-[9px] rounded-full uppercase">PANG engine</Badge>
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">{taskName} (Variable Beziehungen, Toleranzen & Folgefehler-Pfade)</p>
                        </div>
                    </div>
                    
                    {/* Mode selector tab */}
                    <div className="flex bg-slate-200/50 p-1 rounded-xl gap-1 shrink-0 ml-auto mr-6">
                        <button 
                            onClick={() => setActiveTab('designer')}
                            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeTab === 'designer' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                        >
                            Graph Designer
                        </button>
                        <button 
                            onClick={() => { setActiveTab('playground'); handleRunPlayground(); }}
                            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeTab === 'playground' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                        >
                            Mock-Spielwiese 🧪
                        </button>
                    </div>

                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-100 rounded-full"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Subheader/Actions Panel Toolbar */}
                <div className="px-8 py-3 bg-slate-50/20 border-b border-slate-100/50 flex flex-wrap items-center gap-6 shrink-0">
                    {/* 1. Assign Existing Graph Skill from Skill Center */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bestehender Skill:</span>
                        <select
                            value={taskType || 'default'}
                            onChange={(e) => onEngineChange?.(e.target.value)}
                            className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200"
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
                    <div className="h-6 w-px bg-slate-200"></div>

                    {/* 3. Name & Save Custom Skill (Template) */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Skill Name:</span>
                        <Input 
                            value={skillName}
                            onChange={(e) => setSkillName(e.target.value)}
                            placeholder="z.B. Subnetz-Berechnung"
                            className="h-8 w-44 rounded-xl border border-slate-200 text-xs font-bold px-2.5 focus:border-indigo-500 bg-white"
                        />
                        {onSaveCustomSkill && (
                            <Button
                                onClick={() => {
                                    if (!skillName.trim()) {
                                        alert("Bitte gib einen Namen für den Skill ein.");
                                        return;
                                    }
                                    onSaveCustomSkill(skillName.trim(), graph);
                                }}
                                className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all text-xs gap-1 px-3 flex items-center shrink-0"
                                title="Als wiederverwendbaren Custom Skill im Skill Center speichern"
                            >
                                💾 Speichern
                            </Button>
                        )}
                        {onDeleteGraph && initialGraph && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (confirm("Möchtest du den Bewertungs-Graphen wirklich unwiderruflich löschen?")) {
                                        onDeleteGraph();
                                    }
                                }}
                                className="h-8 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all text-xs font-bold gap-1 px-3 flex items-center shrink-0"
                                title="Bewertungs-Graph löschen und Aufgabe zurücksetzen"
                            >
                                <Trash2 size={13} />
                                <span>Löschen</span>
                            </Button>
                        )}
                    </div>

                    {/* Divider line */}
                    <div className="h-6 w-px bg-slate-200"></div>

                    {/* 2. Generate New AI Graph */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">KI-Graph generieren:</span>
                        
                        <select
                            value={selectedPlugin}
                            onChange={(e) => setSelectedPlugin(e.target.value)}
                            className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200"
                        >
                            <option value="computer-science-networking">Netzwerk-Plugin (VLSM)</option>
                            <option value="computer-science-storage">Speicher-Plugin (RAID)</option>
                        </select>

                        {onRegenerateGraph && taskContent && taskContent.trim().length > 10 && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isGenerating}
                                onClick={async () => {
                                    await onRegenerateGraph(selectedPlugin);
                                }}
                                className={cn(
                                    "h-8 px-3 rounded-xl border text-xs font-bold transition-all duration-300 gap-1.5 shrink-0 bg-primary/5 text-primary border-primary/20 hover:bg-primary hover:text-white"
                                )}
                            >
                                {isGenerating ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                    <Sparkles size={12} />
                                )}
                                <span>{isGenerating ? "Generiere..." : "KI-Graph generieren"}</span>
                            </Button>
                        )}
                    </div>

                    {/* Hint text / spacer */}
                    <span className="text-[10px] text-slate-400 font-medium hidden xl:flex items-center gap-1.5 ml-auto">
                        <Sparkles size={11} className="text-indigo-500" />
                        Hover über Formel für Abhängigkeiten
                    </span>

                    {/* 7. Raw JSON Toggle */}
                    <div className={cn("flex gap-2", !onRegenerateGraph && "ml-auto")}>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsJsonOpen(!isJsonOpen)}
                            className="h-8 text-[10px] font-bold uppercase rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5"
                        >
                            <Code size={13} />
                            {isJsonOpen ? "JSON schließen" : "JSON Code-Editor"}
                        </Button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden min-h-0">
                    
                    {/* Left Panel: Raw JSON code editor */}
                    {isJsonOpen && (
                        <div className="w-1/3 border-r border-slate-100 bg-slate-900 flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-300">
                            <div className="px-4 py-2 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">raw_graph_config.json</span>
                                {jsonError ? (
                                    <span className="text-[9px] font-bold text-red-400 flex items-center gap-1">
                                        <AlertCircle size={10} /> Syntax-Fehler!
                                    </span>
                                ) : (
                                    <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                                        <Check size={10} /> Validiert
                                    </span>
                                )}
                            </div>
                            <textarea
                                value={jsonText}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                className="flex-1 p-4 bg-slate-950 text-slate-300 font-mono text-xs outline-hidden border-none resize-none overflow-y-auto leading-relaxed"
                            />
                            {jsonError && (
                                <div className="p-3 bg-red-950/40 border-t border-red-900/40 text-[10px] font-bold text-red-300 leading-relaxed font-mono">
                                    {jsonError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Center Workspace (Design Flow vs. Playground) */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                        {activeTab === 'designer' ? (
                            <div className="space-y-8 pb-12">
                                <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-3xl p-5 flex gap-4 text-xs text-indigo-950/80 items-start shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                                    <span className="text-xl">💡</span>
                                    <div className="space-y-1">
                                        <p className="font-extrabold text-indigo-900 leading-none">Bewertungs-Graph &amp; Folgefehler-Kompensation</p>
                                        <p className="leading-relaxed">
                                            Legen Sie hier die mathematische Struktur Ihrer Musterlösung fest. Die PANG-Engine nutzt diese Variablen und Formeln, um Schülerarbeiten intelligent abzugleichen und Folgefehler vollautomatisch und didaktisch perfekt zu bewerten.
                                        </p>
                                    </div>
                                </div>
                                {Object.keys(groupedVariables).length === 0 ? (
                                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center gap-4 shadow-lg shadow-slate-100/50 mt-8 animate-in fade-in zoom-in-95 duration-500">
                                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                            <Sparkles size={24} className="text-indigo-600 animate-pulse" />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-slate-800 text-sm">Noch kein Bewertungs-Graph vorhanden</h4>
                                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
                                                Dieser Task hat noch keine mathematische Struktur hinterlegt. Wählen Sie oben eine <strong>Engine</strong> aus, laden Sie eine <strong>bestehende Vorlage</strong> oder klicken Sie auf <strong>KI-Graph</strong>, um einen passgenauen Graphen generieren zu lassen.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 mt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddVariable()}
                                                className="h-8 text-[10px] font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                                            >
                                                + Leere Variable hinzufügen
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    Object.entries(groupedVariables).map(([groupName, vars]) => (
                                        <div key={groupName} className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-outfit flex items-center gap-2">
                                                    <Layers size={13} className="text-indigo-400" />
                                                    {groupName}
                                                </h4>
                                                <button
                                                    onClick={() => handleAddVariable(groupName)}
                                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 py-0.5 px-2 hover:bg-indigo-50 rounded-md"
                                                >
                                                    <Plus size={11} /> Variable hinzufügen
                                                </button>
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
                                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                                        {v.type === 'input' ? 'Statische Eingabe' : 'Formel-Kalkulation'}
                                                                    </p>
                                                                </div>
                                                                <div className="flex gap-1.5 shrink-0">
                                                                    {v.type === 'input' ? (
                                                                        <Badge className="bg-slate-100 border-slate-200 text-slate-600 text-[8px] py-0 px-1.5 rounded font-black uppercase">INPUT</Badge>
                                                                    ) : (
                                                                        <Badge className="bg-indigo-50 border-indigo-100 text-indigo-700 text-[8px] py-0 px-1.5 rounded font-black uppercase">FORMULA</Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Expected Output / Master value */}
                                                            <div className="bg-slate-50 rounded-xl p-2.5 flex justify-between items-center text-xs border border-slate-100/50">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Erwarteter Wert:</span>
                                                                <span className={cn("font-mono font-bold text-slate-800", hasError ? "text-red-500" : "text-slate-800")}>
                                                                    {String(evalVal)}
                                                                </span>
                                                            </div>

                                                            {/* Small display of expression / default value */}
                                                            <div className="text-[10px] leading-tight font-medium text-slate-500 truncate font-mono">
                                                                {v.type === 'input' ? (
                                                                    `Standardwert: ${v.defaultValue}`
                                                                ) : (
                                                                    `Expression: ${v.expression}`
                                                                )}
                                                            </div>

                                                            {/* Hover Delete Action Icon */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteVariable(v.id); }}
                                                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-100 shadow-md hover:bg-red-50 hover:text-red-500 hover:border-red-100 p-1.5 rounded-lg text-slate-400"
                                                                title="Variable löschen"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            // --- PLAYGROUND MODE ---
                            <div className="space-y-6 max-w-3xl mx-auto pb-12">
                                <div className="bg-white border border-slate-100 shadow-glass rounded-3xl p-6 space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 font-outfit">Simulations-Spielwiese</h4>
                                            <p className="text-[10px] text-slate-400 font-medium">Trage hier fehlerhafte Werte ein, um die Folgefehler-Kompensation zu validieren.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => setActiveTab('designer')}
                                                className="h-8 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg px-3 mr-2 border border-slate-200"
                                            >
                                                ← Zurück zum Designer
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={handleFillPerfectPlayground}
                                                className="h-8 text-[10px] font-bold border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 rounded-lg px-3"
                                            >
                                                Musterlösung ausfüllen
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={handleRunPlayground}
                                                className="h-8 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 shadow-md shadow-indigo-100"
                                            >
                                                Berechnen
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Grid of student mock inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        {(graph?.variables || []).map(v => (
                                            <div key={v.id} className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 font-mono truncate">{v.id}</label>
                                                <div className="relative">
                                                    <input
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
                                </div>

                                {/* Playground simulation results */}
                                {playgroundResult && (
                                    <div className="bg-white border border-slate-100 shadow-glass rounded-3xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-outfit">Simulations-Ergebnis</span>
                                            <Badge className="bg-indigo-50 border-indigo-100 text-indigo-700 font-black px-3 py-1 text-xs rounded-full">
                                                Gesamtpunkte: {playgroundResult.totalPoints} / {playgroundResult.maxPoints} P
                                            </Badge>
                                        </div>

                                        {/* Individual step results list */}
                                        <div className="space-y-2.5">
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
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold">{step.variableId}</span>
                                                            <Badge className={cn(
                                                                "text-[8px] py-0 px-1.5 rounded font-black uppercase border",
                                                                step.status === 'correct' ? "bg-emerald-100 border-emerald-200 text-emerald-700" :
                                                                step.status === 'consecutive_correct' ? "bg-blue-100 border-blue-200 text-blue-700" :
                                                                "bg-red-100 border-red-200 text-red-700"
                                                            )}>
                                                                {step.status === 'correct' ? 'KORREKT' :
                                                                 step.status === 'consecutive_correct' ? 'FOLGEFEHLER OK' :
                                                                 'PRIMÄRFEHLER'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] opacity-80 leading-relaxed font-medium">
                                                            {step.note}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right font-medium">
                                                            <p className="text-[10px] opacity-60">Schüler-Wert</p>
                                                            <p className="font-mono font-bold">{step.studentValue !== undefined ? String(step.studentValue) : 'Fehlt'}</p>
                                                        </div>
                                                        <Badge variant="outline" className="border-transparent font-black px-2.5 py-1 rounded-full text-xs">
                                                            +{step.points} P
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Selected Variable Detail Inspector (Designer tab only) */}
                    {activeTab === 'designer' && (
                        <div className="w-80 border-l border-slate-100 bg-slate-50/30 flex flex-col overflow-hidden shrink-0">
                            {selectedVar ? (
                                <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-100 shrink-0">
                                        <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider font-outfit">Node-Inspektor</h4>
                                        <button 
                                            onClick={() => handleDeleteVariable(selectedVar.id)}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 py-0.5 px-2 hover:bg-red-50 rounded-md"
                                        >
                                            <Trash2 size={12} />
                                            Löschen
                                        </button>
                                    </div>

                                    {/* Edit ID Field */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Variablen-ID</label>
                                        <Input
                                            value={selectedVar.id}
                                            onChange={(e) => handleRenameVariableId(selectedVar.id, e.target.value.trim())}
                                            className="h-9 font-mono text-xs font-bold"
                                        />
                                    </div>

                                    {/* Type Selector (Input vs Formula) */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Knotentyp</label>
                                        <select
                                            value={selectedVar.type}
                                            onChange={(e) => handleUpdateVariable(selectedVar.id, { type: e.target.value as VariableType })}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white cursor-pointer"
                                        >
                                            <option value="input">📥 Statische Eingabe (Input)</option>
                                            <option value="formula">⚙️ Berechnete Formel (Formula)</option>
                                        </select>
                                    </div>

                                    {/* Default Value / Expression fields */}
                                    {selectedVar.type === 'input' ? (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Standardwert (Musterlösung)</label>
                                            <Input
                                                value={selectedVar.defaultValue !== undefined ? String(selectedVar.defaultValue) : ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Parse as number if numeric
                                                    const num = Number(val);
                                                    handleUpdateVariable(selectedVar.id, { defaultValue: isNaN(num) || val.trim() === '' ? val : num });
                                                }}
                                                className="h-9 text-xs font-semibold"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Formel-Ausdruck</label>
                                                {evaluatedContext.errors[selectedVar.id] && (
                                                    <Badge className="bg-red-50 text-red-600 text-[8px] py-0 px-1 border-red-100 rounded">Error ⚠️</Badge>
                                                )}
                                            </div>
                                            <textarea
                                                value={selectedVar.expression || ''}
                                                onChange={(e) => handleUpdateVariable(selectedVar.id, { expression: e.target.value })}
                                                rows={3}
                                                placeholder="e.g. network.calculateMask(subnetA_hosts)"
                                                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white leading-relaxed resize-none"
                                            />
                                            {evaluatedContext.errors[selectedVar.id] && (
                                                <p className="text-[9px] text-red-500 font-semibold font-mono leading-tight pt-1">
                                                    {evaluatedContext.errors[selectedVar.id]}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Validation Type */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Validierungsart</label>
                                        <select
                                            value={selectedVar.validationType}
                                            onChange={(e) => handleUpdateVariable(selectedVar.id, { validationType: e.target.value as ValidationType })}
                                            className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white cursor-pointer"
                                        >
                                            <option value="exact">Exakte Übereinstimmung</option>
                                            <option value="tolerance">Abweichung (Toleranz)</option>
                                            <option value="contains">Enthält Substring</option>
                                        </select>
                                    </div>

                                    {/* Tolerance offset field */}
                                    {selectedVar.validationType === 'tolerance' && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Zulässige Toleranz (+/-)</label>
                                            <Input
                                                type="number"
                                                value={selectedVar.tolerance !== undefined ? selectedVar.tolerance : 0}
                                                onChange={(e) => handleUpdateVariable(selectedVar.id, { tolerance: Number(e.target.value) })}
                                                className="h-9 text-xs font-semibold"
                                            />
                                        </div>
                                    )}

                                    {/* Points allocation */}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Punkte für diesen Schritt</label>
                                        <Input
                                            type="number"
                                            value={selectedVar.maxPoints !== undefined ? selectedVar.maxPoints : 1}
                                            onChange={(e) => handleUpdateVariable(selectedVar.id, { maxPoints: Number(e.target.value) })}
                                            className="h-9 text-xs font-semibold"
                                        />
                                    </div>

                                    {/* Evaluated Value Preview block */}
                                    <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 shrink-0">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Echtzeit-Berechnung</span>
                                        <div className="bg-slate-100/50 rounded-xl p-3 border border-slate-200/50 flex flex-col gap-1 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-500">Erwarteter Wert:</span>
                                                <span className="font-mono font-bold text-slate-800">
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
                                        Wähle eine Variable aus dem Graph, um ihre Details hier anzupassen.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                    <p className="text-[10px] text-slate-400 font-inter">
                        * Die Variablen ID wird beim Parsen von Schülerlösungen automatisch gematcht (z. B. "subnetA_hosts").
                    </p>
                    <div className="flex gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="h-10 rounded-xl px-5 font-bold text-slate-500 hover:bg-slate-100"
                        >
                            Abbrechen
                        </Button>
                        <Button 
                            onClick={() => { onSave(graph); onClose(); }}
                            disabled={!!jsonError}
                            className="h-10 rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 transition-all"
                        >
                            Zuweisen
                        </Button>
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
