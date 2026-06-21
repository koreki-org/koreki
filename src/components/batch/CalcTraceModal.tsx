import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Sparkles, RefreshCw, Check, AlertCircle, Eye, Layers } from 'lucide-react';
import { CalcTrace, CalcStep } from '../../lib/grading/calc-trace-types';
import { evaluateCalcTrace } from '../../lib/grading/CalcTrace';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '@/lib/utils';
import { AppSettings } from '../../types';

interface CalcTraceModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTrace?: CalcTrace;
    taskName?: string;
    taskContent?: string;
    taskType?: string;
    customSkills?: Record<string, any>;
    settings?: AppSettings;
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    isGenerating?: boolean;
    onEngineChange?: (newEngine: string) => void;
    onRegenerateCalcTrace?: (userNotes?: string) => Promise<any>;
    onDeleteCalcTrace?: () => void;
    onSaveCustomSkill?: (name: string, trace: CalcTrace) => void;
    onSave: (trace: CalcTrace) => void;
    isLocked?: boolean;
}

export const CalcTraceModal: React.FC<CalcTraceModalProps> = ({
    isOpen,
    onClose,
    initialTrace,
    taskName = "MINT-Aufgabe",
    taskContent = "",
    taskType,
    customSkills = {},
    isGenerating = false,
    onEngineChange,
    onRegenerateCalcTrace,
    onDeleteCalcTrace,
    onSaveCustomSkill,
    onSave,
    isLocked = false
}) => {
    const [mounted, setMounted] = useState(false);
    const [trace, setTrace] = useState<CalcTrace>(() => initialTrace || { taskId: `task-${Date.now()}`, steps: [] });
    const [userNotes, setUserNotes] = useState('');
    const [activeTab, setActiveTab] = useState<'editor' | 'testing'>(() => {
        const hasTrace = initialTrace && Array.isArray(initialTrace.steps) && initialTrace.steps.length > 0;
        return hasTrace ? 'testing' : 'editor';
    });

    const [skillName, setSkillName] = useState(() => {
        if (taskType && taskType.startsWith('custom-skill-') && customSkills?.[taskType]) {
            return customSkills[taskType].name || "";
        }
        return taskName || "";
    });

    // Mock student answer playground values
    const [playgroundInputs, setPlaygroundInputs] = useState<Record<string, string>>({});
    const [playgroundResult, setPlaygroundResult] = useState<any>(null);

    const isPointsDisabled = useMemo(() => {
        if (trace && typeof trace.disablePoints === 'boolean') {
            return trace.disablePoints;
        }
        return true; // Default to hybrid grading (disabled points) for CalcTrace
    }, [trace?.disablePoints]);

    useEffect(() => { 
        setMounted(true); 
        return () => setMounted(false); 
    }, []);

    useEffect(() => {
        if (initialTrace) {
            setTrace(initialTrace);
        }
    }, [initialTrace]);

    useEffect(() => {
        if (taskType && taskType.startsWith('custom-skill-') && customSkills?.[taskType]) {
            setSkillName(customSkills[taskType].name || "");
        } else {
            setSkillName(taskName || "");
        }
    }, [taskName, taskType]);

    if (!mounted || !isOpen) return null;

    const handleAddStep = () => {
        if (isLocked) return;
        const newStep: CalcStep = {
            id: `step_${Date.now().toString().slice(-4)}`,
            label: `Schritt ${trace.steps.length + 1}`,
            type: 'given',
            value: 0,
            points: 1,
            tolerance: 0.01
        };
        setTrace(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
    };

    const handleDeleteStep = (id: string) => {
        if (isLocked) return;
        setTrace(prev => ({ ...prev, steps: prev.steps.filter(s => s.id !== id) }));
    };

    const handleUpdateStep = (id: string, updated: Partial<CalcStep>) => {
        if (isLocked) return;
        setTrace(prev => {
            const nextSteps = prev.steps.map(s => {
                if (s.id !== id) return s;
                const nextStep = { ...s, ...updated } as CalcStep;
                if (updated.type === 'given') {
                    delete nextStep.formula;
                } else if (updated.type === 'calc' && !nextStep.formula) {
                    nextStep.formula = '';
                }
                return nextStep;
            });
            return { ...prev, steps: nextSteps };
        });
    };

    const handleRegenerate = async () => {
        if (!onRegenerateCalcTrace || isLocked) return;
        const newTrace = await onRegenerateCalcTrace(userNotes);
        if (newTrace) {
            setTrace(newTrace);
            setUserNotes('');
        }
    };

    const handleRunPlayground = (currentTrace = trace) => {
        const studentAnswers: Record<string, number | null> = {};
        currentTrace.steps.forEach(s => {
            const inputVal = playgroundInputs[s.id];
            if (inputVal !== undefined && inputVal.trim() !== '') {
                studentAnswers[s.id] = isNaN(Number(inputVal)) ? null : Number(inputVal);
            } else {
                studentAnswers[s.id] = null;
            }
        });
        try {
            const res = evaluateCalcTrace(currentTrace, studentAnswers);
            setPlaygroundResult(res);
        } catch (e: any) {
            console.error('Playground evaluation error:', e);
        }
    };

    const handleFillPerfectPlayground = () => {
        const perfect: Record<string, string> = {};
        trace.steps.forEach(s => {
            perfect[s.id] = String(s.value);
        });
        setPlaygroundInputs(perfect);
        
        // Immediately run evaluation using perfect answers
        const studentAnswers: Record<string, number | null> = {};
        trace.steps.forEach(s => {
            studentAnswers[s.id] = s.value;
        });
        try {
            const res = evaluateCalcTrace(trace, studentAnswers);
            setPlaygroundResult(res);
        } catch (e: any) {
            console.error('Playground evaluation error:', e);
        }
    };

    const validation = (trace as any).validation;

    return createPortal(
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-inter text-slate-700">
            <div className="bg-white border border-slate-100 shadow-2xl rounded-none sm:rounded-[var(--radius)] w-full max-w-7xl lg:max-w-[1360px] h-[100dvh] sm:h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
                
                {/* Header */}
                <div className="px-4 py-4 sm:px-8 sm:py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row gap-4 lg:gap-3 justify-between items-start lg:items-center shrink-0">
                    <div className="flex items-center justify-between w-full lg:w-auto gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                                <Layers size={20} className="text-blue-600 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm sm:text-lg font-black text-slate-900 font-outfit tracking-tight flex items-center gap-2 flex-wrap">
                                    MINT Rechenketten Designer
                                    <Badge className="bg-blue-600 text-white font-bold py-0.5 px-2.5 text-xs rounded-full uppercase">CalcTrace</Badge>
                                </h3>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate">{taskName} (Schritte, Formeln & Folgefehler-Kompensation)</p>
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
                            onClick={() => setActiveTab('editor')}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'editor' ? "bg-white text-blue-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800")}
                        >
                            <Layers size={12} className={cn(activeTab === 'editor' && "text-blue-600")} />
                            Ketten-Editor 📐
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setActiveTab('testing'); handleRunPlayground(); }}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0", activeTab === 'testing' ? "bg-white text-blue-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800")}
                        >
                            <Eye size={12} className={cn(activeTab === 'testing' && "text-blue-600")} />
                            Kette testen 🧪
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
                        <span>Die Rechenkette befindet sich im schreibgeschützten Modus (Read-Only), da bereits korrigierte Schülerarbeiten vorliegen. Änderungen sind deaktiviert.</span>
                    </div>
                )}

                {/* Subheader/Actions Panel Toolbar */}
                <div className="px-4 sm:px-8 py-3 bg-slate-50/20 border-b border-slate-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-inter">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 w-full md:w-auto">
                        {/* 1. Assign Existing Skill */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider text-left block">Bestehender Skill:</span>
                            <select
                                value={taskType || 'default'}
                                disabled={isLocked}
                                onChange={(e) => onEngineChange?.(e.target.value)}
                                className="w-full sm:w-auto h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="default">-- Kein Kettenskill aktiv (Standard) --</option>
                                {Object.entries(customSkills || {})
                                    .filter(([_, s]) => s && (s.isCalcTrace || s.calcTrace))
                                    .map(([id, skill]) => (
                                        <option key={id} value={id}>
                                            {skill.name || id}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Divider line */}
                        <div className="hidden md:block h-6 w-px bg-slate-200"></div>

                        {/* 1b. Bewertung Mode Dropdown */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider text-left block">Bewertung:</span>
                            <select
                                value={isPointsDisabled ? 'hybrid' : 'strict'}
                                disabled={isLocked}
                                onChange={(e) => {
                                    setTrace(prev => ({
                                        ...prev,
                                        disablePoints: e.target.value === 'hybrid'
                                    }));
                                }}
                                className="w-full sm:w-auto h-8 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 text-xs font-bold cursor-pointer focus:outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-inter"
                                title={isPointsDisabled 
                                    ? "Hybrid-Grading aktiv: CalcTrace prüft nur die mathematische Korrektheit. Die finale Punktevergabe erfolgt didaktisch flexibel durch das LLM." 
                                    : "Strenge Punktevergabe aktiv: CalcTrace bestimmt die Punkte absolut starr und mathematisch exakt."
                                }
                            >
                                <option value="hybrid">✨ Hybrid-Grading (Didaktisch tolerant)</option>
                                <option value="strict">🔒 Strenge Punkte (Mathematisch starr)</option>
                            </select>
                        </div>

                        {/* Divider line */}
                        <div className="hidden md:block h-6 w-px bg-slate-200"></div>

                        {/* 2. Name & Save Custom Skill */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider text-left block">Skill Name:</span>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                                <Input 
                                    value={skillName}
                                    disabled={isLocked}
                                    onChange={(e) => setSkillName(e.target.value)}
                                    placeholder="z.B. Widerstands-Kette"
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
                                                    onSaveCustomSkill(skillName.trim(), trace);
                                                } else {
                                                    onSave(trace);
                                                    alert(`Änderungen an der Rechenkette wurden in den Skill "${skillName.trim()}" übernommen. Klicke gleich im Skill-Editor unten auf 'Speichern', um sie dauerhaft zu sichern!`);
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial h-8 rounded-full text-xs font-black uppercase border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100 gap-1.5 px-4 transition-all flex items-center justify-center shrink-0 shadow-xs duration-300 active:scale-95"
                                            title="Als wiederverwendbaren Custom Skill im Skill Center speichern bzw. übernehmen"
                                        >
                                            <Check size={14} /> Speichern
                                        </Button>
                                    )}
                                    {onDeleteCalcTrace && initialTrace && !isLocked && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                if (confirm("Möchtest du die Rechenkette wirklich unwiderruflich löschen?")) {
                                                    onDeleteCalcTrace();
                                                }
                                            }}
                                            className="flex-1 sm:flex-initial h-8 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all text-xs font-bold gap-1 px-3 flex items-center justify-center shrink-0"
                                            title="Rechenkette löschen und Aufgabe zurücksetzen"
                                        >
                                            <Trash2 size={13} />
                                            <span>Löschen</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-grow flex flex-col overflow-hidden min-h-0 bg-slate-50/30">
                    
                    {/* Tab 1: Editor */}
                    {activeTab === 'editor' && (
                        <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 lg:p-6 gap-6 min-h-0">
                            {/* Left Pane: Task Text & AI prompt */}
                            <div className="w-full lg:w-1/3 flex flex-col gap-4 shrink-0">
                                <div className="flex-1 flex flex-col min-h-[150px]">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Aufgabentext</label>
                                    <div className="flex-1 p-4 bg-white border border-slate-100 shadow-sm rounded-2xl text-xs font-medium text-slate-600 leading-relaxed overflow-y-auto whitespace-pre-wrap select-text">
                                        {taskContent || "Kein Aufgabentext vorhanden."}
                                    </div>
                                </div>

                                {onRegenerateCalcTrace && !isLocked && (
                                    <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-3">
                                        <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                                            <Sparkles size={14} className="text-blue-500 animate-pulse" />
                                            KI-Unterstützung
                                        </h4>
                                        <div className="space-y-1.5">
                                            <textarea
                                                value={userNotes}
                                                onChange={(e) => setUserNotes(e.target.value)}
                                                placeholder="Optionale Hinweise für die KI (z.B. 'Toleranz für Schritt x auf 5% setzen')...."
                                                rows={3}
                                                disabled={isGenerating}
                                                className="w-full p-2.5 rounded-xl border border-blue-100/50 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-transparent outline-none bg-white placeholder-slate-400 resize-none"
                                            />
                                            <Button
                                                onClick={handleRegenerate}
                                                disabled={isGenerating}
                                                className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 transition-all"
                                            >
                                                {isGenerating ? (
                                                    <RefreshCw size={13} className="animate-spin" />
                                                ) : (
                                                    <Sparkles size={13} />
                                                )}
                                                {isGenerating ? 'Generiere...' : 'Kette mit KI generieren'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Pane: Table Editor */}
                            <div className="flex-1 flex flex-col gap-4 min-h-[300px] overflow-hidden">
                                <div className="flex justify-between items-center shrink-0">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rechenschritte</span>
                                    {!isLocked && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAddStep}
                                            className="h-8 text-xs font-bold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 rounded-xl px-3 gap-1 transition-all"
                                        >
                                            <Plus size={14} /> Schritt hinzufügen
                                        </Button>
                                    )}
                                </div>

                                {/* Validation Banner if exists */}
                                {validation?.dryRunChecked && (
                                    <div className={cn(
                                        "relative overflow-hidden rounded-2xl border px-4 py-3 shrink-0 flex items-start gap-3 shadow-xs transition-all animate-fade-in",
                                        validation.isValid ? "bg-emerald-50/50 border-emerald-100/60" : "bg-rose-50/50 border-rose-100/60"
                                    )}>
                                        <span className="text-xl shrink-0 mt-0.5">{validation.isValid ? "🛡️" : "⚠️"}</span>
                                        <div>
                                            <p className={cn("font-extrabold leading-none", validation.isValid ? "text-emerald-900" : "text-rose-950")}>
                                                {validation.isValid ? "Plausibilität verifiziert!" : "Simulationsfehler erkannt"}
                                            </p>
                                            <p className={cn("text-xs leading-normal mt-1", validation.isValid ? "text-emerald-800" : "text-rose-800")}>
                                                {validation.isValid 
                                                    ? `Diese Rechenkette wurde mathematisch fehlerfrei simuliert. Alle Formeln werten korrekt aus. ${validation.retriesUsed ? `(Selbst-Korrektur aktiv: ${validation.retriesUsed}x)` : ""}`
                                                    : `Fehler: ${validation.error || "Unbekannter Fehler während der Berechnung."}`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-grow border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col min-h-0">
                                    <div className="flex-grow overflow-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-[1000px]">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                    <th className="py-2.5 px-3 w-32 min-w-[128px]">ID</th>
                                                    <th className="py-2.5 px-3 min-w-[160px]">Bezeichnung</th>
                                                    <th className="py-2.5 px-3 w-28 min-w-[112px]">Typ</th>
                                                    <th className="py-2.5 px-3 w-28 min-w-[112px]">Musterwert</th>
                                                    <th className="py-2.5 px-3 min-w-[200px]">Formel (mathjs)</th>
                                                    <th className="py-2.5 px-3 w-24 min-w-[96px]">Toleranz</th>
                                                    <th className="py-2.5 px-3 w-24 min-w-[96px]">Einheit</th>
                                                    <th className="py-2.5 px-3 w-20 min-w-[80px]">Punkte</th>
                                                    {!isLocked && <th className="py-2.5 px-3 w-12 text-center"></th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-inter text-xs">
                                                {trace.steps.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={isLocked ? 8 : 9} className="py-8 text-center text-slate-400 font-medium">
                                                            Keine Rechenschritte vorhanden. Nutze die KI-Generierung oder füge Schritte hinzu.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    trace.steps.map((step) => (
                                                        <tr key={step.id} className="hover:bg-slate-100/30 transition-all">
                                                            <td className="p-2">
                                                                <input
                                                                    value={step.id}
                                                                    onChange={(e) => handleUpdateStep(step.id, { id: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                                                    disabled={isLocked}
                                                                    className="w-full px-2 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    value={step.label}
                                                                    onChange={(e) => handleUpdateStep(step.id, { label: e.target.value })}
                                                                    disabled={isLocked}
                                                                    className="w-full px-2 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <select
                                                                    value={step.type}
                                                                    onChange={(e) => handleUpdateStep(step.id, { type: e.target.value as 'given' | 'calc' })}
                                                                    disabled={isLocked}
                                                                    className="w-full px-1.5 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer focus:bg-white font-inter"
                                                                >
                                                                    <option value="given">Gegeben</option>
                                                                    <option value="calc">Formel</option>
                                                                </select>
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={step.value}
                                                                    onChange={(e) => handleUpdateStep(step.id, { value: parseFloat(e.target.value) || 0 })}
                                                                    disabled={isLocked}
                                                                    className="w-full px-2 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    value={step.formula || ''}
                                                                    placeholder={step.type === 'given' ? 'N/A' : 'z.B. step_r1 + step_r2'}
                                                                    onChange={(e) => handleUpdateStep(step.id, { formula: e.target.value })}
                                                                    disabled={isLocked || step.type === 'given'}
                                                                    className={cn(
                                                                        "w-full px-2 py-1 border rounded-lg text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-blue-500",
                                                                        step.type === 'given' ? "bg-slate-100 border-slate-100 text-slate-400 select-none" : "bg-slate-50/50 border-slate-200 text-slate-700 focus:bg-white"
                                                                    )}
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    step="any"
                                                                    value={step.tolerance !== undefined ? step.tolerance : ''}
                                                                    placeholder="0.01"
                                                                    onChange={(e) => handleUpdateStep(step.id, { tolerance: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                                    disabled={isLocked}
                                                                    className="w-full px-2 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    value={step.unit || ''}
                                                                    placeholder="z.B. kOhm"
                                                                    onChange={(e) => handleUpdateStep(step.id, { unit: e.target.value || undefined })}
                                                                    disabled={isLocked}
                                                                    className="w-full px-2 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                                                />
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number"
                                                                    value={step.points !== undefined ? step.points : ''}
                                                                    placeholder="1"
                                                                    onChange={(e) => handleUpdateStep(step.id, { points: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                                                    disabled={isLocked}
                                                                    className="w-full px-2 py-1 bg-slate-50/50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                                                                />
                                                            </td>
                                                            {!isLocked && (
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        onClick={() => handleDeleteStep(step.id)}
                                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Testing Playground */}
                    {activeTab === 'testing' && (
                        <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 lg:p-6 gap-6 min-h-0">
                            {/* Left Panel: Inputs (45%) */}
                            <div className="w-full lg:w-[45%] flex flex-col shrink-0 bg-white border border-slate-100 shadow-glass rounded-[2rem] h-auto lg:h-full overflow-hidden">
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
                                            className="h-8 text-xs font-bold border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100 rounded-lg px-2.5"
                                        >
                                            Musterlösung
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleRunPlayground(trace)}
                                            className="h-8 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 shadow-md shadow-blue-100"
                                        >
                                            Berechnen
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-grow lg:flex-1 lg:overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    {trace.steps.length === 0 ? (
                                        <p className="text-xs text-slate-400 py-4 font-medium text-center">Keine Schritte deklariert. Erstelle zuerst Schritte im Editor.</p>
                                    ) : (
                                        <div className="space-y-3.5">
                                            {trace.steps.map(s => (
                                                <div key={s.id} className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold text-slate-500 font-mono truncate">{s.id}</label>
                                                        <span className="text-[10px] text-slate-400 font-bold">{s.label}</span>
                                                    </div>
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            value={playgroundInputs[s.id] || ''}
                                                            onChange={(e) => {
                                                                const updated = { ...playgroundInputs, [s.id]: e.target.value };
                                                                setPlaygroundInputs(updated);
                                                            }}
                                                            placeholder={`Erwartet: ${s.value} ${s.unit || ''}`}
                                                            className="w-full text-xs font-semibold font-mono border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-0 focus:outline-hidden transition-all text-slate-800"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Simulation Results (55%) */}
                            <div className="w-full lg:w-[55%] flex flex-col min-h-0 bg-white border border-slate-100 shadow-glass rounded-[2rem] h-auto lg:h-full overflow-hidden shrink-0">
                                {playgroundResult ? (
                                    <div className="flex flex-col h-full overflow-hidden font-inter">
                                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                            <div className="text-left">
                                                <h4 className="text-xs font-black uppercase text-slate-800 font-outfit">Simulations-Ergebnis</h4>
                                                <p className="text-xs text-slate-400 font-medium font-inter">Ketten-Diagnose & Folgefehler</p>
                                            </div>
                                            {isPointsDisabled ? (
                                                <Badge className="bg-blue-50 border-blue-100 text-blue-700 font-black px-3 py-1 text-xs rounded-full">
                                                    Schritte: {playgroundResult.results.filter((r: any) => r.status === 'correct' || r.status === 'consecutive').length} / {playgroundResult.results.length} korrekt
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-blue-50 border-blue-100 text-blue-700 font-black px-3 py-1 text-xs rounded-full">
                                                    Gesamtpunkte: {playgroundResult.totalPoints} / {playgroundResult.maxPoints} P
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex-grow lg:flex-1 lg:overflow-y-auto p-6 space-y-2.5 custom-scrollbar">
                                            {playgroundResult.results.map((r: any) => (
                                                <div 
                                                    key={r.id} 
                                                    className={cn(
                                                        "p-3 rounded-2xl border flex items-center justify-between text-xs transition-all gap-4",
                                                        r.status === 'correct' ? "bg-emerald-50/50 border-emerald-100 text-emerald-800" :
                                                        r.status === 'consecutive' ? "bg-blue-50/50 border-blue-100 text-blue-800" :
                                                        "bg-red-50/50 border-red-100 text-red-800"
                                                    )}
                                                >
                                                    <div className="space-y-0.5 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold truncate">{r.id}</span>
                                                            <Badge className={cn(
                                                                "text-[8px] py-0 px-1.5 rounded font-black uppercase border shrink-0",
                                                                r.status === 'correct' ? "bg-emerald-100 border-emerald-200 text-emerald-700" :
                                                                r.status === 'consecutive' ? "bg-blue-100 border-blue-200 text-blue-700" :
                                                                r.status === 'omission' ? "bg-amber-100 border-amber-200 text-amber-700" :
                                                                "bg-red-100 border-red-200 text-red-700"
                                                            )}>
                                                                {r.status === 'correct' ? 'KORREKT' :
                                                                 r.status === 'consecutive' ? 'FOLGEFEHLER OK' :
                                                                 r.status === 'omission' ? 'FEHLT' :
                                                                 'PRIMÄRFEHLER'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs opacity-80 leading-relaxed font-medium">
                                                            {r.label} {r.unit ? `(${r.unit})` : ''}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right font-medium">
                                                            <p className="text-xs opacity-60">Schüler-Wert</p>
                                                            <p className="font-mono font-bold">{r.studentValue !== null ? String(r.studentValue) : 'Fehlt'}</p>
                                                        </div>
                                                        <div className="text-right font-medium">
                                                            <p className="text-xs opacity-60">Muster-Soll</p>
                                                            <p className="font-mono font-bold">{r.expected}</p>
                                                        </div>
                                                        {!isPointsDisabled && (
                                                            <Badge variant="outline" className="border-transparent font-black px-2.5 py-1 rounded-full text-xs font-inter">
                                                                +{r.pointsAwarded} / {r.pointsMax} P
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-grow lg:flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-4 select-none min-h-[250px] lg:min-h-0">
                                        <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-center text-blue-500 mb-2">
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

                </div>

                {/* Footer */}
                <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                    <p className="text-xs text-slate-400 font-inter text-center sm:text-left leading-normal">
                        * Die Schritt ID wird beim Parsen von Schülerlösungen automatisch gematcht (z. B. &quot;step_1&quot;).
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto justify-stretch sm:justify-end">
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="h-10 flex-1 sm:flex-initial rounded-xl px-5 font-bold text-slate-500 hover:bg-slate-100 text-xs"
                        >
                            {isLocked ? "Schließen" : "Abbrechen"}
                        </Button>
                        {!isLocked && (
                            <Button 
                                onClick={() => { onSave(trace); onClose(); }}
                                className="h-10 flex-1 sm:flex-initial rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-100 transition-all text-xs"
                            >
                                Speichern & Zuweisen
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </div>,
        document.body
    );
};
