import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Target, Info, Sparkles } from 'lucide-react';
import { TargetGoal } from '../../lib/grading/calc-trace-types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

interface CalcTraceModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTrace?: TargetGoal;
    taskName?: string;
    onSave: (goal: TargetGoal) => void;
    isLocked?: boolean;
}

export const CalcTraceModal: React.FC<CalcTraceModalProps> = ({
    isOpen,
    onClose,
    initialTrace,
    taskName = "MINT-Aufgabe",
    onSave,
    isLocked = false
}) => {
    const [mounted, setMounted] = useState(false);
    
    const [goal, setGoal] = useState<TargetGoal>(() => {
        if (initialTrace && 'targetValue' in initialTrace) {
            return initialTrace;
        }
        return { targetValue: 0, maxPoints: 1, unit: '', gradingRubric: '' };
    });

    useEffect(() => { 
        setMounted(true); 
        return () => setMounted(false); 
    }, []);

    useEffect(() => {
        if (initialTrace && 'targetValue' in initialTrace) {
            setGoal(initialTrace);
        }
    }, [initialTrace]);

    if (!mounted || !isOpen) return null;

    const handleSave = () => {
        if (isLocked) return;
        onSave(goal);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-md animate-fade-in font-inter text-foreground">
            <div className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-zoom-in">
                
                <div className="px-6 py-5 border-b border-border bg-muted/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 text-primary shrink-0">
                            <Target size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-foreground font-outfit tracking-tight">
                                MINT Zielwert-Definition
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium">{taskName} – Hybrides Grading</p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground rounded-full"
                    >
                        <X size={20} />
                    </Button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3 text-sm text-primary">
                        <Sparkles className="shrink-0 mt-0.5" size={18} />
                        <p>
                            <strong>Neues Hybrid-Grading:</strong> Gib hier nur das finale numerische Endergebnis der Aufgabe sowie die maximalen Punkte und einen optionalen Erwartungshorizont (Rubric) für die KI an. Koreki extrahiert den Rechenweg des Schülers automatisch und prüft mathematisch exakt.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Zielwert (Zahl)</label>
                            <Input 
                                type="text" 
                                value={Array.isArray(goal.targetValue) ? goal.targetValue.join(',') : goal.targetValue}
                                disabled={isLocked}
                                onChange={e => setGoal(prev => ({ ...prev, targetValue: e.target.value }))}
                                className="font-mono text-lg font-bold"
                            />
                        </div>
                        <div className="w-32 space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Einheit</label>
                            <Input 
                                value={goal.unit || ''}
                                disabled={isLocked}
                                placeholder="z.B. kg"
                                onChange={e => setGoal(prev => ({ ...prev, unit: e.target.value }))}
                            />
                        </div>
                        <div className="w-32 space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Max. Punkte</label>
                            <Input 
                                type="number"
                                min="0"
                                value={goal.maxPoints}
                                disabled={isLocked}
                                onChange={e => setGoal(prev => ({ ...prev, maxPoints: parseFloat(e.target.value) || 0 }))}
                                className="font-bold"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Erwartungshorizont für KI (Rubric)</label>
                            <Info size={14} className="text-muted-foreground" />
                        </div>
                        <Textarea 
                            value={goal.gradingRubric || ''}
                            disabled={isLocked}
                            onChange={e => setGoal(prev => ({ ...prev, gradingRubric: e.target.value }))}
                            placeholder="Beispiel: 1 Punkt für den korrekten Ansatz (Formel U = R * I), 1 Punkt für das richtige Einsetzen der Werte, 1 Punkt für das finale Ergebnis."
                            className="min-h-[120px] text-sm leading-relaxed"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end">
                    <Button onClick={handleSave} disabled={isLocked} className="font-bold">
                        <Check size={16} className="mr-2" /> Speichern
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
