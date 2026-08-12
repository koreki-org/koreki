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
import { ModelSolutionTaskCard } from './ModelSolutionTaskCard';
import { ModelSolutionAutopilotBar } from './ModelSolutionAutopilotBar';
import { EditableMathArea } from '@/components/ui/EditableMathArea';
import { cn } from '@/lib/utils';
import { groupTasksByMain, splitTextByTasks, composeModelSolution } from '@/lib/task-utils';
import { GradingGraphModal } from '../batch/GradingGraphModal';
import { CalcTraceModal } from '../batch/CalcTraceModal';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { useDashboardStore } from '@/hooks/store/useDashboardStore';
import { isDesktopTarget } from '@/lib/env-context';
import { apiClient } from '@/lib/api-client';
import { STANDARD_SKILL_PROFILES, getDefaultSkillIds, DEFAULT_SKILL_PROFILE_ID } from '@/lib/ai/standard-skills-profiles';
import { resolveProfileRef } from '@/lib/services/profile-naming';
import { downloadFile } from '@/lib/file-utils';
import { buildModelSolutionExportFilename, serializeModelSolutionExport } from '@/lib/model-solution-export';
import { buildAutoSkillName, resolveCustomSkillId } from '@/lib/custom-skill-id';
import { planSkillProfileSync } from '@/lib/skill-profile-sync';



interface ModelSolutionCardProps {
    modelSolution: string;
    /** Fachlicher Rahmen, der zu keiner einzelnen Aufgabe gehört. */
    modelSolutionContext?: string;
    tasksLayout: Task[];
    extractingLayout: boolean;
    onModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onModelSolutionChange?: (newVal: string) => void;
    onModelSolutionContextChange?: (newVal: string) => void;
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
    modelSolutionContext = '',
    tasksLayout,
    extractingLayout,
    onModelUpload,
    onModelSolutionChange,
    onModelSolutionContextChange,
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
        // 1. Save to localStorage under 'koreki_custom_skills' (and check for existing)
        const stored = localStorage.getItem('koreki_custom_skills');
        let customSkills: Record<string, any> = {};
        if (stored) {
            try { customSkills = JSON.parse(stored); } catch (e) {}
        }

        // Duplikatvermeidung samt Regelwerk liegt in lib/custom-skill-id.ts.
        const id = resolveCustomSkillId({
            name,
            customSkills,
            currentTask: tasksLayoutRef.current[taskIdx],
            taskIdx
        });
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
        const activeProfileId = settings?.activeSkillProfileId || localStorage.getItem('koreki_active_skill_profile_id') || DEFAULT_SKILL_PROFILE_ID;

