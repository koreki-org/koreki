import React from 'react';
import { Sparkles, Send, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { GradingGraph } from '@/lib/grading/types';
import type { ExpectedValues } from '@/lib/grading/graph-preview';

export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    hasError?: boolean;
}

/**
 * KI-Reiter des Bewertungsgraphen.
 *
 * Erzeugen und Verfeinern im Dialog. Die Regeln dahinter — Deutung der
 * Antwort und Schutz der Punktvergabe — liegen in lib/grading/graph-intake.ts;
 * dieser Reiter fuehrt den Dialog und zeigt das Ergebnis.
 */
interface GraphAiPanelProps {
    graph: GradingGraph;
    /** Aufgabentext, dient der KI als Grundlage. */
    taskContent?: string;
    /** Aktuell hervorgehobene Variable — faerbt den zugehoerigen Knoten ein. */
    hoveredVarId: string | null;
    /** Erwartungshorizont, wird je Knoten als errechneter Wert angezeigt. */
    evaluatedContext: ExpectedValues;
    setGraph: React.Dispatch<React.SetStateAction<GradingGraph>>;
    isLocked: boolean;
    isGenerating?: boolean;
    isRefining: boolean;
    isPointsDisabled: boolean;
    showsCreditCost: boolean;
    selectedPlugin: string;
    setSelectedPlugin: (plugin: string) => void;
    initialUserNotes: string;
    setInitialUserNotes: (notes: string) => void;
    chatInput: string;
    setChatInput: (value: string) => void;
    chatHistory: ChatMessage[];
    setHoveredVarId: (id: string | null) => void;
    onRefineGraph: () => void;
    onRegenerateGraph?: (discipline: string, userNotes?: string) => Promise<any>;
}

export const GraphAiPanel: React.FC<GraphAiPanelProps> = ({
    graph,
    taskContent,
    hoveredVarId,
    evaluatedContext,
    setGraph,
    isLocked,
    isGenerating,
    isRefining,
    isPointsDisabled,
    showsCreditCost,
    selectedPlugin,
    setSelectedPlugin,
    initialUserNotes,
    setInitialUserNotes,
    chatInput,
    setChatInput,
    chatHistory,
    setHoveredVarId,
    onRefineGraph,
    onRegenerateGraph
}) => (
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
                                            <Textarea
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
                                                    {!isGenerating && showsCreditCost && (
                                                        <span className="bg-white/20 rounded px-1 text-xs font-black leading-none py-0.5">1 C</span>
                                                    )}
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
                                                        Gib unten eine Anweisung ein, z.B. <em>&quot;Setze die Toleranz von subnetA_mask auf 0.1&quot;</em>.
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
                                                <div className="flex flex-col items-start max-w-[85%] animate-in fade-in duration-300 gap-1">
                                                    <span className="text-[10px] text-slate-400 font-bold font-outfit px-1">
                                                        Koreki passt Graph an...
                                                    </span>
                                                    <div className="bg-white border border-slate-200/60 dark:bg-slate-900/60 dark:border-slate-800/50 rounded-2xl rounded-tl-none py-2.5 px-3.5 flex items-center gap-1.5 shadow-3xs">
                                                        <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full chatgpt-dot" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full chatgpt-dot" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full chatgpt-dot" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Chat Input Bar */}
                                        <div className="flex flex-col gap-1.5 shrink-0 pt-2 border-t border-slate-100">
                                            <div className="flex items-end gap-2">
                                                <Textarea
                                                    value={chatInput}
                                                    disabled={isRefining || isLocked}
                                                    onChange={(e) => setChatInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            if (chatInput.trim() && !isLocked) {
                                                                onRefineGraph();
                                                            }
                                                        }
                                                    }}
                                                    rows={1}
                                                    placeholder={isLocked ? "Graph ist schreibgeschützt..." : "z.B. Erhöhe Toleranzen..."}
                                                    className="flex-grow min-h-[38px] max-h-[120px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 bg-white placeholder-slate-400 disabled:opacity-60 transition-all duration-200 resize-none custom-scrollbar leading-relaxed"
                                                />
                                                <button
                                                    onClick={onRefineGraph}
                                                    disabled={isRefining || !chatInput.trim() || isLocked}
                                                    className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center transition-all duration-200 shadow-sm shrink-0 mb-0.5"
                                                >
                                                    <Send size={13} className="relative -left-0.5" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium px-1">
                                                {showsCreditCost
                                                    ? '* Jede Änderungsanweisung kostet 1 Credit'
                                                    : '* Offline/Community/Pure Modus (0 Credits)'}
                                            </p>
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
);
