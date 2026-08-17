import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import type { CustomSkillDefinition } from '@/types';
import type { GradingGraph } from '@/lib/grading/types';
import type { TargetGoal } from '@/lib/grading/calc-trace-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import type { SkillGenerationHandles } from '@/hooks/useSkillGeneration';

/**
 * Welche Bewertungs-Engine haengt an diesem Skill?
 * ⚙️
 *
 * Zwei sich ausschliessende Wege: ein Bewertungsgraph (netzwerkartige
 * Aufgaben) oder eine Rechenkette (MINT). Beide koennen von der KI aus dem
 * Aufgabentext erzeugt oder von Hand bearbeitet werden.
 *
 * Herausgezogen aus `SkillEditorPanel`, das damit unter die 300-Zeilen-Grenze
 * faellt. Die Trennung folgt der Sache: hier geht es um das RECHNEN, im Rest
 * des Editors um Name, Kategorie und Anweisungstext.
 */

export interface SkillEngineSectionProps extends SkillGenerationHandles {
    editingSkillData: CustomSkillDefinition;
    setEditingSkillData: React.Dispatch<React.SetStateAction<CustomSkillDefinition | null>>;
    isGeneratingGraph: boolean;
    isGeneratingTrace: boolean;
    setGraphGenTaskText: (text: string) => void;
    handleAIGraphGenerate: () => void;
    handleAICalcTraceGenerate: () => void;
    setIsGraphModalOpen: (offen: boolean) => void;
    setIsCalcTraceModalOpen: (offen: boolean) => void;
    /** Im SaaS kosten KI-Aktionen Credits — nur dort wird ein Preis genannt. */
    showsCreditCost: boolean;
    /** Nur zur Pruefung, ob die Erzeugung ueberhaupt angeboten wird. */
    onGenerateGraph?: (taskText: string, discipline?: string) => Promise<GradingGraph | null>;
    onGenerateCalcTrace?: (taskText: string, userNotes?: string) => Promise<TargetGoal | null>;
}

