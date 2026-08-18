import React from 'react';
import type { GradingGraph } from '../../lib/grading/types';
import type { ParsedProfile } from '../../lib/parsers/markdown-profile-parser';
import type { TargetGoal, CalcTraceTemplate } from '../../lib/grading/calc-trace-types';
import { PlusCircle, Pencil, Trash2, RefreshCcw, Download, Sparkles, BookOpen, Calculator, Settings, GraduationCap, Loader2, Layers, ChevronDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { parseMarkdownProfile } from '@/lib/parsers/markdown-profile-parser';
import { downloadFile } from '@/lib/file-utils';
import type { CustomSkillDefinition, GespeicherterSkill } from '@/types';
import { applySkillToggle } from '@/lib/skills/skill-selection';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { SkillEditorPanel } from './SkillEditorPanel';
import { useSkillGeneration } from '@/hooks/useSkillGeneration';
import { CalcTraceModal } from '../batch/CalcTraceModal';
import { isLocalInstance } from '@/lib/env-context';
import { useAuth } from '@/hooks/useAuth';



const CATEGORIES = [
    { id: 'math-science', label: 'MINT-Fächer', icon: <Calculator size={16} className="text-primary" /> },
    { id: 'graph-skills', label: 'Graph-basierte Skills (PANG)', icon: <Layers size={16} className="text-success" /> },
    { id: 'calc-skills', label: 'Rechenketten-Skills (CalcTrace)', icon: <Layers size={16} className="text-primary" /> },
    { id: 'languages', label: 'Sprachen & Textästhetik', icon: <BookOpen size={16} className="text-primary" /> },
    { id: 'standards', label: 'Korrekturzeichen & Bundesländer', icon: <Settings size={16} className="text-primary" /> },
    { id: 'feedback', label: 'Pädagogisches Feedback', icon: <GraduationCap size={16} className="text-primary" /> }
] as const;

interface SkillsEditorProps {
    isCreatingNew: boolean;
    selectedProfile: string;
    isSystemSelected: boolean;
    isDirty: boolean;
    saving: boolean;
    newProfileName: string;
    activeSkillIds: string[];
    setActiveSkillIds: (ids: string[]) => void;
    onSaveToDB: () => void;
    setNewProfileName: (v: string) => void;
        customSkills: Record<string, CustomSkillDefinition>;
    onSaveCustomSkill: (skill: GespeicherterSkill) => void;
    onDeleteCustomSkill: (id: string) => void;
    onStartNew: (initialSkills?: string[]) => void;
    onImportParsedProfile: (parsed: ParsedProfile, isSingleSkill?: boolean) => void;
    onGenerateGraph?: (taskText: string, discipline?: string) => Promise<GradingGraph | null>;
    onGenerateCalcTrace?: (taskText: string, userNotes?: string) => Promise<TargetGoal | null>;
}
/**
 * Ein Skill, wie ihn die Auswahlliste braucht.
 *
 * Die Liste mischt zwei Herkuenfte: Skills aus der Registry (dort sind `id`
 * und `name` zugesichert) und selbst angelegte (dort optional, weil sie beim
 * Anlegen erst entstehen). Diese Sicht macht beide Felder verbindlich, sonst
 * muesste jeder Feldzugriff in der Darstellung einzeln geprueft werden.
 *
 * Bewusst ausgeschrieben statt `Omit<CustomSkillDefinition, ...>`: `Omit` auf
 * einem Typ mit Index-Signatur laesst nur die Signatur uebrig und verwirft die
 * benannten Felder — jeder Zugriff waere danach `unknown`.
 */
interface SkillListenEintrag {
    id: string;
    name: string;
    description?: string;
    category?: string;
    prompt?: string;
    promptSnippet?: string;
    isCustom?: boolean;
    isCalcTrace?: boolean;
    isGraphBased?: boolean;
    requires?: string | string[];
    conflictsWith?: string | string[];
    taskText?: string;
    calcTrace?: CalcTraceTemplate | TargetGoal;
    gradingGraph?: GradingGraph;
    targetGoal?: TargetGoal;
}

export const SkillsEditor: React.FC<SkillsEditorProps> = ({
    isCreatingNew, selectedProfile, isSystemSelected, isDirty, saving, 
    newProfileName, activeSkillIds, setActiveSkillIds,
    onSaveToDB, setNewProfileName,
    customSkills, onSaveCustomSkill, onDeleteCustomSkill,
    onStartNew, onImportParsedProfile, onGenerateGraph, onGenerateCalcTrace
}) => {

    // Nur im SaaS-Betrieb kosten KI-Aktionen Credits (siehe GradingGraphModal).
    const { userData } = useAuth();
    const showsCreditCost = !isLocalInstance() && (userData?.appMode === 'STANDARD' || userData?.appMode === 'TRIAL');

    // Collapsible Categories State
    const [expandedCategories, setExpandedCategories] = React.useState<Record<string, boolean>>({});

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    // Smart-Collapse: Auto-expand categories with active skills on profile switch
    React.useEffect(() => {
        const initialExpanded: Record<string, boolean> = {};
        CATEGORIES.forEach(category => {
            const standardCategorySkills = Object.values(SKILL_REGISTRY)
                .filter(s => {
                    if (category.id === 'graph-skills') {
                        return !!s.metadata.isGraphBased || s.metadata.category === 'graph-skills' || s.metadata.id === 'skill-calc-vlsm';
                    }
                    if (category.id === 'calc-skills') {
                        return !!s.metadata.isCalcTrace || s.metadata.category === 'calc-skills';
                    }
                    if (category.id === 'math-science') {
                        return s.metadata.category === 'math-science' && !s.metadata.isGraphBased && !s.metadata.isCalcTrace && s.metadata.id !== 'skill-calc-vlsm';
                    }
                    return s.metadata.category === category.id;
                })
                .map(s => s.metadata.id);
            const customCategorySkills = Object.values(customSkills || {})
                .filter(s => s.category === category.id)
                .map(s => s.id)
                .filter((id): id is string => !!id);
            const categorySkillIds = [...standardCategorySkills, ...customCategorySkills];
            
            const hasActiveSkill = categorySkillIds.some(id => activeSkillIds.includes(id));
            initialExpanded[category.id] = hasActiveSkill;
        });
        setExpandedCategories(initialExpanded);
    }, [selectedProfile]);
    
    // Custom Skill Modal/Inline Editor State
    const [isEditingSkill, setIsEditingSkill] = React.useState(false);
    const [editingSkillData, setEditingSkillData] = React.useState<CustomSkillDefinition | null>(null);
    const [isGraphModalOpen, setIsGraphModalOpen] = React.useState(false);
    const [isCalcTraceModalOpen, setIsCalcTraceModalOpen] = React.useState(false);

    const {
        isGeneratingGraph, isGeneratingTrace, setGraphGenTaskText,
        handleAIGraphGenerate, handleAICalcTraceGenerate
    } = useSkillGeneration({ editingSkillData, setEditingSkillData, onGenerateGraph, onGenerateCalcTrace });

    const handleCreateSkillClick = () => {
        setEditingSkillData({
            name: '',
            category: 'math-science',
            description: '',
            promptSnippet: '',
            isCustom: true,
            taskText: ''
        });
        setGraphGenTaskText('');
        setIsEditingSkill(true);
    };

    const handleEditSkillClick = (skill: SkillListenEintrag) => {
        setEditingSkillData({ ...skill });
        setGraphGenTaskText(skill.taskText || '');
        setIsEditingSkill(true);
    };

    const handleCopySkillClick = (skill: SkillListenEintrag) => {
        setEditingSkillData({
            name: `Kopie von ${skill.name}`,
            category: skill.category || 'math-science',
            description: skill.description || '',
            promptSnippet: skill.promptSnippet || skill.prompt || '',
            isCustom: true,
            taskText: skill.taskText || '',
            gradingGraph: skill.gradingGraph,
            calcTrace: skill.calcTrace,
            isGraphBased: skill.isGraphBased,
            isCalcTrace: skill.isCalcTrace
        });
        setGraphGenTaskText(skill.taskText || '');
        setIsEditingSkill(true);
    };

    const handleSaveCustomSkillClick = () => {
        if (!editingSkillData?.name?.trim()) { // `?.` verengt auch die Basis auf non-null
            alert("Bitte gib einen Namen für den Skill ein.");
            return;
        }
        if (!editingSkillData.promptSnippet?.trim()) {
            alert("Bitte gib die KI-Anweisung (Prompt Snippet) ein.");
            return;
        }

        const skillToSave = {
            ...editingSkillData,
            id: editingSkillData.id || `custom-skill-${Date.now()}`
        };

        onSaveCustomSkill(skillToSave);
        setIsEditingSkill(false);
        setEditingSkillData(null);

        if (isSystemSelected) {
            // Automatically clone the profile!
            const newSkills = [...activeSkillIds, skillToSave.id];
            onStartNew(newSkills);
            setNewProfileName(`Kopie von ${selectedProfile}`);
            alert(`Ein neues, anpassbares Skill-Set "Kopie von ${selectedProfile}" wurde erstellt und dein neuer Skill "${skillToSave.name}" wurde darin aktiviert!`);
        } else {
            // Auto-check/enable newly created skill
            if (!editingSkillData.id && !activeSkillIds.includes(skillToSave.id)) {
                setActiveSkillIds([...activeSkillIds, skillToSave.id]);
            }
        }
    };

    // Smart interactive dependency resolution
    const handleToggleSkill = (skillId: string) => {
        if (isSystemSelected && !isCreatingNew) return; // Prevent direct system profile modifications

        // Registry-Metadaten und eigene Skills bilden gemeinsam die Grundlage
        // fuer Voraussetzungen und Konflikte.
        const allSkills = [
            ...Object.values(SKILL_REGISTRY).map(s => s.metadata),
            ...Object.values(customSkills || {})
        ];

        setActiveSkillIds(applySkillToggle({ skillId, activeSkillIds, allSkills }));
    };

    const handleExport = async () => {
        const safeName = isCreatingNew ? newProfileName : selectedProfile;
        const skillsYamlArray = JSON.stringify(activeSkillIds);
        
        const markdown = `---
name: "${safeName}"
description: "Exportierte Koreki AI-Grading Skills"
version: "1.0.0"
skills: ${skillsYamlArray}
---

# Modular AI Grading Skills
Dieses Dokument enthält die deklarierten KI-Bewertungs-Skills für die automatisierte Koreki-Prüfungskorrektur.
`;
        const filename = `${safeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_skills.md`;
        try {
            await downloadFile(markdown, filename, 'text/markdown;charset=utf-8');
        } catch (error) {
            console.error('Fehler beim Exportieren des Skill-Profils:', error);
            alert('Export fehlgeschlagen.');
        }
    };



    return (
        <div className="flex-1 flex flex-col space-y-4 sm:space-y-6 overflow-y-auto p-4 sm:p-8 relative">
            {/* Upper Info Section */}
            <div className="flex justify-between items-end gap-6 shrink-0">
                <div className="flex-1 space-y-2">
                    <label className="text-xxs font-bold text-muted-foreground uppercase tracking-widest">
                        {isCreatingNew ? 'Name für neues Skill-Set' : 'Gewähltes Skill-Set'}
                    </label>
                    {isCreatingNew ? (
                        <Input
                            autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                            placeholder="z.B. Bayern Realschule Physik" className="text-lg sm:text-xl font-black border-primary/20 h-12 sm:h-14 rounded-xl sm:rounded-2xl"
                        />
                    ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-3">
                                {selectedProfile}
                            </h3>
                            {isSystemSelected && <Badge variant="outline" className="text-xxs bg-muted text-muted-foreground px-3 py-1 rounded-full border-transparent font-bold">SYSTEM PRESET</Badge>}
                        </div>
                    )}
                </div>
                {isDirty && !isCreatingNew && !isSystemSelected && (
                    <div className="flex items-center gap-2 text-warning animate-pulse pb-2 shrink-0">
                        <RefreshCcw size={16} />
                        <span className="text-xxs font-bold uppercase tracking-widest">Ungespeichertes</span>
                    </div>
                )}
            </div>

            {/* Middle Controls */}
            <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
                <span className="text-xs sm:text-sm font-black text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" /> Skills konfigurieren
                </span>
                <div className="flex gap-2 items-center">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.md';
                            input.onchange = async (e: Event) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (!file) return;
                                const text = await file.text();
                                const parsed = parseMarkdownProfile(text);
                                onImportParsedProfile(parsed, true);
                            };
                            input.click();
                        }}
                        className="h-8 sm:h-9 rounded-full text-xxs whitespace-nowrap font-bold uppercase border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 gap-1.5 px-3 sm:px-4 transition-all"
                        title="Einzelnen Skill importieren (.md)"
                    >
                        <RefreshCcw size={14} /> Skill Import
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCreateSkillClick}
                        className="h-8 sm:h-9 rounded-full text-xxs whitespace-nowrap font-bold uppercase border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 gap-2 px-3 sm:px-4 transition-all"
                    >
                        <PlusCircle size={14} /> Skill hinzufügen
                    </Button>
                    <Button 
                        disabled={saving || isSystemSelected || !isDirty} 
                        onClick={onSaveToDB} 
                        title={isSystemSelected ? "System-Vorlagen können nicht direkt bearbeitet werden. Erstelle eine Kopie." : ""}
                        className="h-9 px-4 text-xxs whitespace-nowrap font-bold uppercase rounded-full flex items-center gap-1.5 shadow-md transition-all border-0"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                            <Save size={14} />
                        )}
                        Speichern
                    </Button>
                </div>
            </div>

            {/* Grid layout of categories and glassmorphic cards */}
            <div className="flex-1 space-y-8 min-h-0">
                {CATEGORIES.map(category => {
                    const standardCategorySkills = Object.values(SKILL_REGISTRY)
                        .filter(s => {
                            if (category.id === 'graph-skills') {
                                return !!s.metadata.isGraphBased || s.metadata.category === 'graph-skills' || s.metadata.id === 'skill-calc-vlsm';
                            }
                            if (category.id === 'calc-skills') {
                                return !!s.metadata.isCalcTrace || s.metadata.category === 'calc-skills';
                            }
                            if (category.id === 'math-science') {
                                return s.metadata.category === 'math-science' && !s.metadata.isGraphBased && !s.metadata.isCalcTrace && s.metadata.id !== 'skill-calc-vlsm';
                            }
                            return s.metadata.category === category.id;
                        })
                        .map((s): SkillListenEintrag => ({
                            ...s.metadata,
                            prompt: s.promptSnippet,
                            promptSnippet: s.promptSnippet
                        }));

                    // Ein eigener Skill ohne id oder name ist ein halb angelegter
                    // Entwurf — er gehoert nicht in die Auswahlliste.
                    const customCategorySkills: SkillListenEintrag[] = Object.values(customSkills || {})
                        .filter(s => s.category === category.id && !!s.id && !!s.name)
                        .map(s => ({ ...s, id: s.id!, name: s.name! }));

                    const categorySkills: SkillListenEintrag[] = [...standardCategorySkills, ...customCategorySkills];
                    
                    if (categorySkills.length === 0) return null;

                    const isExpanded = !!expandedCategories[category.id];
                    const activeCount = categorySkills.filter(skill => activeSkillIds.includes(skill.id)).length;

                    return (
                        <div key={category.id} className="space-y-3">
                            <button
                                type="button"
                                onClick={() => toggleCategory(category.id)}
                                className="flex items-center justify-between w-full text-left py-2 px-3 hover:bg-muted/50 rounded-xl transition-all duration-200 group/header"
                            >
                                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground tracking-wider uppercase">
                                    {category.icon}
                                    <span>{category.label}</span>
                                    <Badge className="bg-muted group-hover/header:bg-muted/80 text-muted-foreground font-bold px-1.5 py-0.5 text-xxs rounded-full transition-all">
                                        {activeCount} / {categorySkills.length}
                                    </Badge>
                                </div>
                                <div className="text-muted-foreground group-hover/header:text-foreground transition-all">
                                    <ChevronDown size={16} className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            
                            {isExpanded && (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pl-3 animate-fade-down duration-200">
                                    {categorySkills.map(skill => {
                                        const isChecked = activeSkillIds.includes(skill.id);
                                        const isDisabled = isSystemSelected && !skill.isCustom;

                                        return (
                                            <div 
                                                key={skill.id}
                                                onClick={() => {
                                                    if (isDisabled) return;
                                                    if (isChecked) {
                                                        setActiveSkillIds(activeSkillIds.filter(id => id !== skill.id));
                                                    } else {
                                                        setActiveSkillIds([...activeSkillIds, skill.id]);
                                                    }
                                                }}
                                                className={`p-5 rounded-3xl border-2 transition-all flex items-start gap-4 select-none relative group ${isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${isChecked ? 'bg-gradient-to-br from-primary/5 to-primary/3 border-primary/20 shadow-md shadow-primary/5 ring-1 ring-primary/10' : 'bg-muted/10 border-border hover:border-border/80 hover:bg-muted/20'}`}
                                            >
                                                <div className="pt-0.5 shrink-0">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        disabled={isDisabled}
                                                        onChange={() => {}} // Controlled click via parent div
                                                        className={`w-5 h-5 text-primary rounded-md border-border focus:ring-primary focus:ring-offset-background cursor-pointer transition-all ${isDisabled ? 'cursor-not-allowed' : ''}`}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={`text-sm font-black tracking-tight leading-tight ${isChecked ? 'text-foreground' : 'text-foreground'}`}>
                                                            {skill.name}
                                                        </h4>
                                                        {skill.isCustom && <Badge className="text-xxs bg-primary/10 text-primary px-1.5 py-0.5 font-bold hover:bg-primary/10 rounded">EIGEN</Badge>}
                                                        {/* Intentional semantic type colors: emerald=GRAPH-Engine, primary=CalcTrace-Engine — must remain visually distinct from each other and from primary */}
                                                        {skill.isGraphBased && <Badge className="text-xxs bg-success/10 text-success px-1.5 py-0.5 font-bold hover:bg-success/10 rounded flex items-center gap-0.5">⚙️ GRAPH</Badge>}
                                                        {skill.isCalcTrace && <Badge className="text-xxs bg-primary/10 text-primary px-1.5 py-0.5 font-bold hover:bg-primary/10 rounded flex items-center gap-0.5">⚡ CALC</Badge>}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                                                        {skill.description}
                                                    </p>
                                                    {/* Meta details if any */}
                                                    {(skill.requires || skill.conflictsWith) && (
                                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                                            {/* Intentional semantic badge colors: amber=dependency-warning, red=conflict/exclusion */}
                                                            {skill.requires && (typeof skill.requires === 'string' ? skill.requires.split(',') : skill.requires).map((reqId: string) => (
                                                                <Badge key={reqId} variant="outline" className="text-xxs px-2 py-0 bg-warning/10 text-warning border-warning/20 rounded-full font-bold">
                                                                    Benötigt: {SKILL_REGISTRY[reqId.trim()]?.metadata.name || customSkills?.[reqId.trim()]?.name || reqId}
                                                                </Badge>
                                                            ))}
                                                            {skill.conflictsWith && (typeof skill.conflictsWith === 'string' ? skill.conflictsWith.split(',') : skill.conflictsWith).map((confId: string) => (
                                                                <Badge key={confId} variant="outline" className="text-xxs px-2 py-0 bg-destructive/5 text-destructive border-destructive/20 rounded-full font-bold">
                                                                    Schließt aus: {SKILL_REGISTRY[confId.trim()]?.metadata.name || customSkills?.[confId.trim()]?.name || confId}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Unified Floating Actions - Skill Cards */}
                                                <FloatingActions className="-top-2 -right-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Skill kopieren"
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted/80" 
                                                        onClick={(e) => { e.stopPropagation(); handleCopySkillClick(skill); }}
                                                    >
                                                        <PlusCircle size={14} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Skill als .md exportieren"
                                                        className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted/80" 
                                                        onClick={() => {
                                                            const markdown = `---
name: "${skill.name}"
description: "${skill.description || ''}"
category: "${skill.category || 'math-science'}"
type: "skill"
version: "1.0.0"
---

${skill.prompt || ''}`;
                                                            downloadFile(markdown, `${skill.name.toLowerCase().replace(/\s+/g, '_')}.md`, 'text/markdown');
                                                        }}
                                                    >
                                                        <Download size={14} />
                                                    </Button>

                                                    {skill.isCustom && (
                                                        <>
                                                            <Button variant="ghost" size="icon" title="Bearbeiten" className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted/80" onClick={() => handleEditSkillClick(skill)}>
                                                                <Pencil size={14} />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Löschen" className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-muted/80" onClick={() => { if (confirm(`Möchtest du den Skill "${skill.name}" wirklich löschen?`)) onDeleteCustomSkill(skill.id); }}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        </>
                                                    )}
                                                </FloatingActions>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Inline Dialog Overlay for Creating/Editing Custom Skill */}
            {isEditingSkill && editingSkillData && (
                <SkillEditorPanel
                    editingSkillData={editingSkillData}
                    setEditingSkillData={setEditingSkillData}
                    onSave={handleSaveCustomSkillClick}
                    onClose={() => setIsEditingSkill(false)}
                    isGeneratingGraph={isGeneratingGraph}
                    isGeneratingTrace={isGeneratingTrace}
                    setGraphGenTaskText={setGraphGenTaskText}
                    handleAIGraphGenerate={handleAIGraphGenerate}
                    handleAICalcTraceGenerate={handleAICalcTraceGenerate}
                    onGenerateGraph={onGenerateGraph}
                    onGenerateCalcTrace={onGenerateCalcTrace}
                    showsCreditCost={showsCreditCost}
                    appMode={userData?.appMode === 'UNSET' ? undefined : userData?.appMode}
                    isGraphModalOpen={isGraphModalOpen}
                    setIsGraphModalOpen={setIsGraphModalOpen}
                    isCalcTraceModalOpen={isCalcTraceModalOpen}
                    setIsCalcTraceModalOpen={setIsCalcTraceModalOpen}
                />
            )}
        </div>
    );
};
