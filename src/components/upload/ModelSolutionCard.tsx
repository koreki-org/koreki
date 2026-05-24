import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FileText, FileUp, RefreshCw, Sparkles, Loader2, Layers, Trash2, Link2Off } from 'lucide-react';
import { Task, AppSettings } from '@/types';
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


interface ModelSolutionCardProps {
    modelSolution: string;
    tasksLayout: Task[];
    extractingLayout: boolean;
    onModelUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onModelSolutionChange?: (newVal: string) => void;
    onTasksChange?: (newTasks: Task[]) => void;
    isLocked?: boolean;
    settings?: AppSettings;
    appMode?: 'PURE' | 'STANDARD' | 'TRIAL';
    onGenerateGraph?: (taskIndex: number, taskText: string) => Promise<any>;
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

    const getBaseEngine = useCallback((task: Task) => {
        const type = task.taskType || 'default';
        if (type === 'vlsm' || type === 'skill-calc-vlsm') return 'skill-calc-vlsm';
        if (type === 'skill-calc-raid') return 'skill-calc-raid';
        
        if (type.startsWith('custom-skill-')) {
            const discipline = task.gradingGraph?.discipline;
            if (discipline === 'computer-science-networking') return 'skill-calc-vlsm';
            if (discipline === 'computer-science-storage') return 'skill-calc-raid';
            
            const skill = settings?.customSkills?.[type];
            const skillDiscipline = skill?.gradingGraph?.discipline;
            if (skillDiscipline === 'computer-science-networking') return 'skill-calc-vlsm';
            if (skillDiscipline === 'computer-science-storage') return 'skill-calc-raid';
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
        if (skillId === 'skill-calc-raid') {
            let raidLevel = 5;
            let diskCount = 4;
            let diskSize = 1000;

            if (taskContent) {
                const lower = taskContent.toLowerCase();

                // 1. Extract raid_level
                const rlMatch = lower.match(/raid[-_\s]*([0156])/i);
                if (rlMatch) {
                    raidLevel = parseInt(rlMatch[1], 10);
                }

                // 2. Unified Formula Extraction (e.g. (4 - 1) * 4 TB or 4 - 1 * 4 TB)
                const formulaMatch = lower.match(/\((\d+)\s*-\s*1\)\s*\*\s*(\d+)\s*(?:tb|gb|mb|pb)?/i) ||
                                     lower.match(/(?:^|[^\d])(\d+)\s*-\s*1\)?\s*\*\s*(\d+)\s*(?:tb|gb|mb|pb)?/i);

                if (formulaMatch) {
                    diskCount = parseInt(formulaMatch[1], 10);
                    diskSize = parseInt(formulaMatch[2], 10);
                } else {
                    // Fallback to separate regexes
                    const formulaCountMatch = lower.match(/\((\d+)\s*-\s*1\)/);
                    if (formulaCountMatch) {
                        diskCount = parseInt(formulaCountMatch[1], 10);
                    } else {
                        const dcMatch = lower.match(/(?:plattenanzahl|platten|anzahl platten|disks|hdds)\s*[:=]?\s*(\d+)/i) ||
                                        lower.match(/(\d+)\s*(?:platten|hdds|disks)/i);
                        if (dcMatch) {
                            diskCount = parseInt(dcMatch[1], 10);
                        }
                    }

                    const dsMatch = lower.match(/(?:plattengröße|groesse|kapazität pro platte|size|disk_size|größe)\s*[:=]?\s*(\d+)/i) ||
                                    lower.match(/(\d+)\s*(?:tb|gb|mb|pb)\b/i);
                    if (dsMatch) {
                        diskSize = parseInt(dsMatch[1], 10);
                    }
                }
            }

            return {
                taskId: `raid-task-${originalIdx}-${timestamp}`,
                discipline: 'computer-science-storage',
                variables: [
                    { id: 'raid_level', type: 'input', defaultValue: raidLevel, validationType: 'exact', maxPoints: 0 },
                    { id: 'disk_count', type: 'input', defaultValue: diskCount, validationType: 'exact', maxPoints: 0 },
                    { id: 'disk_size', type: 'input', defaultValue: diskSize, validationType: 'exact', maxPoints: 0 },
                    { id: 'net_capacity', type: 'formula', expression: 'raid.calculateNetCapacity(raid_level, disk_count, disk_size)', validationType: 'exact', maxPoints: 2 },
                    { id: 'fault_tolerance', type: 'formula', expression: 'raid.calculateFaultTolerance(raid_level, disk_count)', validationType: 'exact', maxPoints: 0 }
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
        const id = `custom-skill-${Date.now()}`;
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

        // 1. Save to localStorage under 'koreki_custom_skills'
        const stored = localStorage.getItem('koreki_custom_skills');
        let customSkills: Record<string, any> = {};
        if (stored) {
            try { customSkills = JSON.parse(stored); } catch (e) {}
        }
        customSkills[id] = newSkill;
        localStorage.setItem('koreki_custom_skills', JSON.stringify(customSkills));

        // 2. Sync with useDashboardStore settings
        const store = useDashboardStore.getState();
        if (store.aiSettings) {
            const updatedSettings = {
                ...store.aiSettings,
                customSkills: {
                    ...store.aiSettings.customSkills,
                    [id]: newSkill
                },
                activeSkillIds: [...(store.aiSettings.activeSkillIds || []), id]
            };
            store.setAiSettings(updatedSettings);
        }

        // 3. Update the task type to point to this new custom skill!
        if (editingGraphTaskIdx !== null) {
            const updatedTasks = [...tasksLayout];
            updatedTasks[editingGraphTaskIdx] = {
                ...updatedTasks[editingGraphTaskIdx],
                taskType: id,
                gradingGraph: graph
            };
            onTasksChange?.(updatedTasks);
        }

        // 4. Symmetrical Profile Synchronization (SaaS / Desktop Parity):
        // To make sure the skill appears checked in the Skill Center, we must also persist 
        // it into the active profile's database/localStorage activeSkillIds array.
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
                // Update editable custom profile
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
                // Active profile is read-only system profile -> Auto-provision new editable profile
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
                        // Update editable custom profile in database
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
                        // Active profile is read-only system profile -> Auto-provision new editable profile in database
                        const baseSkillIds = activeProfile ? [...activeProfile.activeSkillIds] : ["skill-consecutive-errors", "skill-math-equivalence"];
                        const newProfileName = `Mein Skill-Profil`;
                        
                        const createRes = await apiClient.post('/api/user/skill-profiles', {
                            name: newProfileName,
                            activeSkillIds: [...baseSkillIds, id],
                            customSkills: { [id]: newSkill }
                        });
                        
                        if (createRes.ok) {
                            const newProfile = await createRes.json();
                            // Set as active profile in database
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

        alert(`Skill "${name}" erfolgreich im Skill Center gespeichert und dem active Skill-Profil hinzugefügt!`);
    }, [tasksLayout, editingGraphTaskIdx, onTasksChange, settings]);

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
                                            task.taskType === 'skill-calc-raid' ||
                                            SKILL_REGISTRY[task.taskType]?.metadata?.isGraphBased ||
                                            (settings?.customSkills && settings.customSkills[task.taskType]?.isGraphBased)
                                        )
                                    );
                                    
                                    const isCustomSkill = !!(task.taskType && task.taskType.startsWith('custom-skill-'));
                                    const templateName = isCustomSkill 
                                        ? settings?.customSkills?.[task.taskType]?.name || "Vorlage"
                                        : null;

                                    const shouldSuggestGraph = !!task.suggestGraph;

                                    const graphActionNode = (
                                        <div className={cn(
                                            "flex items-center gap-1 transition-all duration-300",
                                            shouldSuggestGraph && !task.gradingGraph ? "opacity-95 scale-105" : "opacity-40 hover:opacity-100"
                                        )}>
                                            <button
                                                type="button"
                                                disabled={isLocked}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingGraphTaskIdx(originalIdx);
                                                }}
                                                title={task.gradingGraph 
                                                    ? (isCustomSkill ? `Vorlage "${templateName}" bearbeiten` : "Bewertungs-Graph bearbeiten") 
                                                    : (shouldSuggestGraph 
                                                        ? "Bewertungs-Graph erstellen oder zuweisen (KI-Empfehlung für deterministisches Ergebnis)" 
                                                        : "Bewertungs-Graph erstellen oder zuweisen")
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
                                                {shouldSuggestGraph && !task.gradingGraph && (
                                                    <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                                    </span>
                                                )}
                                            </button>
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
                        taskName={task?.name || `Aufgabe ${editingGraphTaskIdx + 1}`}
                        taskContent={content}
                        taskType={task?.taskType}
                        customSkills={settings?.customSkills}
                        settings={settings}
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
                        onRegenerateGraph={async (discipline) => {
                            if (onGenerateGraph && content && content.trim().length > 10) {
                                setGeneratingGraphForTask(editingGraphTaskIdx);
                                try {
                                    const prepTasks = [...tasksLayout];
                                    prepTasks[editingGraphTaskIdx] = {
                                        ...prepTasks[editingGraphTaskIdx],
                                        taskType: discipline === 'computer-science-storage' ? 'skill-calc-raid' : 'skill-calc-vlsm'
                                    };
                                    onTasksChange?.(prepTasks);

                                    const generatedGraph = await onGenerateGraph(editingGraphTaskIdx, content);
                                    if (generatedGraph) {
                                        const updatedTasks = [...tasksLayout];
                                        updatedTasks[editingGraphTaskIdx] = {
                                            ...updatedTasks[editingGraphTaskIdx],
                                            taskType: generatedGraph.discipline === 'computer-science-storage' ? 'skill-calc-raid' : 'skill-calc-vlsm',
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
        </Card>
    );
};
