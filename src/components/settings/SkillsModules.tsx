import React from 'react';
import { Wrench, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Download, Sparkles, BookOpen, Calculator, Settings, GraduationCap, Loader2, Layers, ChevronDown, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { parseMarkdownProfile } from '@/lib/parsers/markdown-profile-parser';
import { downloadFile } from '@/lib/file-utils';
import { SKILL_REGISTRY } from '@/prompts/skills';
import { GradingGraphModal } from '../batch/GradingGraphModal';
import { CalcTraceModal } from '../batch/CalcTraceModal';
import { cn } from '@/lib/utils';


interface SkillsSidebarProps {
    profiles: any[];
    selectedProfile: string;
    isCreatingNew: boolean;
    editingProfileId: string | null;
    editingName: string;
    onStartNew: (initialSkills?: string[], initialName?: string) => void;
    onImportParsedProfile: (parsed: any) => void;
    onSelectProfile: (p: any) => void;
    onStartRename: (e: React.MouseEvent, p: any) => void;
    onDeleteProfile: (id: string, e: React.MouseEvent) => void;
    onConfirmRename: () => void;
    setEditingName: (v: string) => void;
    setEditingProfileId: (v: string | null) => void;
    onExportProfile: (profile: any) => void;
}

export const SkillsSidebar: React.FC<SkillsSidebarProps> = ({
    profiles, 
    selectedProfile, 
    isCreatingNew, 
    editingProfileId, 
    editingName,
    onStartNew, 
    onImportParsedProfile,
    onSelectProfile, 
    onStartRename, 
    onDeleteProfile, 
    onConfirmRename, 
    onExportProfile,
    setEditingName, 
    setEditingProfileId
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();
        const parsed = parseMarkdownProfile(text);
        onImportParsedProfile(parsed);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        const text = await file.text();
        const parsed = parseMarkdownProfile(text);
        onImportParsedProfile(parsed);
    };

    return (
        <div 
            className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-200 h-full ${isDragging ? 'bg-primary/5 ring-2 ring-inset ring-primary' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary rounded-2xl m-2 pointer-events-none">
                    <div className="flex flex-col items-center text-primary font-bold gap-2">
                        <RefreshCcw size={32} className="animate-spin-slow" />
                        <p>Skill-Profil hier loslassen!</p>
                    </div>
                </div>
            )}
            <div className="p-4 border-b border-border space-y-2 relative z-10 shrink-0">
                <Button onClick={() => onStartNew()} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl shadow-md gap-2 transition-all">
                    <PlusCircle size={18} /> Neues Skill-Set
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-10 border-dashed border-primary/20 text-primary font-bold rounded-xl hover:bg-primary/5 gap-2 transition-all">
                    <RefreshCcw size={16} /> .md Skill-Set Importieren
                </Button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".md" 
                    className="hidden" 
                />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 pt-4">
                {/* Custom User Profiles */}
                {profiles.filter(p => !p.isSystem).length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xxs uppercase font-bold text-muted-foreground tracking-widest px-2">Eigene Skill-Sets</label>
                        {profiles.filter(p => !p.isSystem).map(p => (
                            <div
                                key={p.id}
                                onClick={() => onSelectProfile(p)}
                                className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfile === p.name ? 'bg-background border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-background/50'}`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0 relative pr-2">
                                    <Wrench size={18} className={selectedProfile === p.name ? 'text-primary' : 'text-muted-foreground'} />
                                    {editingProfileId === p.id ? (
                                        <Input 
                                            autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                            className="h-8 text-xs font-bold border-primary/20" onClick={(e) => e.stopPropagation()}
                                            onBlur={onConfirmRename} onKeyDown={(e) => e.key === 'Enter' && onConfirmRename()}
                                        />
                                    ) : (
                                        <span 
                                            className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfile === p.name ? 'text-primary' : 'text-foreground'} group-hover:pr-[110px]`}
                                            title={p.name}
                                        >
                                            {p.name}
                                        </span>
                                    )}

                                    {/* Unified Floating Actions - Custom Profiles */}
                                    <FloatingActions className="-top-2 -right-2" onClick={(e) => e.stopPropagation()}>
                                        {editingProfileId === p.id ? (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onConfirmRename(); }}>
                                                <Check size={14} />
                                            </Button>
                                        ) : (
                                            <>
                                                <Button variant="ghost" size="icon" title="Skill-Set kopieren" className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onStartNew(p.activeSkillIds || [], `Kopie von ${p.name}`); }}>
                                                    <PlusCircle size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Skill-Set exportieren" className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onExportProfile(p); }}>
                                                    <Download size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Umbenennen" className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors" onClick={(e) => { e.stopPropagation(); onStartRename(e, p); }}>
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Löschen" className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors" onClick={(e) => { e.stopPropagation(); onDeleteProfile(p.id, e); }}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </>
                                        )}
                                    </FloatingActions>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* System Default Presets */}
                <div className="space-y-2">
                    <label className="text-xxs uppercase font-bold text-muted-foreground tracking-widest px-2">System-Vorlagen</label>
                    {profiles.filter(p => p.isSystem).map(p => (
                        <div
                            key={p.name}
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfile === p.name ? 'bg-background border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-background/50'}`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0 relative pr-2">
                                <Wrench size={18} className={selectedProfile === p.name ? 'text-primary' : 'text-muted-foreground'} />
                                <span 
                                    className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfile === p.name ? 'text-primary' : 'text-foreground'} group-hover:pr-[60px]`}
                                    title={p.name}
                                >
                                    {p.name}
                                </span>

                                {/* Unified Floating Actions - System Profiles */}
                                <FloatingActions className="-top-2 -right-2" onClick={(e) => e.stopPropagation()}>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title="Skill-Set kopieren"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors" 
                                        onClick={(e) => { e.stopPropagation(); onStartNew(p.activeSkillIds || [], `Kopie von ${p.name}`); }}
                                    >
                                        <PlusCircle size={14} />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title="Skill-Set exportieren"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                                        onClick={(e) => { e.stopPropagation(); onExportProfile(p); }}
                                    >
                                        <Download size={14} />
                                    </Button>
                                </FloatingActions>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CATEGORIES = [
    { id: 'math-science', label: 'MINT-Fächer', icon: <Calculator size={16} className="text-primary" /> },
    { id: 'graph-skills', label: 'Graph-basierte Skills (PANG)', icon: <Layers size={16} className="text-emerald-500" /> },
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
        customSkills: Record<string, any>;
    onSaveCustomSkill: (skill: any) => void;
    onDeleteCustomSkill: (id: string) => void;
    onStartNew: (initialSkills?: string[]) => void;
    onImportParsedProfile: (parsed: any, isSingleSkill?: boolean) => void;
    onGenerateGraph?: (taskText: string, discipline?: string) => Promise<Record<string, unknown> | null>;
    onGenerateCalcTrace?: (taskText: string, userNotes?: string) => Promise<any | null>;
}
export const SkillsEditor: React.FC<SkillsEditorProps> = ({
    isCreatingNew, selectedProfile, isSystemSelected, isDirty, saving, 
    newProfileName, activeSkillIds, setActiveSkillIds,
    onSaveToDB, setNewProfileName,
    customSkills, onSaveCustomSkill, onDeleteCustomSkill,
    onStartNew, onImportParsedProfile, onGenerateGraph, onGenerateCalcTrace
}) => {
    
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
                .filter((s: any) => s.category === category.id)
                .map((s: any) => s.id);
            const categorySkillIds = [...standardCategorySkills, ...customCategorySkills];
            
            const hasActiveSkill = categorySkillIds.some(id => activeSkillIds.includes(id));
            initialExpanded[category.id] = hasActiveSkill;
        });
        setExpandedCategories(initialExpanded);
    }, [selectedProfile]);
    
    // Custom Skill Modal/Inline Editor State
    const [isEditingSkill, setIsEditingSkill] = React.useState(false);
    const [editingSkillData, setEditingSkillData] = React.useState<any>(null);
    const [isGraphModalOpen, setIsGraphModalOpen] = React.useState(false);
    const [isGeneratingGraph, setIsGeneratingGraph] = React.useState(false);
    const [isCalcTraceModalOpen, setIsCalcTraceModalOpen] = React.useState(false);
    const [isGeneratingTrace, setIsGeneratingTrace] = React.useState(false);
    const [graphGenTaskText, setGraphGenTaskText] = React.useState('');

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

    const handleEditSkillClick = (skill: any) => {
        setEditingSkillData({ ...skill });
        setGraphGenTaskText(skill.taskText || '');
        setIsEditingSkill(true);
    };

    const handleAIGraphGenerate = async () => {
        const textToGen = editingSkillData?.taskText || graphGenTaskText;
        if (!onGenerateGraph || !textToGen.trim()) return;
        setIsGeneratingGraph(true);
        try {
            const result = await onGenerateGraph(textToGen, editingSkillData?.category);
            if (result) {
                setEditingSkillData(prev => ({
                    ...prev,
                    gradingGraph: result,
                    taskText: textToGen
                }));
            }
        } catch (err) {
            console.error('Graph generation failed:', err);
        } finally {
            setIsGeneratingGraph(false);
        }
    };

    const handleAICalcTraceGenerate = async () => {
        const textToGen = editingSkillData?.taskText || graphGenTaskText;
        if (!onGenerateCalcTrace || !textToGen.trim()) return;
        setIsGeneratingTrace(true);
        try {
            const result = await onGenerateCalcTrace(textToGen);
            if (result) {
                setEditingSkillData(prev => ({
                    ...prev,
                    calcTrace: result,
                    taskText: textToGen
                }));
            }
        } catch (err) {
            console.error('CalcTrace generation failed:', err);
        } finally {
            setIsGeneratingTrace(false);
        }
    };

    const handleSaveCustomSkillClick = () => {
        if (!editingSkillData.name.trim()) {
            alert("Bitte gib einen Namen für den Skill ein.");
            return;
        }
        if (!editingSkillData.promptSnippet.trim()) {
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

        let nextIds = [...activeSkillIds];
        const skillEntry = SKILL_REGISTRY[skillId];
        const skill = skillEntry ? { ...skillEntry.metadata, promptSnippet: skillEntry.promptSnippet } : (customSkills || {})[skillId];
        
        if (!skill) return;

        if (activeSkillIds.includes(skillId)) {
            // UNCHECK
            nextIds = nextIds.filter(id => id !== skillId);
            // Also uncheck any other skills that require this specific skill!
            const allSkillsList = [
                ...Object.values(SKILL_REGISTRY).map(s => s.metadata), 
                ...Object.values(customSkills || {})
            ];
            allSkillsList.forEach(s => {
                const requires = s.requires || [];
                const reqArray = typeof requires === 'string' ? requires.split(',').map((r: string) => r.trim()) : requires;
                if (reqArray.includes(skillId)) {
                    nextIds = nextIds.filter(id => id !== s.id);
                }
            });
        } else {
            // CHECK
            nextIds.push(skillId);
            // Auto-check requirements
            const requires = skill.requires || [];
            const reqArray = typeof requires === 'string' ? requires.split(',').map((r: string) => r.trim()) : requires;
            
            reqArray.forEach((reqId: string) => {
                if (!nextIds.includes(reqId)) {
                    nextIds.push(reqId);
                }
            });
            
            // Auto-uncheck conflicting mutually-exclusive skills
            const conflicts = skill.conflictsWith || [];
            const conflictArray = typeof conflicts === 'string' ? conflicts.split(',').map((c: string) => c.trim()) : conflicts;
            
            conflictArray.forEach((conflictId: string) => {
                nextIds = nextIds.filter(id => id !== conflictId);
            });
        }
        setActiveSkillIds(nextIds);
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
                            input.onchange = async (e: any) => {
                                const file = e.target.files?.[0];
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
                        .map(s => ({ ...s.metadata, prompt: s.promptSnippet, promptSnippet: s.promptSnippet }));
                    const customCategorySkills = Object.values(customSkills || {}).filter(s => s.category === category.id);
                    const categorySkills = [...standardCategorySkills, ...customCategorySkills];
                    
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
                                                        {skill.isGraphBased && <Badge className="text-xxs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 font-bold hover:bg-emerald-100 rounded flex items-center gap-0.5">⚙️ GRAPH</Badge>}
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
                                                                <Badge key={confId} variant="outline" className="text-xxs px-2 py-0 bg-red-50 text-red-600 border-red-100 rounded-full font-bold">
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
                                                        onClick={() => onStartNew([skill.id])}
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
                                    onChange={e => setEditingSkillData({ ...editingSkillData, category: e.target.value as any })}
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
                                                    {isGeneratingGraph ? 'Generiere...' : 'KI-Graph generieren'}
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
                                            {editingSkillData.gradingGraph.variables.map((v: any) => (
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
                                                    {isGeneratingTrace ? 'Generiere...' : 'KI-Kette generieren'}
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
                                    {editingSkillData.calcTrace?.steps && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {editingSkillData.calcTrace.steps.map((s: any) => (
                                                <Badge key={s.id} variant="outline" className="text-xs font-mono px-2 py-0.5 bg-background border-border text-muted-foreground rounded-md">
                                                    {s.id}: {s.label} ({s.type === 'given' ? 'gegeben' : s.formula})
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

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
                                onClick={() => { setIsEditingSkill(false); setEditingSkillData(null); }}
                                className="h-10 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
                            >
                                Abbrechen
                            </Button>
                            <Button 
                                onClick={handleSaveCustomSkillClick}
                                className="h-10 rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md transition-all"
                            >
                                Speichern
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {isGraphModalOpen && (
                <GradingGraphModal
                    isOpen={isGraphModalOpen}
                    onClose={() => setIsGraphModalOpen(false)}
                    initialGraph={editingSkillData?.gradingGraph}
                    taskName={editingSkillData?.name || "Benutzerdefinierter Skill"}
                    taskContent={editingSkillData?.taskText || editingSkillData?.description || editingSkillData?.name || ""}
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
                    taskContent={editingSkillData?.taskText || editingSkillData?.description || editingSkillData?.name || ""}
                    onSave={(updatedTrace) => {
                        setEditingSkillData({
                            ...editingSkillData,
                            calcTrace: updatedTrace
                        });
                    }}
                />
            )}
        </div>
    );
};
