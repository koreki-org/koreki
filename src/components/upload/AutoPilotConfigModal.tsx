import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, ShieldCheck, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { cn } from '@/lib/utils';
import { Task } from '@/types';

interface AutoPilotConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (configs: Record<number, { discipline: 'standard' | 'vlsm'; disablePoints: boolean }>) => void;
    eligibleTaskIndices: number[];
    tasksLayout: Task[];
}

export const AutoPilotConfigModal: React.FC<AutoPilotConfigModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    eligibleTaskIndices,
    tasksLayout
}) => {
    const [mounted, setMounted] = useState(false);
    const [configs, setConfigs] = useState<Record<number, { discipline: 'standard' | 'vlsm'; disablePoints: boolean }>>({});

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            
            // Initialize configurations based on task layout predicted domain or type
            const initialConfigs: Record<number, { discipline: 'standard' | 'vlsm'; disablePoints: boolean }> = {};
            eligibleTaskIndices.forEach(idx => {
                const task = tasksLayout[idx];
                const predictedDomain = task.predictedPluginDomain || task.taskType || 'default';
                const isVlsm = predictedDomain === 'computer-science-networking' || predictedDomain === 'vlsm' || predictedDomain === 'skill-calc-vlsm';
                initialConfigs[idx] = {
                    discipline: isVlsm ? 'vlsm' : 'standard',
                    disablePoints: isVlsm ? false : true
                };
            });
            setConfigs(initialConfigs);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, eligibleTaskIndices, tasksLayout]);

    if (!isOpen || !mounted) return null;

    const handleDisciplineChange = (idx: number, newDiscipline: 'standard' | 'vlsm') => {
        setConfigs(prev => ({
            ...prev,
            [idx]: {
                discipline: newDiscipline,
                // STANDARD discipline defaults to disablePoints = true (Hybrid evaluation)
                // VLSM discipline defaults to disablePoints = false (Strict evaluation)
                disablePoints: newDiscipline === 'standard' ? true : false
            }
        }));
    };

    const handleToggleDisablePoints = (idx: number, val: boolean) => {
        setConfigs(prev => ({
            ...prev,
            [idx]: {
                ...prev[idx],
                disablePoints: val
            }
        }));
    };

    const handleConfirm = () => {
        onConfirm(configs);
        onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-glass animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[650px] max-h-[85dvh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 shadow-glass border border-slate-100 flex flex-col animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors h-auto focus:outline-none"
                >
                    <X size={18} />
                </Button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-100 shrink-0">
                        <Sparkles size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <h2 className="font-outfit text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                            PANG Auto-Pilot konfigurieren
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            Plugin und Korrektur-Modus für jede mathematische Aufgabe zuweisen.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow space-y-4 max-h-[45dvh] overflow-y-auto pr-2 custom-scrollbar my-2">
                    {eligibleTaskIndices.map(idx => {
                        const task = tasksLayout[idx];
                        const taskConfig = configs[idx];
                        if (!task || !taskConfig) return null;

                        return (
                            <div 
                                key={`config-task-${idx}`}
                                className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/60 rounded-xl transition-all duration-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 flex-grow">
                                    <h4 className="font-bold text-xs text-slate-800 truncate mb-1">
                                        {task.name || `Aufgabe ${idx + 1}`}
                                    </h4>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                                            Max: {task.maxPoints || 0} P
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 shrink-0">
                                    {/* Discipline Selection */}
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                            Fachtyp / Plugin
                                        </span>
                                        <select
                                            value={taskConfig.discipline}
                                            onChange={(e) => handleDisciplineChange(idx, e.target.value as 'standard' | 'vlsm')}
                                            className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none transition-all cursor-pointer font-inter"
                                        >
                                            <option value="standard">📐 MINT-Standard</option>
                                            <option value="vlsm">🌐 Netzwerk (VLSM)</option>
                                        </select>
                                    </div>

                                    {/* Hybrid Switch */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                            Korrekturmodus
                                        </span>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <Checkbox
                                                checked={taskConfig.disablePoints}
                                                onChange={(e) => handleToggleDisablePoints(idx, e.target.checked)}
                                                id={`hybrid-checkbox-${idx}`}
                                            />
                                            <span 
                                                className={cn(
                                                    "text-xs font-bold transition-colors flex items-center gap-1",
                                                    taskConfig.disablePoints ? "text-indigo-600" : "text-emerald-600"
                                                )}
                                                title={taskConfig.disablePoints 
                                                    ? "Hybrid: didaktisch tolerant durch das LLM" 
                                                    : "Streng: absolute Punkteberechnung durch PANG"
                                                }
                                            >
                                                {taskConfig.disablePoints ? (
                                                    <>
                                                        <Cpu size={12} />
                                                        <span>Hybrid</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck size={12} />
                                                        <span>Streng</span>
                                                    </>
                                                )}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        className="rounded-xl h-10 px-4 font-bold text-xs tracking-wide uppercase hover:bg-slate-100 transition-all border border-slate-200/50"
                    >
                        Abbrechen
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="rounded-xl h-10 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs tracking-wide uppercase shadow-lg shadow-indigo-100 hover:shadow-xl transition-all"
                    >
                        Auto-Pilot starten
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
