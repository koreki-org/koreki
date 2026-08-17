import React from 'react';
import { Sparkles, Loader2, Trash2, X } from 'lucide-react';
import type { CustomSkillDefinition } from '@/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { GradingGraphModal } from '../batch/GradingGraphModal';
import { CalcTraceModal } from '../batch/CalcTraceModal';
import { cn } from '@/lib/utils';
import type { SkillGenerationHandles } from '@/hooks/useSkillGeneration';
import { SkillEngineSection } from './SkillEngineSection';

/**
 * Der Editor fuer einen eigenen Skill.
 * ✏️
 *
 * Stand als 290-Zeilen-Block in `SkillsModules`, hinter
 * `{isEditingSkill && editingSkillData && (...)}`. Die Liste der Skills und
 * ihr Editor sind zwei getrennte Ansichten — sie teilen nur den gerade
 * bearbeiteten Skill.
 */

export interface SkillEditorPanelProps extends SkillGenerationHandles {
    editingSkillData: CustomSkillDefinition;
    setEditingSkillData: React.Dispatch<React.SetStateAction<CustomSkillDefinition | null>>;
    onSave: () => void;
    onClose: () => void;

    // KI-Erzeugung

    // Unterdialoge
    isGraphModalOpen: boolean;
    setIsGraphModalOpen: (offen: boolean) => void;
    /** Im SaaS kosten KI-Aktionen Credits — nur dort wird ein Preis genannt. */
    showsCreditCost: boolean;
    /** `UNSET` hat der Aufrufer bereits nach `undefined` uebersetzt. */
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    isCalcTraceModalOpen: boolean;
    setIsCalcTraceModalOpen: (offen: boolean) => void;
}

export const SkillEditorPanel: React.FC<SkillEditorPanelProps> = ({
    editingSkillData,
    setEditingSkillData,
    onSave,
    onClose,
    isGeneratingGraph,
    isGeneratingTrace,
    setGraphGenTaskText,
    handleAIGraphGenerate,
    handleAICalcTraceGenerate,
    onGenerateGraph,
    onGenerateCalcTrace,
    isGraphModalOpen,
    setIsGraphModalOpen,
    showsCreditCost,
    appMode,
    isCalcTraceModalOpen,
    setIsCalcTraceModalOpen
}) => {
    return (
        <>
                <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4">
                    <div className="bg-background w-full max-w-xl rounded-hero shadow-2xl border border-border p-6 sm:p-8 space-y-6 flex flex-col max-h-[90vh] overflow-hidden animate-fade-in text-foreground">
                        <div className="flex justify-between items-center pb-2 border-b border-border">
                            <h3 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                                <Sparkles className="text-primary animate-pulse" size={20} />
                                {editingSkillData.id ? 'Eigenen Skill bearbeiten' : 'Eigenen Skill erstellen'}
                            </h3>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
                            <div className="space-y-1.5">
                                <label className="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Name des Skills</label>
                                <Input 
                                    value={editingSkillData.name}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, name: e.target.value })}
                                    placeholder="z.B. Folgefehler-Kompensation Physik"
                                    className="h-11 rounded-xl border-border focus:ring-primary focus:border-primary"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Kategorie</label>
                                <select
                                    value={editingSkillData.category}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, category: e.target.value })}
                                    className="w-full h-11 px-3 rounded-xl border border-border text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-background cursor-pointer"
                                >
                                    <option value="math-science">MINT-Fächer</option>
                                    <option value="graph-skills">Graph-basierte Skills (PANG)</option>
                                    <option value="calc-skills">Rechenketten-Skills (CalcTrace)</option>
                                    <option value="languages">Sprachen & Textästhetik</option>
                                    <option value="standards">Korrekturzeichen & Bundesländer</option>
                                    <option value="feedback">Pädagogisches Feedback</option>
                                </select>
                            </div>

                            <SkillEngineSection
                                editingSkillData={editingSkillData}
                                setEditingSkillData={setEditingSkillData}
                                isGeneratingGraph={isGeneratingGraph}
                                isGeneratingTrace={isGeneratingTrace}
                                setGraphGenTaskText={setGraphGenTaskText}
                                handleAIGraphGenerate={handleAIGraphGenerate}
                                handleAICalcTraceGenerate={handleAICalcTraceGenerate}
                                setIsGraphModalOpen={setIsGraphModalOpen}
                                setIsCalcTraceModalOpen={setIsCalcTraceModalOpen}
                                showsCreditCost={showsCreditCost}
                                onGenerateGraph={onGenerateGraph}
                                onGenerateCalcTrace={onGenerateCalcTrace}
                            />

                            <div className="space-y-1.5">
                                <label className="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Kurzbeschreibung</label>
                                <Textarea 
                                    value={editingSkillData.description}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, description: e.target.value })}
                                    placeholder="Beschreibe kurz, worauf die KI achten soll und in welchem Fach."
                                    rows={2}
                                    className="w-full p-3 rounded-xl border border-border text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xxs font-bold text-muted-foreground uppercase tracking-widest">KI-Anweisung (Prompt Snippet)</label>
                                <Textarea 
                                    value={editingSkillData.promptSnippet}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, promptSnippet: e.target.value })}
                                    placeholder="Gib hier die genaue systemische Korrektur-Anweisung für das LLM an. Beispiel:&#10;FOLGEFEHLER BEI BERECHNUNGEN:&#10;- Wenn der Schüler ein falsches Zwischenergebnis verwendet, aber die darauffolgenden Rechenschritte mathematisch korrekt ausführt, ziehe nur einmalig für den ersten Fehler Punkte ab."
                                    rows={6}
                                    className="w-full p-3 rounded-xl border border-border text-xs font-mono text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-muted/30"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-border shrink-0">
                            <Button 
                                variant="ghost" 
                                onClick={() => { onClose(); setEditingSkillData(null); }}
                                className="h-10 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
                            >
                                Abbrechen
                            </Button>
                            <Button 
                                onClick={onSave}
                                className="h-10 rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md transition-all"
                            >
                                Speichern
                            </Button>
                        </div>
                    </div>
                </div>

            {isGraphModalOpen && (
                <GradingGraphModal
                    isOpen={isGraphModalOpen}
                    onClose={() => setIsGraphModalOpen(false)}
                    initialGraph={editingSkillData?.gradingGraph}
                    taskName={editingSkillData?.name || "Benutzerdefinierter Skill"}
                    taskContent={editingSkillData?.taskText || editingSkillData?.description || editingSkillData?.name || ""}
                    appMode={appMode}
                    onSave={(updatedGraph) => {
                        setEditingSkillData({
                            ...editingSkillData,
                            gradingGraph: updatedGraph
                        });
                    }}
                />
            )}
            {isCalcTraceModalOpen && (
                <CalcTraceModal
                    isOpen={isCalcTraceModalOpen}
                    onClose={() => setIsCalcTraceModalOpen(false)}
                    initialTrace={editingSkillData?.calcTrace}
                    taskName={editingSkillData?.name || "Benutzerdefinierter Skill"}
                    onSave={(updatedTrace) => {
                        setEditingSkillData({
                            ...editingSkillData,
                            calcTrace: updatedTrace
                        });
                    }}
                />
            )}
        </>
    );
};
