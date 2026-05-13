import React from 'react';
import { Wrench, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Download, Sparkles, BookOpen, Calculator, Settings, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { parseMarkdownProfile } from '@/lib/parsers/markdown-profile-parser';
import { downloadFile } from '@/lib/file-utils';
import { STANDARD_SKILLS, GradingSkill } from '@/lib/ai/standard-skills';

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
            className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-200 h-full ${isDragging ? 'bg-indigo-50/80 ring-2 ring-inset ring-indigo-500' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-50/80 backdrop-blur-sm border-2 border-dashed border-indigo-500 rounded-2xl m-2 pointer-events-none">
                    <div className="flex flex-col items-center text-indigo-600 font-bold gap-2">
                        <RefreshCcw size={32} className="animate-spin-slow" />
                        <p>Skill-Profil hier loslassen!</p>
                    </div>
                </div>
            )}
            <div className="p-4 border-b border-slate-100 space-y-2 relative z-10 shrink-0">
                <Button onClick={() => onStartNew()} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md gap-2 transition-all">
                    <PlusCircle size={18} /> Neues Skill-Set
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-10 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 gap-2 transition-all">
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
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Eigene Skill-Sets</label>
                        {profiles.filter(p => !p.isSystem).map(p => (
                            <div
                                key={p.id}
                                onClick={() => onSelectProfile(p)}
                                className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0 relative pr-2">
                                    <Wrench size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                                    {editingProfileId === p.id ? (
                                        <Input 
                                            autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                            className="h-8 text-xs font-bold border-indigo-200" onClick={(e) => e.stopPropagation()}
                                            onBlur={onConfirmRename} onKeyDown={(e) => e.key === 'Enter' && onConfirmRename()}
                                        />
                                    ) : (
                                        <span 
                                            className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'} group-hover:pr-[110px]`}
                                            title={p.name}
                                        >
                                            {p.name}
                                        </span>
                                    )}

                                    {/* Unified Floating Actions - Custom Profiles */}
                                    <FloatingActions className="-top-2 -right-2">
                                        {editingProfileId === p.id ? (
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600" onClick={(e) => { e.stopPropagation(); onConfirmRename(); }}>
                                                <Check size={14} />
                                            </Button>
                                        ) : (
                                            <>
                                                <Button variant="ghost" size="icon" title="Skill-Set kopieren" className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors" onClick={(e) => { e.stopPropagation(); onStartNew(p.activeSkillIds || [], `Kopie von ${p.name}`); }}>
                                                    <PlusCircle size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Skill-Set exportieren" className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors" onClick={(e) => { e.stopPropagation(); onExportProfile(p); }}>
                                                    <Download size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Umbenennen" className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors" onClick={(e) => onStartRename(e, p)}>
                                                    <Pencil size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" title="Löschen" className="h-7 w-7 text-slate-600 hover:text-red-500 transition-colors" onClick={(e) => onDeleteProfile(p.id, e)}>
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
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">System-Vorlagen</label>
                    {profiles.filter(p => p.isSystem).map(p => (
                        <div
                            key={p.name}
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0 relative pr-2">
                                <Wrench size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                                <span 
                                    className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'} group-hover:pr-[60px]`}
                                    title={p.name}
                                >
                                    {p.name}
                                </span>

                                {/* Unified Floating Actions - System Profiles */}
                                <FloatingActions className="-top-2 -right-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title="Skill-Set kopieren"
                                        className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors" 
                                        onClick={(e) => { e.stopPropagation(); onStartNew(p.activeSkillIds || [], `Kopie von ${p.name}`); }}
                                    >
                                        <PlusCircle size={14} />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title="Skill-Set exportieren"
                                        className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors"
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
}

export const SkillsEditor: React.FC<SkillsEditorProps> = ({
    isCreatingNew, selectedProfile, isSystemSelected, isDirty, saving, 
    newProfileName, activeSkillIds, setActiveSkillIds,
    onSaveToDB, setNewProfileName,
    customSkills, onSaveCustomSkill, onDeleteCustomSkill,
    onStartNew, onImportParsedProfile
}) => {
    
    // Custom Skill Modal/Inline Editor State
    const [isEditingSkill, setIsEditingSkill] = React.useState(false);
    const [editingSkillData, setEditingSkillData] = React.useState<any>(null);

    const handleCreateSkillClick = () => {
        setEditingSkillData({
            name: '',
            category: 'math-science',
            description: '',
            promptSnippet: '',
            isCustom: true
        });
        setIsEditingSkill(true);
    };

    const handleEditSkillClick = (skill: any) => {
        setEditingSkillData({ ...skill });
        setIsEditingSkill(true);
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
        const skill = STANDARD_SKILLS[skillId] || customSkills[skillId];
        if (!skill) return;

        if (activeSkillIds.includes(skillId)) {
            // UNCHECK
            nextIds = nextIds.filter(id => id !== skillId);
            // Also uncheck any other skills that require this specific skill!
            const allSkillsList = [...Object.values(STANDARD_SKILLS), ...Object.values(customSkills)];
            allSkillsList.forEach(s => {
                if (s.requires?.includes(skillId)) {
                    nextIds = nextIds.filter(id => id !== s.id);
                }
            });
        } else {
            // CHECK
            nextIds.push(skillId);
            // Auto-check requirements
            if (skill.requires) {
                skill.requires.forEach(reqId => {
                    if (!nextIds.includes(reqId)) {
                        nextIds.push(reqId);
                    }
                });
            }
            // Auto-uncheck conflicting mutually-exclusive skills
            if (skill.conflictsWith) {
                skill.conflictsWith.forEach(conflictId => {
                    nextIds = nextIds.filter(id => id !== conflictId);
                });
            }
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

    // Category mappings
    const categories = [
        { id: 'math-science', label: 'MINT-Fächer', icon: <Calculator size={16} className="text-indigo-500" /> },
        { id: 'languages', label: 'Sprachen & Textästhetik', icon: <BookOpen size={16} className="text-blue-500" /> },
        { id: 'standards', label: 'Korrekturzeichen & Bundesländer', icon: <Settings size={16} className="text-indigo-600" /> },
        { id: 'feedback', label: 'Pädagogisches Feedback', icon: <GraduationCap size={16} className="text-indigo-500" /> }
    ] as const;

    return (
        <div className="flex-1 flex flex-col space-y-4 sm:space-y-6 overflow-y-auto p-4 sm:p-8 relative">
            {/* Upper Info Section */}
            <div className="flex justify-between items-end gap-6 shrink-0">
                <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {isCreatingNew ? 'Name für neues Skill-Set' : 'Gewähltes Skill-Set'}
                    </label>
                    {isCreatingNew ? (
                        <Input
                            autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                            placeholder="z.B. Bayern Realschule Physik" className="text-lg sm:text-xl font-black border-indigo-200 h-12 sm:h-14 rounded-xl sm:rounded-2xl"
                        />
                    ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                                {selectedProfile}
                            </h3>
                            {isSystemSelected && <Badge variant="outline" className="text-[7px] sm:text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full border-transparent font-black">SYSTEM PRESET</Badge>}
                        </div>
                    )}
                </div>
                {isDirty && !isCreatingNew && !isSystemSelected && (
                    <div className="flex items-center gap-2 text-amber-500 animate-pulse pb-2 shrink-0">
                        <RefreshCcw size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ungespeichertes</span>
                    </div>
                )}
            </div>

            {/* Middle Controls */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                <span className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" /> Skills konfigurieren
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
                        className="h-8 sm:h-9 rounded-full text-[10px] font-black uppercase border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 gap-1.5 px-3 sm:px-4 transition-all"
                        title="Einzelnen Skill importieren (.md)"
                    >
                        <RefreshCcw size={14} /> Skill Import
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCreateSkillClick}
                        className="h-8 sm:h-9 rounded-full text-[10px] font-black uppercase border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 gap-2 px-3 sm:px-4 transition-all"
                    >
                        <PlusCircle size={14} /> Skill hinzufügen
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={saving || (isSystemSelected && !isDirty)} 
                        onClick={onSaveToDB} 
                        title={isSystemSelected ? "System-Vorlagen können nicht direkt bearbeitet werden. Erstelle eine Kopie." : ""}
                        className={`h-8 sm:h-9 rounded-full text-[10px] font-black uppercase gap-2 px-3 sm:px-4 transition-all ${isDirty && !isSystemSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-600 animate-pulse font-bold' : 'border-slate-100 text-slate-300'}`}
                    >
                        <Check size={14} /> Speichern
                    </Button>
                </div>
            </div>

            {/* Grid layout of categories and glassmorphic cards */}
            <div className="flex-1 space-y-8 min-h-0">
                {categories.map(category => {
                    const standardCategorySkills = Object.values(STANDARD_SKILLS).filter(s => s.category === category.id);
                    const customCategorySkills = Object.values(customSkills).filter(s => s.category === category.id);
                    const categorySkills = [...standardCategorySkills, ...customCategorySkills];
                    
                    if (categorySkills.length === 0) return null;

                    return (
                        <div key={category.id} className="space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black text-slate-500 tracking-wider uppercase">
                                {category.icon}
                                <span>{category.label}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categorySkills.map(skill => {
                                    const isChecked = activeSkillIds.includes(skill.id);
                                    const isDisabled = isSystemSelected && !isCreatingNew;

                                    return (
                                        <div 
                                            key={skill.id}
                                            onClick={() => !isDisabled && handleToggleSkill(skill.id)}
                                            className={`p-5 rounded-3xl border-2 transition-all flex items-start gap-4 select-none relative group ${isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${isChecked ? 'bg-gradient-to-br from-indigo-50/40 to-blue-50/10 border-indigo-200/80 shadow-md shadow-indigo-50/20 ring-1 ring-indigo-500/10' : 'bg-slate-50/20 border-slate-100 hover:border-slate-200/80 hover:bg-slate-50/30'}`}
                                        >
                                            <div className="pt-0.5 shrink-0">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked}
                                                    disabled={isDisabled}
                                                    onChange={() => {}} // Controlled click via parent div
                                                    className={`w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 focus:ring-offset-slate-50 cursor-pointer transition-all ${isDisabled ? 'cursor-not-allowed' : ''}`}
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`text-sm font-black tracking-tight leading-tight ${isChecked ? 'text-indigo-950' : 'text-slate-800'}`}>
                                                        {skill.name}
                                                    </h4>
                                                    {skill.isCustom && <Badge className="text-[7px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 font-bold hover:bg-indigo-100 rounded">EIGEN</Badge>}
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                    {skill.description}
                                                </p>
                                                {/* Meta details if any */}
                                                {(skill.requires || skill.conflictsWith) && (
                                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                                        {skill.requires?.map(reqId => (
                                                            <Badge key={reqId} variant="outline" className="text-[8px] px-2 py-0 bg-amber-50 text-amber-700 border-amber-100 rounded-full font-bold">
                                                                Benötigt: {STANDARD_SKILLS[reqId]?.name || customSkills[reqId]?.name || reqId}
                                                            </Badge>
                                                        ))}
                                                        {skill.conflictsWith?.map(confId => (
                                                            <Badge key={confId} variant="outline" className="text-[8px] px-2 py-0 bg-red-50 text-red-600 border-red-100 rounded-full font-bold">
                                                                Schließt aus: {STANDARD_SKILLS[confId]?.name || customSkills[confId]?.name || confId}
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
                                                    className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100/80" 
                                                    onClick={() => onStartNew([skill.id])}
                                                >
                                                    <PlusCircle size={14} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    title="Skill als .md exportieren"
                                                    className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100/80" 
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
                                                        <Button variant="ghost" size="icon" title="Bearbeiten" className="h-7 w-7 text-slate-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100/80" onClick={() => handleEditSkillClick(skill)}>
                                                            <Pencil size={14} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" title="Löschen" className="h-7 w-7 text-slate-600 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100/80" onClick={() => { if (confirm(`Möchtest du den Skill "${skill.name}" wirklich löschen?`)) onDeleteCustomSkill(skill.id); }}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </>
                                                )}
                                            </FloatingActions>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Inline Dialog Overlay for Creating/Editing Custom Skill */}
            {isEditingSkill && editingSkillData && (
                <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-xl rounded-[2.2rem] shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 flex flex-col max-h-[90vh] overflow-hidden animate-fade-in text-slate-800">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                                <Sparkles className="text-indigo-500 animate-pulse" size={20} />
                                {editingSkillData.id ? 'Eigenen Skill bearbeiten' : 'Eigenen Skill erstellen'}
                            </h3>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name des Skills</label>
                                <Input 
                                    value={editingSkillData.name}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, name: e.target.value })}
                                    placeholder="z.B. Folgefehler-Kompensation Physik"
                                    className="h-11 rounded-xl border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategorie</label>
                                <select
                                    value={editingSkillData.category}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, category: e.target.value as any })}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white cursor-pointer"
                                >
                                    <option value="math-science">MINT-Fächer</option>
                                    <option value="languages">Sprachen & Textästhetik</option>
                                    <option value="standards">Korrekturzeichen & Bundesländer</option>
                                    <option value="feedback">Pädagogisches Feedback</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kurzbeschreibung</label>
                                <textarea 
                                    value={editingSkillData.description}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, description: e.target.value })}
                                    placeholder="Beschreibe kurz, worauf die KI achten soll und in welchem Fach."
                                    rows={2}
                                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KI-Anweisung (Prompt Snippet)</label>
                                <textarea 
                                    value={editingSkillData.promptSnippet}
                                    onChange={e => setEditingSkillData({ ...editingSkillData, promptSnippet: e.target.value })}
                                    placeholder="Gib hier die genaue systemische Korrektur-Anweisung für das LLM an. Beispiel:&#10;FOLGEFEHLER BEI BERECHNUNGEN:&#10;- Wenn der Schüler ein falsches Zwischenergebnis verwendet, aber die darauffolgenden Rechenschritte mathematisch korrekt ausführt, ziehe nur einmalig für den ersten Fehler Punkte ab."
                                    rows={6}
                                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50/50"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                            <Button 
                                variant="ghost" 
                                onClick={() => { setIsEditingSkill(false); setEditingSkillData(null); }}
                                className="h-10 rounded-xl px-4 font-bold text-slate-500 hover:bg-slate-50"
                            >
                                Abbrechen
                            </Button>
                            <Button 
                                onClick={handleSaveCustomSkillClick}
                                className="h-10 rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition-all"
                            >
                                Speichern
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
