import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText, FileUp, RefreshCw, Sparkles, Loader2, Layers, Trash2, Link2Off, HelpCircle, AlertCircle, ShieldCheck, ShieldAlert, Clock, ToggleLeft, ToggleRight, Download, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Task, AppSettings } from '@/types';
import { promisePool } from '../../lib/ai/promise-pool';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { CollapsibleCardContent, CollapseToggleButton } from '@/components/ui/CollapsibleCardContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { KorekiTooltip } from '@/components/ui/KorekiTooltip';
import { PointInput } from '@/components/ui/PointInput';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { cn } from '@/lib/utils';
import { groupTasksByMain, splitTextByTasks, joinTaskSections } from '@/lib/task-utils';
import { GradingGraphModal } from '../batch/GradingGraphModal';
import { CalcTraceModal } from '../batch/CalcTraceModal';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_SKILL_PROFILES } from '@/lib/ai/standard-skills-profiles';
import { downloadFile } from '@/lib/file-utils';



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
    onGenerateCalcTrace?: (taskIndex: number, taskText: string, userNotes?: string) => Promise<any>;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
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
    onGenerateGraph,
    onGenerateCalcTrace,
    collapsed = false,
    onToggleCollapse
}) => {
    const [activeGroupName, setActiveGroupName] = useState<string>("");
    const [generatingGraphForTask, setGeneratingGraphForTask] = useState<number | null>(null);
    const [editingGraphTaskIdx, setEditingGraphTaskIdx] = useState<number | null>(null);
    const [showEngineSelectionTaskIdx, setShowEngineSelectionTaskIdx] = useState<number | null>(null);

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
            .filter(({ t }) => t.suggestGraph && !t.gradingGraph && !t.targetGoal)
            .map(({ idx }) => idx);
    }, [tasksLayout]);

    const allSuggestedGraphsVerified = useMemo(() => {
        const suggestedTasks = tasksLayout.filter(t => t.suggestGraph);
        if (suggestedTasks.length === 0) return false;
        return suggestedTasks.every(t => {
            const hasValidGraph = t.gradingGraph && (t.gradingGraph.validation?.isValid ?? true);
            const hasValidTrace = t.targetGoal; // Target Goals are always valid once extracted
            return hasValidGraph || hasValidTrace;
        });
    }, [tasksLayout]);

    const persistSkillData = useCallback(async (
        name: string,
        newSkill: any,
        taskIdx: number,
        updateTaskLayout: (task: Task) => Task
    ) => {
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
        newSkill.id = id;

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
                    ...updateTaskLayout(updated[taskIdx]),
                    taskType: id
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
                const baseSkillIds = matchingSystem ? [...matchingSystem.activeSkillIds] : ["skill-consecutive-errors", "skill-math-equivalence", "skill-math-isolated-grading", "skill-math-scratchpad"];
                
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
                        const baseSkillIds = activeProfile ? [...activeProfile.activeSkillIds] : ["skill-consecutive-errors", "skill-math-equivalence", "skill-math-isolated-grading", "skill-math-scratchpad"];
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

    const persistGraphAsSkill = useCallback(async (name: string, graph: any, taskIdx: number) => {
        const newSkill = {
            id: '',
            name,
            category: 'graph-skills',
            description: `Automatisch generierter Graph für ${name}.`,
            promptSnippet: `KORREKTUR-DIREKTIVE FÜR GRAPH-BASIERTE BEWERTUNG:\nNutze den definierten Grading Graph zur mathematischen Prüfung und Folgefehler-Kompensation.`,
            isCustom: true,
            isGraphBased: true,
            gradingGraph: graph
        };
        return persistSkillData(name, newSkill, taskIdx, (task) => ({ ...task, gradingGraph: graph }));
    }, [persistSkillData]);

    // persistCalcTraceAsSkill removed

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

                    if (config.discipline === 'vlsm') {
                        if (onGenerateGraph) {
                            const mappedDiscipline = 'skill-calc-vlsm';
                            
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
                            
                            const note = `SPEZIFIKATION: Bitte erstelle einen Graphen für ein Netzwerk-Plugin (VLSM). Die Bewertung soll ${config.disablePoints ? 'HYBRID (disablePoints = true)' : 'STRENG (disablePoints = false)'} sein.`;
                            
                            const generatedGraph = await onGenerateGraph(idx, content, note, mappedDiscipline);
                            if (generatedGraph) {
                                generatedGraph.disablePoints = config.disablePoints;
                                await persistGraphAsSkill(skillName, generatedGraph, idx);
                                setBatchStatus(prev => ({ ...prev, [idx]: 'success' }));
                            } else {
                                setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                            }
                        } else {
                            setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                        }
                    } else {
                        // Calc Goal Autopilot
                        if (onGenerateCalcTrace) {
                            const note = `SPEZIFIKATION: Bitte extrahiere das Endziel und den Erwartungshorizont (TargetGoal).`;
                            const generatedGoal = await onGenerateCalcTrace(idx, content, note);
                            if (generatedGoal) {
                                onTasksChange?.(prevTasks => {
                                    const updated = [...prevTasks];
                                    if (updated[idx]) {
                                        updated[idx] = {
                                            ...updated[idx],
                                            taskType: 'calc-trace', // Keep identifier for Math Tasks
                                            targetGoal: generatedGoal
                                        };
                                    }
                                    return updated;
                                });
                                setBatchStatus(prev => ({ ...prev, [idx]: 'success' }));
                            } else {
                                setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                            }
                        } else {
                            setBatchStatus(prev => ({ ...prev, [idx]: 'error' }));
                        }
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
    }, [eligibleTaskIndices, onGenerateGraph, onGenerateCalcTrace, persistGraphAsSkill, isBatchGenerating, onTasksChange]);



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

    const handleExportModelSolution = async () => {
        const exportData = {
            version: '2.0',
            modelSolution,
            tasksLayout,
            timestamp: new Date().toISOString(),
            metadata: {
                activeProfileId: settings?.activePromptProfileId,
                activeAiProfileId: settings?.activeAiProfileId
            }
        };
        const data = JSON.stringify(exportData, null, 2);

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        
        const filename = `koreki-ml-${yyyy}-${mm}-${dd}_${hh}${min}.koreki`;
        
        try {
            await downloadFile(data, filename, 'application/json;charset=utf-8');
        } catch (error) {
            console.error('Fehler beim Exportieren der Musterlösung:', error);
            alert('Export der Musterlösung fehlgeschlagen.');
        }
    };

    return (
        <Card className="flex flex-col border-border/50 bg-background/60 backdrop-blur-xl shadow-xl shadow-foreground/5 rounded-hero overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 border-b border-border/50">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                        <FileText size={18} />
                    </div>
                    <span className="truncate">Musterlösung</span>
                    <KorekiTooltip
                        title="PRO TIPP"
                        content="Eine gute Musterlösung ist das Herzstück. Dokumentieren Sie hier alle Erwartungen und Punkte pro Teilaufgabe."
                        position="bottom"
                        align="left"
                        className="inline-flex shrink-0"
                    />
                </CardTitle>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {hasModel && (
                        <>
                            <input type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" ref={modelInputRef} onChange={onModelUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                            <Button
                                variant="chip"
                                size="xs"
                                className="flex items-center gap-2 transition-all shrink-0"
                                onClick={() => modelInputRef.current?.click()}
                                title="Musterlösung ändern"
                                aria-label="Musterlösung ändern"
                            >
                                <RefreshCw size={12} className={extractingLayout ? "animate-spin" : ""} />
                                <span className="hidden sm:inline">Ändern</span>
                            </Button>

                            <Button
                                variant="chip"
                                size="xs"
                                className="flex items-center gap-2 transition-all animate-fade-in shrink-0"
                                onClick={handleExportModelSolution}
                                title="Musterlösung als Zwischenstand exportieren (.koreki)"
                                aria-label="Musterlösung exportieren"
                            >
                                <Download size={12} />
                                <span className="hidden sm:inline">Exportieren</span>
                            </Button>
                        </>
                    )}
                    {onToggleCollapse && (
                        <CollapseToggleButton
                            collapsed={collapsed}
                            onToggleCollapse={onToggleCollapse}
                            label="Musterlösung"
                        />
                    )}
                </div>
            </CardHeader>

            <CollapsibleCardContent collapsed={collapsed} className="flex-grow pt-4">
                {!hasModel ? (
                    <div 
                        onClick={() => modelInputRef.current?.click()}
                        className="flex-1 border-2 border-dashed border-border/60 rounded-hero bg-muted/20 hover:bg-background/80 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8 text-center group/dropzone min-h-[350px]"
                    >
                        <input type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" ref={modelInputRef} onChange={onModelUpload} onClick={(e) => (e.target as HTMLInputElement).value = ''} hidden />
                        <div className="bg-background p-4 rounded-2xl shadow-sm border border-border mb-4 group-hover/dropzone:scale-110 group-hover/dropzone:-translate-y-1 group-hover/dropzone:shadow-md transition-all duration-300">
                            <FileUp size={36} className="text-primary" />
                        </div>
                        <p className="font-semibold text-foreground group-hover/dropzone:text-primary transition-colors">Musterlösung laden (Text (.txt), PDF, Bilder)</p>
                    </div>
                ) : hasTaskStructure ? (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                            <p className="text-xxs font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Aufgabenstruktur</p>

                            {(eligibleTaskIndices.length > 0 || isBatchGenerating) && (
                                <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Sparkles size={13} className="text-primary shrink-0 animate-pulse" />
                                        <p className="text-xxs text-foreground truncate">
                                            {isBatchGenerating ? (
                                                <>
                                                    <strong className="text-primary">Berechnungsgraphen werden generiert</strong>
                                                    {` – ${Object.values(batchStatus).filter(s => s === 'success' || s === 'error').length} von ${Object.keys(batchStatus).length} abgeschlossen`}
                                                </>
                                            ) : (
                                                <>
                                                    <strong className="text-primary">{eligibleTaskIndices.length} {eligibleTaskIndices.length === 1 ? 'Aufgabe' : 'Aufgaben'} mit Rechenweg erkannt</strong>
                                                    {' – Berechnungsgraph erstellen für bessere Ergebnisse?'}
                                                </>
                                            )}
                                        </p>
                                        <KorekiTooltip
                                            title="KI-Berechnungsgraph"
                                            iconSize={13}
                                            position="bottom"
                                            widthClass="w-80"
                                            buttonClassName="h-5 w-5 text-primary/60"
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
                                        onClick={() => {
                                            const autoConfigs: Record<number, { discipline: 'standard' | 'vlsm'; disablePoints: boolean }> = {};
                                            eligibleTaskIndices.forEach(idx => {
                                                const t = tasksLayout[idx];
                                                const isVlsm = t.predictedPluginDomain?.toLowerCase().includes('netzwerk') || t.predictedPluginDomain?.toLowerCase().includes('vlsm');
                                                autoConfigs[idx] = {
                                                    discipline: isVlsm ? 'vlsm' : 'standard',
                                                    disablePoints: true
                                                };
                                            });
                                            handleStartAutoPilot(autoConfigs);
                                        }}
                                        size="sm"
                                        className={cn(
                                            "rounded-lg px-3 py-1 h-7 text-xxs font-bold tracking-wide text-primary-foreground uppercase flex items-center gap-1.5 shrink-0 transition-all duration-200",
                                            isBatchGenerating 
                                                ? "bg-muted-foreground/40 cursor-not-allowed" 
                                                : "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm shadow-primary/20"
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
                                                <span className="bg-white/20 rounded px-1 text-xxs font-black leading-none py-0.5">{eligibleTaskIndices.length} C</span>
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
                                <div className="w-full bg-muted rounded-full h-1 overflow-hidden -mt-2">
                                    <div 
                                        className="bg-primary h-full rounded-full transition-all duration-500" 
                                        style={{ 
                                            width: `${(Object.values(batchStatus).filter(s => s === 'success' || s === 'error').length / Object.keys(batchStatus).length) * 100}%` 
                                        }}
                                    />
                                </div>
                            )}

                            {allSuggestedGraphsVerified && (
                                <div className="relative overflow-hidden rounded-2xl bg-success/5 border border-success/20 p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-success text-success-foreground p-2.5 rounded-xl shadow-sm">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-foreground uppercase tracking-wider mb-0.5 font-outfit">KI-Berechnungsstrukturen erfolgreich erstellt</h4>
                                            <p className="text-xs text-muted-foreground leading-normal font-medium">
                                                Alle Rechengraphen / Rechenketten für eine deterministische Korrektur von Aufgaben wurden erfolgreich generiert und getestet.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 overflow-x-auto pb-4 px-1 no-scrollbar scrollbar-hide">
                                {groupNames.map(name => (
                                    <Button
                                        key={name}
                                        variant={activeGroupName === name ? "default" : "secondary"}
                                        onClick={() => setActiveGroupName(name)}
                                        className={cn(
                                            "rounded-xl px-4 py-2 h-9 text-xs font-bold transition-all shrink-0 border border-transparent gap-2",
                                            activeGroupName === name ? "bg-primary text-primary-foreground shadow-md" : "bg-background text-muted-foreground hover:bg-muted border-border"
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
                                    const isCustomSkill = !!(task.taskType && task.taskType.startsWith('custom-skill-'));
                                    const customSkillData = isCustomSkill ? settings?.customSkills?.[task.taskType] : null;
                                    const isCalcTrace = !!task.targetGoal || 
                                                        !!customSkillData?.isCalcTrace || 
                                                        task.taskType === 'calc-trace' || 
                                                        (!task.gradingGraph && task.predictedPluginDomain === 'math');

                                    const templateName = isCustomSkill 
                                        ? customSkillData?.name || "Vorlage"
                                        : null;

                                    const shouldSuggestGraph = !!task.suggestGraph;

                                    const batchState = batchStatus[originalIdx];
                                    const isGeneratingThisTask = generatingGraphForTask === originalIdx || batchState === 'generating';
                                    const validation = task.gradingGraph?.validation || (task.targetGoal as any)?.validation;
                                    const isValid = validation?.isValid ?? true;
                                    const valError = validation?.error;

                                    const statusIcon = (() => {
                                        if (isGeneratingThisTask) {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0" title="Wird generiert...">
                                                    <Loader2 size={12} className="animate-spin" />
                                                </div>
                                            );
                                        }
                                        if (batchState === 'waiting') {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0 animate-pulse" title="In Warteschlange...">
                                                    <Clock size={12} />
                                                </div>
                                            );
                                        }
                                        if (batchState === 'error') {
                                            return (
                                                <div className="h-7 w-7 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive flex items-center justify-center shrink-0" title="Fehler bei der Generierung">
                                                    <AlertCircle size={12} className="animate-bounce" />
                                                </div>
                                            );
                                        }
                                        if (task.gradingGraph || task.targetGoal) {
                                            if (isValid) {
                                                return (
                                                    <div className={cn(
                                                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border",
                                                            isCalcTrace 
                                                                ? "bg-primary/10 border-primary/20 text-primary" 
                                                            : "bg-success/5 border border-success/20 text-success"
                                                    )} title="Verifiziert (Dry-Run bestanden)">
                                                        <ShieldCheck size={14} />
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <div className="h-7 w-7 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive flex items-center justify-center shrink-0" title={`Dry-Run Validierungsfehler: ${valError || 'Fehler'}`}>
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
                                            task.suggestGraph && !task.gradingGraph && !task.targetGoal ? "opacity-95 scale-105" : "opacity-40 hover:opacity-100"
                                        )}>
                                            {statusIcon}
                                            <button
                                                type="button"
                                                disabled={isGeneratingThisTask || batchState === 'waiting'}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (task.gradingGraph || task.targetGoal) {
                                                        setEditingGraphTaskIdx(originalIdx);
                                                    } else {
                                                        setShowEngineSelectionTaskIdx(originalIdx);
                                                    }
                                                }}
                                                title={isLocked 
                                                    ? (isCalcTrace ? "Rechenkette ansehen (Schreibgeschützt)" : "Bewertungs-Graph ansehen (Schreibgeschützt)") 
                                                    : ((task.gradingGraph || task.targetGoal) 
                                                        ? (isCustomSkill ? `Vorlage "${templateName}" bearbeiten` : (isCalcTrace ? "Rechenkette bearbeiten" : "Bewertungs-Graph bearbeiten")) 
                                                        : (shouldSuggestGraph 
                                                            ? "Bewertungs-Struktur erstellen oder zuweisen (KI-Empfehlung)" 
                                                            : "Bewertungs-Struktur erstellen oder zuweisen"))
                                                }
                                                className={cn(
                                                    "h-7 w-7 rounded-lg transition-all flex items-center justify-center shrink-0 border select-none cursor-pointer focus:outline-none relative",
                                                    (task.gradingGraph || task.targetGoal) 
                                                        ? (isCustomSkill 
                                                            ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 hover:border-primary/30" 
                                                            : (isCalcTrace 
                                                                ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 hover:border-primary/30" 
                                                                : "bg-success/5 border border-success/20 text-success hover:bg-success/10 hover:border-success/30"))
                                                        : (shouldSuggestGraph
                                                            ? "bg-primary/5 border-primary/20 text-primary hover:text-primary hover:border-primary/50 shadow-sm shadow-primary/10"
                                                            : "border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/50")
                                                )}
                                            >
                                                <Sparkles size={12} className={cn("shrink-0", (task.gradingGraph || task.targetGoal || shouldSuggestGraph) && "animate-pulse")} />
                                                {shouldSuggestGraph && !task.gradingGraph && !task.targetGoal && !isGeneratingThisTask && batchState !== 'waiting' && (
                                                    <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                                                    </span>
                                                )}
                                            </button>
                                            {shouldSuggestGraph && !task.gradingGraph && !task.targetGoal && !isGeneratingThisTask && (
                                                <button
                                                    type="button"
                                                    onClick={handleToggleSuggestGraph}
                                                    disabled={isLocked || isBatchGenerating}
                                                    title="Aus dem Auto-Pilot ausschließen"
                                                    className="h-6 w-6 rounded-md bg-primary/5 border border-primary/20 text-primary hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer focus:outline-none"
                                                >
                                                    <ToggleRight size={12} />
                                                </button>
                                            )}
                                            {!shouldSuggestGraph && !task.gradingGraph && !task.targetGoal && eligibleTaskIndices.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleToggleSuggestGraph}
                                                    disabled={isLocked || isBatchGenerating}
                                                    title="Zum Vorevaluierungs-Durchlauf hinzufügen"
                                                    className="h-6 w-6 rounded-md bg-muted/40 border border-dashed border-border text-muted-foreground/50 hover:bg-primary/5 hover:border-primary/20 hover:text-primary flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer focus:outline-none"
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
                                                    className="text-sm font-bold text-foreground tracking-tight bg-transparent border-b border-transparent hover:border-border focus:border-primary/50 focus:outline-none transition-all duration-200 w-32 md:w-48 px-1 py-0.5 rounded-sm truncate"
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

                        <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between bg-background/40 p-4 rounded-2xl">
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-xxs font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Aufgaben</span>
                                    <span className="text-lg font-black text-foreground">{tasksLayout.length}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xxs font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Max. Punkte</span>
                                    <span className="text-lg font-black text-primary">{totalMaxPoints}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xxs font-bold text-muted-foreground uppercase tracking-widest px-1">
                                {extractingLayout ? "Extraktion läuft..." : "Extrahiertes Dokument"}
                            </span>
                        </div>
                        <Textarea
                            value={modelSolution}
                            onChange={(e) => onModelSolutionChange && onModelSolutionChange(e.target.value)}
                            className={cn(
                                "flex-1 min-h-[350px] p-5 rounded-2xl bg-background/50 border-border shadow-inner font-mono text-sm resize-none",
                                extractingLayout && "opacity-50 pointer-events-none"
                            )}
                            placeholder={extractingLayout ? "Lese Inhalt..." : "Inhalt der Musterlösung hier bearbeiten..."}
                        />
                    </div>
                )}
            </CollapsibleCardContent>
            {editingGraphTaskIdx !== null && (() => {
                const task = tasksLayout[editingGraphTaskIdx];
                const content = taskSections[editingGraphTaskIdx] || "";
                const isCalcTraceTask = !!task?.targetGoal || 
                                        (task?.taskType && settings?.customSkills?.[task.taskType]?.isCalcTrace) ||
                                        task?.taskType === 'calc-trace' ||
                                        (!task?.gradingGraph && task?.predictedPluginDomain === 'math');
                
                if (isCalcTraceTask) {
                    return (
                        <CalcTraceModal
                            isOpen={editingGraphTaskIdx !== null}
                            onClose={() => setEditingGraphTaskIdx(null)}
                            initialTrace={task?.targetGoal}
                            isLocked={isLocked}
                            taskName={task?.name || `Aufgabe ${editingGraphTaskIdx + 1}`}
                            onSave={(goal) => {
                                const updatedTasks = [...tasksLayout];
                                updatedTasks[editingGraphTaskIdx] = {
                                    ...updatedTasks[editingGraphTaskIdx],
                                    targetGoal: goal
                                };
                                onTasksChange?.(updatedTasks);
                            }}
                        />
                    );
                }

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
            {showEngineSelectionTaskIdx !== null && createPortal(
                <div 
                    className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-md animate-fade-in font-inter text-foreground"
                    onClick={() => setShowEngineSelectionTaskIdx(null)}
                >
                    <div 
                        className="bg-background border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-zoom-in flex flex-col p-6 sm:p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-foreground font-outfit tracking-tight flex items-center gap-2">
                                <Sparkles className="text-primary w-5 h-5 shrink-0" />
                                Evaluierungs-Engine auswählen
                            </h3>
                            <button 
                                onClick={() => setShowEngineSelectionTaskIdx(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-full cursor-pointer focus:outline-none"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mb-6">
                            Wähle das passende Korrektur-Modell für diese Aufgabe aus, um die Kriterien-Erstellung zu konfigurieren.
                        </p>

                        {/* Grid */}
                        <div className="grid grid-cols-1 gap-4 mb-6">
                            {/* Option 1: PANG-Rechengraph */}
                            <button
                                type="button"
                                onClick={() => {
                                    const taskIdx = showEngineSelectionTaskIdx;
                                    onTasksChange?.(prevTasks => {
                                        const updated = [...prevTasks];
                                        if (updated[taskIdx]) {
                                            updated[taskIdx] = {
                                                ...updated[taskIdx],
                                                taskType: 'default',
                                                gradingGraph: { taskId: `task-${Date.now()}`, discipline: 'general', variables: [] }
                                            };
                                        }
                                        return updated;
                                    });
                                    setEditingGraphTaskIdx(taskIdx);
                                    setShowEngineSelectionTaskIdx(null);
                                }}
                                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-success/5 hover:border-success/20 transition-all text-left group cursor-pointer focus:outline-none"
                            >
                                <div className="p-2 rounded-lg bg-success/10">
                                    <Layers size={18} className="text-success" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-foreground group-hover:text-success font-outfit">Rechengraph (PANG)</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Für strukturierte Netzwerke (z.B. VLSM), RAID oder grafisch vernetzte Variablen.</p>
                                </div>
                            </button>

                            {/* Option 2: CalcTrace-Rechenkette */}
                            <button
                                type="button"
                                onClick={() => {
                                    const taskIdx = showEngineSelectionTaskIdx;
                                    onTasksChange?.(prevTasks => {
                                        const updated = [...prevTasks];
                                        if (updated[taskIdx]) {
                                            updated[taskIdx] = {
                                                ...updated[taskIdx],
                                                taskType: 'calc-trace',
                                                targetGoal: { targetValue: 0, maxPoints: Number(updated[taskIdx].maxPoints) || 1, unit: '', gradingRubric: '' }
                                            };
                                        }
                                        return updated;
                                    });
                                    setEditingGraphTaskIdx(taskIdx);
                                    setShowEngineSelectionTaskIdx(null);
                                }}
                                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-primary/5 hover:border-primary/20 transition-all text-left group cursor-pointer focus:outline-none"
                            >
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Sparkles size={18} className="text-primary" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary font-outfit">Rechenkette (CalcTrace)</h4>
                                    <p className="text-xs text-muted-foreground mt-1">Für mathematisch-numerische Aufgaben, Gleichungen und Schritt-für-Schritt-Rechnungen.</p>
                                </div>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 mt-2">
                            <Button 
                                type="button"
                                variant="ghost"
                                onClick={() => setShowEngineSelectionTaskIdx(null)}
                                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground h-auto"
                            >
                                Abbrechen
                            </Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </Card>
    );
};
