import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText, FileUp, RefreshCw, Sparkles, Loader2, Layers, Trash2, Link2Off, HelpCircle, AlertCircle, ShieldCheck, ShieldAlert, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { Task, AppSettings } from '@/types';
import { promisePool } from '../../lib/ai/promise-pool';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { PointInput } from '@/components/ui/PointInput';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { cn } from '@/lib/utils';
import { groupTasksByMain, splitTextByTasks, joinTaskSections } from '@/lib/task-utils';
import { GradingGraphModal } from '../batch/GradingGraphModal';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_SKILL_PROFILES } from '@/lib/ai/standard-skills-profiles';
import { AutoPilotConfigModal } from './AutoPilotConfigModal';



interface ModelSolutionCardProps {
    modelSolution: string;
    tasksLayout: Task[];
    extractingLayout: boolean;
    onModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onModelSolutionChange?: (newVal: string) => void;
    onTasksChange?: (newTasks: Task[] | ((prevTasks: Task[]) => Task[])) => void;
    isLocked?: boolean;
    settings?: AppSettings;
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    onGenerateGraph?: (taskIndex: number, taskText: string, userNotes?: string, disciplineOverride?: string) => Promise<any>;
}

export const ModelSolutionCard: React.FC<ModelSolutionCardProps> = ({
    modelSolution,
    tasksLayout,
    extractingLayout,
    onModelUpload,
    onModelSolutionChange,
    onTasksChange,
    isLocked = false,
    settings,
    appMode,
    onGenerateGraph
}) => {
    const [activeGroupName, setActiveGroupName] = useState<string>("");
    const [generatingGraphForTask, setGeneratingGraphForTask] = useState<number | null>(null);
    const [editingGraphTaskIdx, setEditingGraphTaskIdx] = useState<number | null>(null);
    const [showAutoPilotConfig, setShowAutoPilotConfig] = useState<boolean>(false);

    const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
    const [batchStatus, setBatchStatus] = useState<Record<number, 'waiting' | 'generating' | 'success' | 'error'>>({});


    const tasksLayoutRef = React.useRef(tasksLayout);
    useEffect(() => {
        tasksLayoutRef.current = tasksLayout;
    }, [tasksLayout]);


    const getBaseEngine = useCallback((task: Task) => {
        const type = task.taskType || 'default';
        if (type === 'vlsm' || type === 'skill-calc-vlsm') return 'skill-calc-vlsm';
        
        if (type.startsWith('custom-skill-')) {
            const discipline = task.gradingGraph?.discipline;
            if (discipline === 'computer-science-networking') return 'skill-calc-vlsm';
            
            const skill = settings?.customSkills?.[type];
            const skillDiscipline = skill?.gradingGraph?.discipline;
            if (skillDiscipline === 'computer-science-networking') return 'skill-calc-vlsm';
        }
        return 'default';
    }, [settings?.customSkills]);

    const getDefaultGradingGraph = useCallback((skillId: string, originalIdx: number, taskContent?: string) => {
        const timestamp = Date.now();
        if (skillId && skillId.startsWith('custom-skill-')) {
            return settings?.customSkills?.[skillId]?.gradingGraph;
        }
        if (skillId === 'skill-calc-vlsm' || skillId === 'vlsm') {
            return {
                taskId: `vlsm-task-${originalIdx}-${timestamp}`,
                discipline: 'computer-science-networking',
                variables: [
                    { id: 'subnetA_hosts', type: 'input', defaultValue: 50, validationType: 'exact', maxPoints: 0 },
                    { id: 'subnetA_netId', type: 'input', defaultValue: '192.168.1.0', validationType: 'exact', maxPoints: 0 },
                    { id: 'subnetA_mask', type: 'formula', expression: 'network.calculateMask(subnetA_hosts)', validationType: 'exact', maxPoints: 1 }
                ]
            };
        }

        return undefined;
    }, [settings?.customSkills]);
    const modelInputRef = React.useRef<HTMLInputElement>(null);

    const hasModel = modelSolution || extractingLayout;
    const hasTaskStructure = tasksLayout.length > 0 && hasModel && !extractingLayout;

    const taskSections = useMemo(() => {
        if (!hasTaskStructure) return [];
        
        // --- INDUSTRIAL GUARDRAIL: Prioritize partitioned content from AI ---
        const hasPartitionedContent = tasksLayout.some(t => t.content && t.content.trim().length > 0);
        if (hasPartitionedContent) {
            return tasksLayout.map(t => t.content || "");
        }

        // Fallback to regex splitting only if tasks have no content
        return splitTextByTasks(modelSolution, tasksLayout);
    }, [modelSolution, tasksLayout, hasTaskStructure]);

    const taskSectionsRef = React.useRef(taskSections);
    useEffect(() => {
        taskSectionsRef.current = taskSections;
    }, [taskSections]);

    const eligibleTaskIndices = useMemo(() => {
        return tasksLayout
            .map((t, idx) => ({ t, idx }))
            .filter(({ t }) => t.suggestGraph && !t.gradingGraph)
            .map(({ idx }) => idx);
    }, [tasksLayout]);

    const allSuggestedGraphsVerified = useMemo(() => {
        const suggestedTasks = tasksLayout.filter(t => t.suggestGraph);
        if (suggestedTasks.length === 0) return false;
        return suggestedTasks.every(t => t.gradingGraph && (t.gradingGraph.validation?.isValid ?? true));
    }, [tasksLayout]);

    const persistGraphAsSkill = useCallback(async (name: string, graph: any, taskIdx: number) => {
        const cleanNameForId = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // 1. Save to localStorage under 'koreki_custom_skills' (and check for existing)
        const stored = localStorage.getItem('koreki_custom_skills');
        let customSkills: Record<string, any> = {};
        if (stored) {
            try { customSkills = JSON.parse(stored); } catch (e) {}
        }

        // Check if a skill with this exact name already exists (case-insensitive & trimmed)
        const cleanName = name.trim().toLowerCase();
        const existingSkillId = Object.keys(customSkills).find(
            key => customSkills[key] && customSkills[key].name && customSkills[key].name.trim().toLowerCase() === cleanName
        );

        // --- DUPLICATE PREVENTION: Reuse existing custom skill ID if this task already has one, 
        // or if an auto-generated skill for this task name exists, preventing multiple skill cards for the same task.
        const currentTask = tasksLayoutRef.current[taskIdx];
        const hasExistingCustomSkill = currentTask?.taskType?.startsWith('custom-skill-');
        
        let resolvedId = hasExistingCustomSkill ? currentTask.taskType : existingSkillId;
        
        if (!resolvedId) {
            const cleanTaskName = (currentTask?.name || `Aufgabe-${taskIdx + 1}`)
                .replace(/[^a-zA-Z0-9_-]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .toLowerCase();
            const prefix = `auto_${cleanTaskName}`;
            
            const existingAutoSkillId = Object.keys(customSkills).find(key => {
                const skill = customSkills[key];
                if (!skill || !skill.name) return false;
                const sName = skill.name.toLowerCase();
                return sName === prefix || sName.startsWith(prefix + '_');
            });
            
            if (existingAutoSkillId) {
                resolvedId = existingAutoSkillId;
            }
        }

        const id = resolvedId || `custom-skill-${cleanNameForId}-${Date.now().toString().slice(-4)}`;
        
        const newSkill = {
            id,
            name,
            category: 'graph-skills',
            description: `Automatisch generierter Graph für ${name}.`,
            promptSnippet: `KORREKTUR-DIREKTIVE FÜR GRAPH-BASIERTE BEWERTUNG:\nNutze den definierten Grading Graph zur mathematischen Prüfung und Folgefehler-Kompensation.`,
            isCustom: true,
            isGraphBased: true,
            gradingGraph: graph
        };

        customSkills[id] = newSkill;
        try {
            localStorage.setItem('koreki_custom_skills', JSON.stringify(customSkills));
        } catch (e) {
            console.error('Failed to write to localStorage (Incognito quota?):', e);
        }

        // 2. Sync with useDashboardStore settings
        const store = useDashboardStore.getState();
        if (store.aiSettings) {
            const updatedSettings = {
                ...store.aiSettings,
                customSkills: {
                    ...store.aiSettings.customSkills,
                    [id]: newSkill
                },
                activeSkillIds: Array.from(new Set([...(store.aiSettings.activeSkillIds || []), id]))
            };
            store.setAiSettings(updatedSettings);
        }

        // 3. Update the task type to point to this new custom skill!
        onTasksChange?.(prevTasks => {
            const updated = [...prevTasks];
            if (updated[taskIdx]) {
                updated[taskIdx] = {
                    ...updated[taskIdx],
                    taskType: id,
                    gradingGraph: graph
                };
            }
            return updated;
        });

        // 4. Symmetrical Profile Synchronization (SaaS / Desktop Parity):
        const activeProfileId = settings?.activeSkillProfileId || localStorage.getItem('koreki_active_skill_profile_id') || 'system-mint-standard';

        if (isDesktopTarget()) {
            // --- DESKTOP APP (TAURI / OFFLINE) PERSISTENCE ---
            const localProfilesStored = localStorage.getItem('koreki_local_skill_profiles');
            let localProfiles: any[] = [];
            if (localProfilesStored) {
                try { localProfiles = JSON.parse(localProfilesStored); } catch (e) {}
            }

            const activeLocalProfile = localProfiles.find(p => p.id === activeProfileId);
            if (activeLocalProfile && !activeLocalProfile.isSystem) {
                const activeSkillIds = Array.isArray(activeLocalProfile.activeSkillIds) ? activeLocalProfile.activeSkillIds : [];
                if (!activeSkillIds.includes(id)) {
                    activeLocalProfile.activeSkillIds = [...activeSkillIds, id];
                }
                activeLocalProfile.customSkills = {
                    ...(activeLocalProfile.customSkills || {}),
                    [id]: newSkill
                };
                localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(localProfiles));
            } else {
                const matchingSystem = STANDARD_SKILL_PROFILES.find(p => p.name === activeProfileId || p.isSystem);
                const baseSkillIds = matchingSystem ? [...matchingSystem.activeSkillIds] : ["skill-consecutive-errors", "skill-math-equivalence"];
                
                const newProfileId = `local-skill-${Date.now()}`;
                const newProfileName = `Mein Skill-Profil`;
                
                localProfiles.push({
                    id: newProfileId,
                    name: newProfileName,
                    activeSkillIds: [...baseSkillIds, id],
                    customSkills: { [id]: newSkill },
                    isSystem: false
                });

                localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(localProfiles));
                localStorage.setItem('koreki_active_skill_profile_id', newProfileId);
                
                if (store.aiSettings) {
                    store.setAiSettings({
                        ...store.aiSettings,
                        activeSkillProfileId: newProfileId
                    });
                }
            }
        } else {
            // --- SAAS / COMMUNITY (ONLINE DATABASE) PERSISTENCE ---
            try {
                const res = await apiClient.get('/api/user/skill-profiles');
                if (res.ok) {
                    const profilesList = await res.json();
                    const activeProfile = profilesList.find((p: any) => p.id === activeProfileId);

                    if (activeProfile && !activeProfile.isSystem) {
                        const activeSkillIds = Array.isArray(activeProfile.activeSkillIds) ? activeProfile.activeSkillIds : [];
                        const updatedSkills = activeSkillIds.includes(id) ? activeSkillIds : [...activeSkillIds, id];
                        
                        await apiClient.post('/api/user/skill-profiles', {
                            name: activeProfile.name,
                            activeSkillIds: updatedSkills,
                            customSkills: {
                                ...(activeProfile.customSkills || {}),
                                [id]: newSkill
                            }
                        });
                    } else {
                        const baseSkillIds = activeProfile ? [...activeProfile.activeSkillIds] : ["skill-consecutive-errors", "skill-math-equivalence"];
                        const newProfileName = `Mein Skill-Profil`;
                        
                        const createRes = await apiClient.post('/api/user/skill-profiles', {
                            name: newProfileName,
                            activeSkillIds: [...baseSkillIds, id],
                            customSkills: { [id]: newSkill }
                        });
                        
                        if (createRes.ok) {
                            const newProfile = await createRes.json();
                            await apiClient.post('/api/user/update-skill-profile', {
                                profileId: newProfile.id
                            });

                            if (store.aiSettings) {
                                store.setAiSettings({
                                    ...store.aiSettings,
                                    activeSkillProfileId: newProfile.id
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Fehler beim Synchronisieren des neuen Skills mit dem Skill-Profil in der DB:", err);
            }
        }
        return id;
    }, [onTasksChange, settings]);

    const handleStartAutoPilot = useCallback(async (configs: Record<number, { discipline: 'standard' | 'vlsm'; disablePoints: boolean }>) => {
        if (eligibleTaskIndices.length === 0 || isBatchGenerating) return;
        
        setIsBatchGenerating(true);
        
        const initialStatus: Record<number, 'waiting' | 'generating' | 'success' | 'error'> = {};
        eligibleTaskIndices.forEach(idx => {
            initialStatus[idx] = 'waiting';
        });
        setBatchStatus(initialStatus);

        try {
            await promisePool(eligibleTaskIndices, 1, async (idx) => {
                try {
                    setBatchStatus(prev => ({ ...prev, [idx]: 'generating' }));
                    
                    const currentTasks = tasksLayoutRef.current;
                    const currentSections = taskSectionsRef.current;
                    
                    const task = currentTasks[idx];
                    const content = currentSections[idx] || "";
                    
                    if (!content || content.trim().length <= 10) {
                        setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                        return;
                    }

                    const config = configs[idx] || { discipline: 'standard', disablePoints: true };
                    
                    if (onGenerateGraph) {
                        const mappedDiscipline = config.discipline === 'vlsm' ? 'skill-calc-vlsm' : 'default';
                        
                        onTasksChange?.(prevTasks => {
                            const updated = [...prevTasks];
                            if (updated[idx]) {
                                updated[idx] = {
                                    ...updated[idx],
                                    taskType: mappedDiscipline
                                };
                            }
                            return updated;
                        });
                        
                        const note = `SPEZIFIKATION: Bitte erstelle einen Graphen für ein ${config.discipline === 'vlsm' ? 'Netzwerk-Plugin (VLSM)' : 'Mathematik-Plugin (Standard-Rechner)'}-Plugin. Die Bewertung soll ${config.disablePoints ? 'HYBRID (disablePoints = true)' : 'STRENG (disablePoints = false)'} sein.`;
                        
                        const generatedGraph = await onGenerateGraph(idx, content, note, mappedDiscipline);
                        if (generatedGraph) {
                            generatedGraph.disablePoints = config.disablePoints;

                            const now = new Date();
                            const yyyy = now.getFullYear();
                            const mm = String(now.getMonth() + 1).padStart(2, '0');
                            const dd = String(now.getDate()).padStart(2, '0');
                            const hh = String(now.getHours()).padStart(2, '0');
                            const min = String(now.getMinutes()).padStart(2, '0');
                            
                            const cleanTaskName = (task.name || `Aufgabe-${idx + 1}`)
                                .replace(/[^a-zA-Z0-9_-]+/g, '-')
                                .replace(/^-+|-+$/g, '');
                            
                            const skillName = `Auto_${cleanTaskName}_${yyyy}-${mm}-${dd}_${hh}${min}`;
                            
                            await persistGraphAsSkill(skillName, generatedGraph, idx);
                            setBatchStatus(prev => ({ ...prev, [idx]: 'success' }));
                        } else {
                            setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                        }
                    } else {
                        setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                    }
                } catch (taskErr) {
                    console.error(`Fehler bei der automatischen Generierung für Aufgabe Index ${idx}:`, taskErr);
                    setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                }
            });
        } catch (err) {
            console.error("Fehler im Auto-Pilot Batch-Prozess:", err);
        } finally {
            setIsBatchGenerating(false);
        }
    }, [eligibleTaskIndices, onGenerateGraph, persistGraphAsSkill, isBatchGenerating]);



    const groupedTasks = useMemo(() => {
        const groups = groupTasksByMain(tasksLayout);
        const groupNames = Object.keys(groups);
        if (groupNames.length > 0 && (!activeGroupName || !groups[activeGroupName])) {
            setActiveGroupName(groupNames[0]);
        }
        return groups;
    }, [tasksLayout, activeGroupName]);

    const groupNames = Object.keys(groupedTasks);

    const totalMaxPoints = useMemo(() =>
        tasksLayout.reduce((sum, t) => sum + Number(t.maxPoints || 0), 0),
        [tasksLayout]
    );

    const handleSaveCustomSkill = useCallback(async (name: string, graph: any) => {
        if (editingGraphTaskIdx === null) return;
        
        await persistGraphAsSkill(name, graph, editingGraphTaskIdx);
        alert(`Skill "${name}" erfolgreich im Skill Center gespeichert und dem active Skill-Profil hinzugefügt!`);
    }, [editingGraphTaskIdx, persistGraphAsSkill]);

    const handleSectionChange = useCallback((idx: number, newText: string) => {
        const updatedTasks = [...tasksLayout];
        const task = updatedTasks[idx];

        updatedTasks[idx] = { 
            ...task, 
            content: newText
        };
        
        if (onTasksChange) {
            onTasksChange(updatedTasks);
        }
        
        if (onModelSolutionChange) {
            onModelSolutionChange(joinTaskSections(updatedTasks.map(t => t.content || ""), updatedTasks));
        }
    }, [tasksLayout, onTasksChange, onModelSolutionChange, getDefaultGradingGraph]);


    return (
        <Card className="flex flex-col border-white/50 bg-white/60 backdrop-blur-xl shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100/50">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <FileText className="text-primary" size={24} />
                    Musterlösung
                </CardTitle>
                <div className="flex items-center gap-2">
                    {hasModel && (
                        <>
                            <input type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" ref={modelInputRef} onChange={onModelUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 flex items-center gap-2 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg border border-primary/10 hover:bg-primary hover:text-white transition-all"
                                onClick={() => modelInputRef.current?.click()}
                            >
                                <RefreshCw size={12} className={extractingLayout ? "animate-spin" : ""} />
                                <span>Ändern</span>
                            </Button>
                        </>
                    )}
                    <KorekiTooltip 
                        title="PRO TIPP"
                        content="Eine gute Musterlösung ist das Herzstück. Dokumentieren Sie hier alle Erwartungen und Punkte pro Teilaufgabe."
                        position="bottom"
                    />
                </div>
            </CardHeader>

            <CardContent className="flex-grow pt-4">
                {!hasModel ? (
                    <div 
                        onClick={() => modelInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed border-slate-200/80 rounded-[1.8rem] bg-slate-50/30 hover:bg-white/80 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8 text-center group/dropzone min-h-[350px]"
                    >
                        <input type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" ref={modelInputRef} onChange={onModelUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4 group-hover/dropzone:scale-110 group-hover/dropzone:-translate-y-1 group-hover/dropzone:shadow-md transition-all duration-300">
                            <FileUp size={36} className="text-blue-500" />
                        </div>
                        <p className="font-semibold text-slate-700 group-hover/dropzone:text-blue-600 transition-colors">Musterlösung laden (Text (.txt), PDF, Bilder)</p>
                    </div>
                ) : hasTaskStructure ? (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Aufgabenstruktur</p>

                            {(eligibleTaskIndices.length > 0 || isBatchGenerating) && (
                                <div className="flex items-center justify-between gap-3 rounded-xl bg-indigo-50/60 border border-indigo-100/60 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Sparkles size={13} className="text-indigo-500 shrink-0 animate-pulse" />
                                        <p className="text-[0.7rem] text-slate-600 truncate">
                                            {isBatchGenerating ? (
                                                <>
                                                    <strong className="text-indigo-600">Berechnungsgraphen werden generiert</strong>
                                                    {` – ${Object.values(batchStatus).filter(s => s === 'success' || s === 'error').length} von ${Object.keys(batchStatus).length} abgeschlossen`}
                                                </>
                                            ) : (
                                                <>
                                                    <strong className="text-indigo-600">{eligibleTaskIndices.length} {eligibleTaskIndices.length === 1 ? 'Aufgabe' : 'Aufgaben'} mit Rechenweg erkannt</strong>
                                                    {' – Berechnungsgraph erstellen für bessere Ergebnisse?'}
                                                </>
                                            )}
                                        </p>
                                        <KorekiTooltip
                                            title="KI-Berechnungsgraph"
                                            iconSize={13}
                                            position="bottom"
                                            widthClass="w-80"
                                            buttonClassName="h-5 w-5 text-indigo-400"
                                            content={
                                                <>
                                                    Koreki erstellt im Hintergrund einen <strong>KI-generierten Berechnungsgraphen</strong> für jede erkannte Rechenaufgabe.
                                                    <br /><br />
                                                    Dieser Graph wertet Schülerantworten <strong>deterministisch</strong> aus — also mathematisch exakt, mit automatischer Folgefehler-Kompensation. Beim Korrigieren nutzt Koreki den Graph, um präzisere und fairere Ergebnisse zu liefern.
                                                </>
                                            }
                                        />
                                    </div>
                                    <Button
                                        disabled={isLocked || isBatchGenerating}
                                        onClick={() => setShowAutoPilotConfig(true)}
                                        size="sm"
                                        className={cn(
                                            "rounded-lg px-3 py-1 h-7 text-[0.65rem] font-bold tracking-wide text-white uppercase flex items-center gap-1.5 shrink-0 transition-all duration-200",
                                            isBatchGenerating 
                                                ? "bg-slate-400 cursor-not-allowed" 
                                                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-sm shadow-indigo-200"
                                        )}
                                    >
                                        {isBatchGenerating ? (
                                            <>
                                                <Loader2 size={11} className="animate-spin" />
                                                <span>Läuft…</span>
                                            </>
                                        ) : appMode === 'STANDARD' || appMode === 'TRIAL' ? (
                                            <>
                                                <Sparkles size={11} />
                                                <span>GO</span>
                                                <span className="bg-white/20 rounded px-1 text-[0.6rem] font-black leading-none py-0.5">{eligibleTaskIndices.length} C</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={11} />
                                                <span>Starten</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                            {isBatchGenerating && Object.keys(batchStatus).length > 0 && (
                                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden -mt-2">
                                    <div 
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                                        style={{ 
                                            width: `${(Object.values(batchStatus).filter(s => s === 'success' || s === 'error').length / Object.keys(batchStatus).length) * 100}%` 
                                        }}
                                    />
                                </div>
                            )}

                            {allSuggestedGraphsVerified && (
                                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-cyan-50/30 border border-emerald-100 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gradient-to-tr from-emerald-500 to-teal-600 text-white p-2.5 rounded-xl shadow-md shadow-emerald-100">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-0.5">KI-Berechnungsgraphen erfolgreich erstellt</h4>
                                            <p className="text-xs text-slate-600 leading-normal">
                                                Alle Rechengraphen für eine deterministische Korrektur von Aufgaben wurden erfolgreich generiert und getestet.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 overflow-x-auto pb-4 px-1 no-scrollbar">
                                {groupNames.map(name => (
                                    <Button
                                        key={name}
                                        variant={activeGroupName === name ? "default" : "secondary"}
                                        onClick={() => setActiveGroupName(name)}
                                        className={cn(
                                            "rounded-2xl px-6 py-2 h-auto text-xs font-bold transition-all shrink-0 border border-transparent",
                                            activeGroupName === name ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "bg-white text-slate-600 hover:bg-slate-50 border-slate-100"
                                        )}
                                    >
                                        {name}
                                    </Button>
                                ))}
                            </div>


                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {activeGroupName && groupedTasks[activeGroupName]?.map((task) => {
                                    const originalIdx = tasksLayout.findIndex(t => t === task);
                                    const content = taskSections[originalIdx];
                                    const isGraphTask = !!(
                                        task.taskType && (
                                            task.taskType === 'vlsm' || 
                                            task.taskType === 'skill-calc-vlsm' ||
                                            SKILL_REGISTRY[task.taskType]?.metadata?.isGraphBased ||
                                            (settings?.customSkills && settings.customSkills[task.taskType]?.isGraphBased)
                                        )
                                    );
                                    
                                    const isCustomSkill = !!(task.taskType && task.taskType.startsWith('custom-skill-'));
                                    const templateName = isCustomSkill 
                                        ? settings?.customSkills?.[task.taskType]?.name || "Vorlage"
                                        : null;

                                    const shouldSuggestGraph = !!task.suggestGraph;

                                    const batchState = batchStatus[originalIdx];
                                    const isGeneratingThisTask = generatingGraphForTask === originalIdx || batchState === 'generating';
                                    const validation = task.gradingGraph?.validation;
                                    const isValid = validation?.isValid ?? true;
                                    const valError = validation?.error;

                                    const statusIcon = (() => {
                                        if (isGeneratingThisTask) {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-500 flex items-center justify-center shrink-0" title="Wird generiert...">
                                                    <Loader2 size={12} className="animate-spin" />
                                                </div>
                                            );
                                        }
                                        if (batchState === 'waiting') {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 animate-pulse" title="In Warteschlange...">
                                                    <Clock size={12} />
                                                </div>
                                            );
                                        }
                                        if (batchState === 'error') {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center shrink-0" title="Fehler bei der Generierung">
                                                    <AlertCircle size={12} className="animate-bounce" />
                                                </div>
                                            );
                                        }
                                        if (task.gradingGraph) {
                                            if (isValid) {
                                                return (
                                                    <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0" title="Verifiziert (Dry-Run bestanden)">
                                                        <ShieldCheck size={14} />
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center shrink-0" title={`Dry-Run Validierungsfehler: ${valError || 'Fehler'}`}>
                                                        <ShieldAlert size={14} />
                                                    </div>
                                                );
                                            }
                                        }
                                        return null;
                                    })();

                                    const handleToggleSuggestGraph = (e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        if (isLocked || isBatchGenerating) return;
                                        const updatedTasks = [...tasksLayout];
                                        updatedTasks[originalIdx] = {
                                            ...updatedTasks[originalIdx],
                                            suggestGraph: !updatedTasks[originalIdx].suggestGraph
                                        };
                                        onTasksChange?.(updatedTasks);
                                    };

                                    const graphActionNode = (
                                        <div className={cn(
                                            "flex items-center gap-1.5 transition-all duration-300",
                                            shouldSuggestGraph && !task.gradingGraph ? "opacity-95 scale-105" : "opacity-40 hover:opacity-100"
                                        )}>
                                            {statusIcon}
                                            <button
                                                type="button"
                                                disabled={isGeneratingThisTask || batchState === 'waiting'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingGraphTaskIdx(originalIdx);
                                                }}
                                                title={isLocked 
                                                    ? "Bewertungs-Graph ansehen (Schreibgeschützt, da bereits korrigierte Schülerarbeiten existieren)" 
                                                    : (task.gradingGraph 
                                                        ? (isCustomSkill ? `Vorlage "${templateName}" bearbeiten` : "Bewertungs-Graph bearbeiten") 
                                                        : (shouldSuggestGraph 
                                                            ? "Bewertungs-Graph erstellen oder zuweisen (KI-Empfehlung für deterministisches Ergebnis)" 
                                                            : "Bewertungs-Graph erstellen oder zuweisen"))
                                                }
                                                className={cn(
                                                    "h-7 w-7 rounded-lg transition-all flex items-center justify-center shrink-0 border select-none cursor-pointer focus:outline-none relative",
                                                    task.gradingGraph 
                                                        ? (isCustomSkill 
                                                            ? "bg-indigo-50/60 border-indigo-100/60 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200" 
                                                            : "bg-emerald-50/60 border-emerald-100/60 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200")
                                                        : (shouldSuggestGraph
                                                            ? "bg-indigo-50/40 border-indigo-200 text-indigo-500 hover:text-primary hover:border-primary/50 shadow-sm shadow-indigo-100/50"
                                                            : "border-dashed border-slate-200 text-slate-400 hover:text-primary hover:border-primary/50")
                                                )}
                                            >
                                                <Sparkles size={12} className={cn("shrink-0", (task.gradingGraph || shouldSuggestGraph) && "animate-pulse")} />
                                                {shouldSuggestGraph && !task.gradingGraph && !isGeneratingThisTask && batchState !== 'waiting' && (
                                                    <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                                    </span>
                                                )}
                                            </button>
                                            {shouldSuggestGraph && !task.gradingGraph && !isGeneratingThisTask && (
                                                <button
                                                    type="button"
                                                    onClick={handleToggleSuggestGraph}
                                                    disabled={isLocked || isBatchGenerating}
                                                    title="Aus dem Auto-Pilot ausschließen"
                                                    className="h-6 w-6 rounded-md bg-indigo-50/60 border border-indigo-200/60 text-indigo-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer focus:outline-none"
                                                >
                                                    <ToggleRight size={12} />
                                                </button>
                                            )}
                                            {!shouldSuggestGraph && !task.gradingGraph && eligibleTaskIndices.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleToggleSuggestGraph}
                                                    disabled={isLocked || isBatchGenerating}
                                                    title="Zum Berechnungsgraph-Durchlauf hinzufügen"
                                                    className="h-6 w-6 rounded-md bg-slate-50/60 border border-dashed border-slate-200 text-slate-300 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-500 flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer focus:outline-none"
                                                >
                                                    <ToggleLeft size={12} />
                                                </button>
                                            )}
                                        </div>
                                    );


                                    return (
                                        <div key={`task-${originalIdx}`} className="relative group p-1">
                                            <div className="flex items-center justify-between mb-3 px-2">
                                                <input
                                                    type="text"
                                                    value={task.name}
                                                    onChange={(e) => {
                                                        const newName = e.target.value;
                                                        const updatedTasks = [...tasksLayout];
                                                        updatedTasks[originalIdx] = {
                                                            ...updatedTasks[originalIdx],
                                                            name: newName
                                                        };
                                                        onTasksChange?.(updatedTasks);
                                                        if (onModelSolutionChange) {
                                                            onModelSolutionChange(joinTaskSections(updatedTasks.map(t => t.content || ""), updatedTasks));
                                                        }
                                                    }}
                                                    disabled={isLocked}
                                                    placeholder="Name der Aufgabe"
                                                    className="text-sm font-bold text-slate-800 tracking-tight bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary/50 focus:outline-none transition-all duration-200 w-32 md:w-48 px-1 py-0.5 rounded-sm truncate"
                                                />
                                                <PointInput 
                                                    value={Number(task.maxPoints || 0)}
                                                    onChange={(val) => {
                                                        const updatedTasks = [...tasksLayout];
                                                        updatedTasks[originalIdx] = { ...updatedTasks[originalIdx], maxPoints: val };
                                                        onTasksChange?.(updatedTasks);
                                                    }}
                                                    disabled={isLocked}
                                                />
                                            </div>
                                            <EditableMathArea
                                                value={content || ''}
                                                onChange={(newVal) => handleSectionChange(originalIdx, newVal)}
                                                placeholder="Musterlösung hier eingeben..."
                                                className="w-full"
                                                leftAction={graphActionNode}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100/60 flex items-center justify-between bg-white/40 p-4 rounded-2xl">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Aufgaben</span>
                                    <span className="text-lg font-black text-slate-800">{tasksLayout.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Max. Punkte</span>
                                    <span className="text-lg font-black text-primary">{totalMaxPoints}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                                {extractingLayout ? "Extraktion läuft..." : "Extrahiertes Dokument"}
                            </span>
                        </div>
                        <Textarea
                            value={modelSolution}
                            onChange={(e) => onModelSolutionChange && onModelSolutionChange(e.target.value)}
                            className={cn(
                                "flex-1 min-h-[350px] p-5 rounded-[1.5rem] bg-white/50 border-slate-200 shadow-inner font-mono text-sm resize-none",
                                extractingLayout && "opacity-50 pointer-events-none"
                            )}
                            placeholder={extractingLayout ? "Lese Inhalt..." : "Inhalt der Musterlösung hier bearbeiten..."}
                        />
                    </div>
                )}
            </CardContent>
            {editingGraphTaskIdx !== null && (() => {
                const task = tasksLayout[editingGraphTaskIdx];
                const content = taskSections[editingGraphTaskIdx] || "";
                
                return (
                    <GradingGraphModal
                        isOpen={editingGraphTaskIdx !== null}
                        onClose={() => setEditingGraphTaskIdx(null)}
                        initialGraph={task?.gradingGraph}
                        isLocked={isLocked}
                        taskName={task?.name || `Aufgabe ${editingGraphTaskIdx + 1}`}
                        taskContent={content && content.trim() ? content : (modelSolution || "")}
                        taskType={task?.taskType}
                        customSkills={settings?.customSkills}
                        settings={settings}
                        appMode={appMode}
                        onSaveCustomSkill={handleSaveCustomSkill}
                        isGenerating={generatingGraphForTask === editingGraphTaskIdx}
                        onEngineChange={(newEngine) => {
                            const updatedTasks = [...tasksLayout];
                            const currentTask = updatedTasks[editingGraphTaskIdx];
                            
                            if (newEngine === 'default') {
                                updatedTasks[editingGraphTaskIdx] = {
                                    ...currentTask,
                                    taskType: 'default',
                                    gradingGraph: undefined
                                };
                            } else {
                                const newGraph = getDefaultGradingGraph(newEngine, editingGraphTaskIdx, content);
                                updatedTasks[editingGraphTaskIdx] = {
                                    ...currentTask,
                                    taskType: newEngine,
                                    gradingGraph: newGraph
                                };
                            }
                            onTasksChange?.(updatedTasks);
                        }}
                        onRegenerateGraph={async (discipline, userNotes) => {
                            if (onGenerateGraph && content && content.trim().length > 10) {
                                setGeneratingGraphForTask(editingGraphTaskIdx);
                                try {
                                    const mappedDiscipline = (discipline === 'math' || discipline === 'general' || discipline === 'computer-science-storage') 
                                        ? 'default' 
                                        : 'skill-calc-vlsm';
                                    const prepTasks = [...tasksLayout];
                                    prepTasks[editingGraphTaskIdx] = {
                                        ...prepTasks[editingGraphTaskIdx],
                                        taskType: mappedDiscipline
                                    };
                                    onTasksChange?.(prepTasks);

                                    const generatedGraph = await onGenerateGraph(editingGraphTaskIdx, content, userNotes, mappedDiscipline);
                                    if (generatedGraph) {
                                        const updatedTasks = [...tasksLayout];
                                        updatedTasks[editingGraphTaskIdx] = {
                                            ...updatedTasks[editingGraphTaskIdx],
                                            taskType: (generatedGraph.discipline === 'computer-science-networking' || generatedGraph.discipline === 'vlsm')
                                                ? 'skill-calc-vlsm'
                                                : 'default',
                                            gradingGraph: generatedGraph
                                        };
                                        onTasksChange?.(updatedTasks);
                                    }
                                    return generatedGraph;
                                } catch (err) {
                                    // Error is handled by parent
                                } finally {
                                    setGeneratingGraphForTask(null);
                                }
                            }
                            return null;
                        }}
                        onDeleteGraph={() => {
                            const updatedTasks = [...tasksLayout];
                            const currentTask = updatedTasks[editingGraphTaskIdx];
                            updatedTasks[editingGraphTaskIdx] = {
                                ...currentTask,
                                taskType: 'default',
                                gradingGraph: undefined
                            };
                            onTasksChange?.(updatedTasks);
                            setEditingGraphTaskIdx(null);
                        }}
                        onSave={(newGraph) => {
                            const updatedTasks = [...tasksLayout];
                            const currentTask = updatedTasks[editingGraphTaskIdx];
                            
                            updatedTasks[editingGraphTaskIdx] = {
                                ...currentTask,
                                gradingGraph: newGraph
                            };
                            onTasksChange?.(updatedTasks);
                            setEditingGraphTaskIdx(null);
                        }}
                    />
                );
            })()}
            <AutoPilotConfigModal
                isOpen={showAutoPilotConfig}
                onClose={() => setShowAutoPilotConfig(false)}
                onConfirm={handleStartAutoPilot}
                eligibleTaskIndices={eligibleTaskIndices}
                tasksLayout={tasksLayout}
            />
        </Card>
    );
};
