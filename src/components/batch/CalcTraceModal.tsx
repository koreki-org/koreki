import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Target, Info, Sparkles, Plus, Trash2 } from 'lucide-react';
import { TargetGoal } from '../../lib/grading/calc-trace-types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

interface RowData {
    value: string;
    unit: string;
}

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

    const [rows, setRows] = useState<RowData[]>(() => {
        let valStr = '';
        if (typeof goal.targetValue === 'string') {
            valStr = goal.targetValue;
        } else if (Array.isArray(goal.targetValue)) {
            valStr = goal.targetValue.join(', ');
        } else {
            valStr = String(goal.targetValue);
        }
        
        const vals = valStr.split(',').map(s => s.trim()).filter(s => s !== '');
        const units = (goal.unit || '').split(',').map(s => s.trim());
        
        if (vals.length === 0) return [{ value: '', unit: '' }];
        
        return vals.map((v, i) => ({
            value: v,
            unit: units[i] || ''
        }));
    });

    useEffect(() => { 
        setMounted(true); 
        return () => setMounted(false); 
    }, []);

    useEffect(() => {
        if (initialTrace && 'targetValue' in initialTrace) {
            setGoal(initialTrace);
            
            let valStr = '';
            if (typeof initialTrace.targetValue === 'string') {
                valStr = initialTrace.targetValue;
            } else if (Array.isArray(initialTrace.targetValue)) {
                valStr = initialTrace.targetValue.join(', ');
            } else {
                valStr = String(initialTrace.targetValue);
            }
            
            const vals = valStr.split(',').map(s => s.trim()).filter(s => s !== '');
            const units = (initialTrace.unit || '').split(',').map(s => s.trim());
            
            if (vals.length > 0) {
                setRows(vals.map((v, i) => ({
                    value: v,
                    unit: units[i] || ''
                })));
            }
        }
    }, [initialTrace]);

    if (!mounted || !isOpen) return null;

    const handleAddRow = () => {
        if (isLocked) return;
        setRows([...rows, { value: '', unit: '' }]);
    };

    const handleRemoveRow = (index: number) => {
        if (isLocked || rows.length <= 1) return;
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleRowChange = (index: number, field: keyof RowData, value: string) => {
        if (isLocked) return;
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const handleSave = () => {
        if (isLocked) return;
        
        const validRows = rows.filter(r => r.value.trim() !== '');
        const targetValue = validRows.map(r => r.value.trim()).join(', ');
        const unit = validRows.map(r => r.unit.trim()).join(', ');
        
        onSave({
            ...goal,
            targetValue,
            unit
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-md animate-fade-in font-inter text-foreground">
            <div className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
                
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

                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3 text-sm text-primary">
                        <Sparkles className="shrink-0 mt-0.5" size={18} />
                        <p>
                            <strong>Neues Hybrid-Grading:</strong> Gib hier nur das finale numerische Endergebnis der Aufgabe sowie die maximalen Punkte und einen optionalen Erwartungshorizont (Rubric) für die KI an. Koreki extrahiert den Rechenweg des Schülers automatisch und prüft mathematisch exakt.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Zielwerte & Meilensteine</label>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleAddRow} 
                                disabled={isLocked}
                                className="h-7 text-xs font-medium"
                            >
                                <Plus size={14} className="mr-1" /> Zeile hinzufügen
                            </Button>
                        </div>
                        
                        <div className="space-y-3">
                            {rows.map((row, idx) => {
                                const isLast = idx === rows.length - 1;
                                const label = rows.length === 1 
                                    ? "Endziel" 
                                    : (isLast ? "Endziel" : `Meilenstein ${idx + 1}`);
                                
                                return (
                                    <div key={idx} className="flex gap-4 items-end animate-fade-in">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground/70">{label}</label>
                                            <Input 
                                                type="text" 
                                                value={row.value}
                                                disabled={isLocked}
                                                onChange={e => handleRowChange(idx, 'value', e.target.value)}
                                                placeholder={isLast ? "Zahl (z.B. 1.846)" : "Zahl (z.B. 6.5)"}
                                                className={`font-mono text-lg font-bold ${isLast ? 'border-primary/50 bg-primary/5' : ''}`}
                                            />
                                        </div>
                                        <div className="w-32 space-y-2">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground/70">Einheit</label>
                                            <Input 
                                                value={row.unit}
                                                disabled={isLocked}
                                                placeholder={isLast ? "z.B. mA" : "z.B. kOhm"}
                                                onChange={e => handleRowChange(idx, 'unit', e.target.value)}
                                            />
                                        </div>
                                        {rows.length > 1 && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleRemoveRow(idx)}
                                                disabled={isLocked}
                                                className="mb-[1px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="w-48 mt-2 space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Max. Punkte (Gesamt)</label>
                            <Input 
                                type="number"
                                min="0"
                                value={goal.maxPoints}
                                disabled={isLocked}
                                onChange={e => setGoal(prev => ({ ...prev, maxPoints: parseFloat(e.target.value) || 0 }))}
                                className="font-bold text-lg text-primary"
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
