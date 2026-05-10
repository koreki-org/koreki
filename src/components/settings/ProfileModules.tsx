import React from 'react';
import { FileText, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Save, MessageSquare, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { parseMarkdownProfile } from '@/lib/parsers/markdown-profile-parser';

interface SidebarProps {
    profiles: any[];
    selectedProfile: string;
    isCreatingNew: boolean;
    editingProfileId: string | null;
    editingName: string;
    onStartNew: () => void;
    onImportParsedProfile: (parsed: any) => void;
    onSelectProfile: (p: any) => void;
    onStartRename: (e: React.MouseEvent, p: any) => void;
    onDeleteProfile: (id: string, e: React.MouseEvent) => void;
    onConfirmRename: () => void;
    setEditingName: (v: string) => void;
    setEditingProfileId: (v: string | null) => void;
}

export const ProfileSidebar: React.FC<SidebarProps> = ({
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
        // Reset input so the same file can be uploaded again if needed
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
        className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-200 ${isDragging ? 'bg-indigo-50/80 ring-2 ring-inset ring-indigo-500' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
        {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-50/80 backdrop-blur-sm border-2 border-dashed border-indigo-500 rounded-2xl m-2 pointer-events-none">
                <div className="flex flex-col items-center text-indigo-600 font-bold gap-2">
                    <RefreshCcw size={32} className="animate-spin-slow" />
                    <p>Profil hier loslassen!</p>
                </div>
            </div>
        )}
        <div className="p-4 border-b border-slate-100 space-y-2 relative z-10">
            <Button onClick={onStartNew} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md gap-2">
                <PlusCircle size={18} /> Neues Profil
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-10 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 gap-2">
                <RefreshCcw size={16} /> .md Profil Importieren
            </Button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".md,.json" 
                className="hidden" 
            />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 pt-4">
            {/* User Profiles */}
            {profiles.filter(p => !p.isSystem).length > 0 && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Eigene Profile</label>
                    {profiles.filter(p => !p.isSystem).map(p => (
                        <div
                            key={p.id}
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                                {editingProfileId === p.id ? (
                                    <Input 
                                        autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                        className="h-8 text-xs font-bold border-indigo-200" onClick={(e) => e.stopPropagation()}
                                        onBlur={onConfirmRename} onKeyDown={(e) => e.key === 'Enter' && onConfirmRename()}
                                    />
                                ) : (
                                    <span className={`text-xs md:text-sm font-bold truncate ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'}`}>{p.name}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {editingProfileId === p.id ? (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={(e) => { e.stopPropagation(); onConfirmRename(); }}>
                                        <Check size={14} />
                                    </Button>
                                ) : (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-opacity" onClick={(e) => onStartRename(e, p)}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" onClick={(e) => onDeleteProfile(p.id, e)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* System Templates */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">System-Vorlagen</label>
                {profiles.filter(p => p.isSystem).map(p => (
                    <div
                        key={p.name}
                        onClick={() => onSelectProfile(p)}
                        className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <FileText size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className={`text-xs md:text-sm font-bold ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'}`}>{p.name}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

interface EditorProps {
    isCreatingNew: boolean;
    selectedProfile: string;
    isSystemSelected: boolean;
    isDirty: boolean;
    saving: boolean;
    newProfileName: string;
    correctionPrompt: string;
    importedAiParams?: any;
    createAiProfile?: boolean;
    setCreateAiProfile?: (v: boolean) => void;
    setNewProfileName: (v: string) => void;
    setCorrectionPrompt: (v: string) => void;
    onSaveToDB: () => void;
    onStartNew: (p?: string) => void;
}

export const ProfileEditor: React.FC<EditorProps> = ({
    isCreatingNew, selectedProfile, isSystemSelected, isDirty, saving, 
    newProfileName, correctionPrompt, importedAiParams, createAiProfile, setCreateAiProfile,
    setNewProfileName, setCorrectionPrompt, 
    onSaveToDB, onStartNew
}) => {
    const handleExport = () => {
        const safeName = isCreatingNew ? newProfileName : selectedProfile;
        const markdown = `---
name: "${safeName}"
description: "Exportiertes Koreki Experten-Profil"
version: "1.0.0"
---

${correctionPrompt}`;
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
    <div className="flex-1 flex flex-col space-y-4 sm:space-y-6 overflow-y-auto p-4 sm:p-8">
        <div className="flex justify-between items-end gap-6">
            <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {isCreatingNew ? 'Name für neues Profil' : 'Gewähltes Profil'}
                </label>
                {isCreatingNew ? (
                    <Input
                        autoFocus value={newProfileName} onChange={e => setNewProfileName(e.target.value)}
                        placeholder="z.B. IT-Systeme 11b" className="text-lg sm:text-xl font-black border-indigo-200 h-12 sm:h-14 rounded-xl sm:rounded-2xl"
                    />
                ) : (
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                        {selectedProfile}
                        {isSystemSelected && <Badge variant="outline" className="text-[7px] sm:text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full border-transparent">SYSTEM</Badge>}
                    </h3>
                )}
            </div>
            {isDirty && !isCreatingNew && !isSystemSelected && (
                <div className="flex items-center gap-2 text-amber-500 animate-pulse pb-2 shrink-0">
                    <RefreshCcw size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ungespeichertes</span>
                </div>
            )}
        </div>

        {isCreatingNew && importedAiParams && (
            <div className="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 flex items-start gap-4 animate-fade-in shrink-0">
                <input 
                    type="checkbox" 
                    id="createAiProfile"
                    checked={createAiProfile}
                    onChange={(e) => setCreateAiProfile?.(e.target.checked)}
                    className="mt-1 w-5 h-5 text-indigo-600 rounded-md border-indigo-300 focus:ring-indigo-600 focus:ring-offset-indigo-50 cursor-pointer transition-all"
                />
                <div className="flex-1">
                    <label htmlFor="createAiProfile" className="text-sm font-black text-slate-800 cursor-pointer block">
                        Mitgelieferte KI-Parameter speichern
                    </label>
                    <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                        Diese Datei enthält empfohlene Experteneinstellungen 
                        (z.B. Temp: <strong className="text-indigo-600">{importedAiParams.temperature}</strong>, 
                        Thinking: <strong className="text-indigo-600">{importedAiParams.enableThinking ? 'Aktiv' : 'Inaktiv'}</strong>). 
                        Möchtest du diese direkt als KI-Profil mit demselben Namen abspeichern?
                    </p>
                </div>
            </div>
        )}

        <div className="flex-1 flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={18} className="text-indigo-600" /> Pädagogische Expertise
                </label>
                <div className="flex gap-2">
                    {!isCreatingNew && (
                        <Button variant="outline" size="sm" onClick={handleExport} className="h-8 sm:h-9 rounded-full text-[10px] font-black uppercase border-indigo-100 text-indigo-600 gap-2 px-3 sm:px-4 hover:bg-indigo-50">
                            <Download size={14} /> Export
                        </Button>
                    )}
                    {!isSystemSelected && (
                        <Button variant="outline" size="sm" disabled={!isDirty || saving} onClick={onSaveToDB} className={`h-8 sm:h-9 rounded-full text-[10px] font-black uppercase gap-2 px-3 sm:px-4 ${isDirty ? 'border-indigo-600 bg-indigo-50 text-indigo-600 animate-pulse' : 'border-slate-100 text-slate-300'}`}>
                            <Save size={14} /> Speichern
                        </Button>
                    )}
                    {!isCreatingNew && (
                        <Button variant="outline" size="sm" onClick={() => onStartNew(correctionPrompt)} className="h-8 sm:h-9 rounded-full text-[10px] font-black uppercase border-indigo-100 text-indigo-600 gap-2 px-3 sm:px-4">
                            <PlusCircle size={14} /> Kopieren
                        </Button>
                    )}
                </div>
            </div>
            <Textarea
                value={correctionPrompt} onChange={e => setCorrectionPrompt(e.target.value)}
                placeholder="Hier deine fachliche Expertise eingeben..."
                className="flex-1 w-full p-6 rounded-3xl border-slate-200 bg-slate-50/30 text-sm sm:text-base leading-relaxed focus:ring-4 focus:ring-indigo-500/10 resize-none font-medium"
            />
        </div>
    </div>
    );
};