        if (isDesktopTarget()) {
            // --- DESKTOP APP (TAURI / OFFLINE) PERSISTENCE ---
            const localProfilesStored = localStorage.getItem('koreki_local_skill_profiles');
            let localProfiles: any[] = [];
            if (localProfilesStored) {
                try { localProfiles = JSON.parse(localProfilesStored); } catch (e) {}
            }

            const activeLocalProfile = resolveProfileRef(localProfiles, activeProfileId);
            const ownLocalProfile = activeLocalProfile && !activeLocalProfile.isSystem ? activeLocalProfile : null;

            // Zuvor `p.name === activeProfileId || p.isSystem`: da jede Vorlage
            // `isSystem` traegt, gewann bei nicht passender Referenz IMMER der
            // erste Registry-Eintrag — das neue Profil startete mit den Skills
            // der Grundschul-Vorlage. Die Slugs loesen die Referenz sauber auf.
            const matchingSystem = resolveProfileRef(STANDARD_SKILL_PROFILES, activeProfileId);
            const plan = planSkillProfileSync({
                activeProfile: ownLocalProfile,
                skillId: id,
                skill: newSkill,
                fallbackSkillIds: matchingSystem ? [...matchingSystem.activeSkillIds] : getDefaultSkillIds()
            });

            if (plan.action === 'update' && ownLocalProfile) {
                ownLocalProfile.activeSkillIds = plan.activeSkillIds;
                ownLocalProfile.customSkills = plan.customSkills;
                localStorage.setItem('koreki_local_skill_profiles', JSON.stringify(localProfiles));
            } else {
                const newProfileId = `local-skill-${Date.now()}`;

                localProfiles.push({
                    id: newProfileId,
                    name: plan.name,
                    activeSkillIds: plan.activeSkillIds,
                    customSkills: plan.customSkills,
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
                    // Ueber den Aufloeser, damit auch eine noch namensbasierte
                    // Altreferenz das aktive Profil trifft — sonst landete der
                    // neue Skill in einem frisch angelegten „Mein Skill-Profil".
                    const activeProfile = resolveProfileRef<any>(profilesList, activeProfileId);

                    // Dieselbe Entscheidung wie im Desktop-Zweig oben — nur das
                    // Ziel unterscheidet sich (API statt localStorage).
                    const plan = planSkillProfileSync({
                        activeProfile,
                        skillId: id,
                        skill: newSkill,
                        fallbackSkillIds: getDefaultSkillIds()
                    });

                    if (plan.action === 'update') {
                        await apiClient.post('/api/user/skill-profiles', {
                            name: plan.name,
                            activeSkillIds: plan.activeSkillIds,
                            customSkills: plan.customSkills
                        });
                    } else {
                        const createRes = await apiClient.post('/api/user/skill-profiles', {
                            name: plan.name,
                            activeSkillIds: plan.activeSkillIds,
                            customSkills: plan.customSkills
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
                    
                    // Der Name muss zum Praefix-Vergleich in resolveCustomSkillId
                    // passen — beide liegen deshalb in lib/custom-skill-id.ts.
                    const skillName = buildAutoSkillName(task, idx);

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
            onModelSolutionChange(composeModelSolution(modelSolutionContext, updatedTasks.map(t => t.content || ""), updatedTasks));
        }
    }, [tasksLayout, onTasksChange, onModelSolutionChange, getDefaultGradingGraph]);

    const handleExportModelSolution = async () => {
        const now = new Date();
        const data = serializeModelSolutionExport(
            { modelSolution, modelSolutionContext, tasksLayout, settings },
            now
        );

        try {
            await downloadFile(data, buildModelSolutionExportFilename(now), 'application/json;charset=utf-8');
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
                        {/* Gemeinsamer Rahmen: gehört zu keiner Aufgabe und hätte sonst keinen sichtbaren Ort. */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3 px-1">
                                <p className="text-xxs font-black uppercase tracking-[0.2em] text-muted-foreground">Gemeinsamer Rahmen</p>
                                <span className="text-xxs font-bold text-muted-foreground/70">gilt für alle Aufgaben</span>
                            </div>
                            <Textarea
                                value={modelSolutionContext}
                                onChange={(e) => onModelSolutionContextChange?.(e.target.value)}
                                disabled={isLocked}
                                placeholder="Szenario, übergreifender Arbeitsauftrag oder gemeinsame Annahmen — leer lassen, wenn es keine gibt."
                                className="min-h-[80px] p-4 rounded-2xl bg-background/50 border-border shadow-inner text-sm resize-y"
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <p className="text-xxs font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Aufgabenstruktur</p>

                            <ModelSolutionAutopilotBar
                                eligibleTaskIndices={eligibleTaskIndices}
                                isBatchGenerating={isBatchGenerating}
                                batchStatus={batchStatus}
                                allSuggestedGraphsVerified={allSuggestedGraphsVerified}
                                isLocked={isLocked}
                                appMode={appMode}
                                tasksLayout={tasksLayout}
                                onStartAutoPilot={handleStartAutoPilot}
                            />

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
                                    return (
                                        <ModelSolutionTaskCard
                                            key={originalIdx}
                                            task={task}
                                            originalIdx={originalIdx}
                                            content={taskSections[originalIdx]}
                                            settings={settings}
                                            isLocked={isLocked}
                                            isBatchGenerating={isBatchGenerating}
                                            batchStatus={batchStatus}
                                            eligibleTaskIndices={eligibleTaskIndices}
                                            generatingGraphForTask={generatingGraphForTask}
                                            tasksLayout={tasksLayout}
                                            taskSections={taskSections}
                                            modelSolutionContext={modelSolutionContext}
                                            onModelSolutionChange={onModelSolutionChange}
                                            onTasksChange={onTasksChange}
                                            onSectionChange={handleSectionChange}
                                            setEditingGraphTaskIdx={setEditingGraphTaskIdx}
                                            setShowEngineSelectionTaskIdx={setShowEngineSelectionTaskIdx}
                                        />
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
                                    <p className="text-xs text-muted-foreground mt-1">Für strukturierte Netzwerke (z.B. VLSM) oder grafisch vernetzte Variablen.</p>
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