export const SkillEngineSection: React.FC<SkillEngineSectionProps> = ({
    editingSkillData,
    setEditingSkillData,
    isGeneratingGraph,
    isGeneratingTrace,
    setGraphGenTaskText,
    handleAIGraphGenerate,
    handleAICalcTraceGenerate,
    setIsGraphModalOpen,
    setIsCalcTraceModalOpen,
    showsCreditCost,
    onGenerateGraph,
    onGenerateCalcTrace
}) => {
    return (
        <>
                            <div className="flex items-center gap-2.5 pt-1 pb-1">
                                <input
                                    type="checkbox"
                                    id="is-graph-based"
                                    checked={!!editingSkillData.isGraphBased}
                                    onChange={e => {
                                        const isChecked = e.target.checked;
                                        setEditingSkillData({
                                            ...editingSkillData,
                                            isGraphBased: isChecked,
                                            isCalcTrace: false,
                                            calcTrace: undefined,
                                            category: isChecked ? 'graph-skills' : (editingSkillData.category === 'graph-skills' ? 'math-science' : editingSkillData.category),
                                            gradingGraph: isChecked ? (editingSkillData.gradingGraph || {
                                                taskId: `skill-graph-${Date.now()}`,
                                                discipline: 'computer-science-networking',
                                                variables: [
                                                    { id: 'subnetA_hosts', type: 'input', defaultValue: 50, validationType: 'exact', maxPoints: 1 },
                                                    { id: 'subnetA_netId', type: 'input', defaultValue: '192.168.1.0', validationType: 'exact', maxPoints: 1 },
                                                    { id: 'subnetA_mask', type: 'formula', expression: 'network.calculateMask(subnetA_hosts)', validationType: 'exact', maxPoints: 1 }
                                                ]
                                            }) : undefined
                                        });
                                    }}
                                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                                />
                                <label htmlFor="is-graph-based" className="text-xs font-bold text-foreground cursor-pointer">
                                    Graph-basierter Skill (PANG Engine)
                                </label>
                            </div>

                            <div className="flex items-center gap-2.5 pt-1 pb-1">
                                <input
                                    type="checkbox"
                                    id="is-calc-trace"
                                    checked={!!editingSkillData.isCalcTrace}
                                    onChange={e => {
                                        const isChecked = e.target.checked;
                                        setEditingSkillData({
                                            ...editingSkillData,
                                            isCalcTrace: isChecked,
                                            isGraphBased: false,
                                            gradingGraph: undefined,
                                            category: isChecked ? 'calc-skills' : (editingSkillData.category === 'calc-skills' ? 'math-science' : editingSkillData.category),
                                            calcTrace: isChecked ? (editingSkillData.calcTrace || {
                                                taskId: `skill-trace-${Date.now()}`,
                                                steps: [
                                                    { id: 'P', label: 'Leistung P', type: 'given', value: 2300, unit: 'W' },
                                                    { id: 't', label: 'Zeit t', type: 'given', value: 0.0833, unit: 'h' },
                                                    { id: 'W', label: 'Energie W', type: 'calc', value: 0.1916, formula: 'P * t', unit: 'kWh', points: 1 }
                                                ]
                                            }) : undefined
                                        });
                                    }}
                                    className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                                />
                                <label htmlFor="is-calc-trace" className="text-xs font-bold text-foreground cursor-pointer">
                                    MINT Rechenkette (CalcTrace Engine)
                                </label>
                            </div>

                            {editingSkillData.isGraphBased && (
                                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-primary uppercase tracking-widest">Grading Graph</span>
                                        <div className="flex gap-2">
                                            {onGenerateGraph && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isGeneratingGraph || !editingSkillData.taskText?.trim()}
                                                    onClick={handleAIGraphGenerate}
                                                    className="h-8 text-xs font-bold border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg px-3 gap-1.5 transition-all duration-300"
                                                >
                                                    {isGeneratingGraph ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={13} />
                                                    )}
                                                    {isGeneratingGraph ? 'Generiere...' : `KI-Graph generieren${showsCreditCost ? ' (1 C)' : ''}`}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsGraphModalOpen(true)}
                                                className="h-8 text-xs font-bold border-primary/20 text-primary bg-background hover:bg-primary/5 rounded-lg px-3 transition-all duration-300"
                                            >
                                                Graph bearbeiten ⚙️
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Permanently visible task text input for graph skills */}
                                    <div className="space-y-1.5">
                                        <label className="text-xxs font-bold text-primary uppercase tracking-widest">Aufgabentext für KI-Analyse & PANG-Kompensation</label>
                                        <Textarea
                                            value={editingSkillData.taskText || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditingSkillData({ ...editingSkillData, taskText: val });
                                                setGraphGenTaskText(val);
                                            }}
                                            placeholder="Füge hier den Aufgabentext ein, aus dem die KI Variablen und Formeln extrahieren soll..."
                                            rows={4}
                                            className="w-full p-3 rounded-xl border border-primary/10 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none bg-background"
                                        />
                                    </div>

                                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                        Definieren Sie Variablen, Abhängigkeiten und mathematische Ausdrücke für automatisierte Berechnungen und präzise Folgefehlererkennung.
                                    </p>
                                    {editingSkillData.gradingGraph?.variables && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {editingSkillData.gradingGraph.variables.map(v => (
                                                <Badge key={v.id} variant="outline" className="text-xs font-mono px-2 py-0.5 bg-background border-border text-muted-foreground rounded-md">
                                                    {v.id}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {editingSkillData.isCalcTrace && (
                                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-primary uppercase tracking-widest">MINT Rechenkette (CalcTrace)</span>
                                        <div className="flex gap-2">
                                            {onGenerateCalcTrace && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isGeneratingTrace || !editingSkillData.taskText?.trim()}
                                                    onClick={handleAICalcTraceGenerate}
                                                    className="h-8 text-xs font-bold border-border text-primary bg-primary/5 hover:bg-primary/10 rounded-lg px-3 gap-1.5 transition-all duration-300"
                                                >
                                                    {isGeneratingTrace ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={13} />
                                                    )}
                                                    {isGeneratingTrace ? 'Generiere...' : `KI-Kette generieren${showsCreditCost ? ' (1 C)' : ''}`}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsCalcTraceModalOpen(true)}
                                                className="h-8 text-xs font-bold border-border text-primary bg-background hover:bg-primary/5 rounded-lg px-3 transition-all duration-300"
                                            >
                                                Kette bearbeiten 📐
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xxs font-bold text-primary uppercase tracking-widest">Aufgabentext für KI-Analyse & CalcTrace-Kompensation</label>
                                        <Textarea
                                            value={editingSkillData.taskText || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditingSkillData({ ...editingSkillData, taskText: val });
                                                setGraphGenTaskText(val);
                                            }}
                                            placeholder="Füge hier den Aufgabentext ein, aus dem die KI Rechenschritte extrahieren soll..."
                                            rows={4}
                                            className="w-full p-3 rounded-xl border border-border text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none bg-background resize-none"
                                        />
                                    </div>

                                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                        Definieren Sie Rechenschritte, Formeln, Einheiten und Toleranzen für eine flache Rechenkette mit automatischer Folgefehlererkennung.
                                    </p>
                                    {editingSkillData.calcTrace && 'steps' in editingSkillData.calcTrace && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {editingSkillData.calcTrace.steps.map(s => (
                                                <Badge key={s.id} variant="outline" className="text-xs font-mono px-2 py-0.5 bg-background border-border text-muted-foreground rounded-md">
                                                    {s.id}: {s.label} ({s.type === 'given' ? 'gegeben' : s.formula})
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
        </>
    );
};
