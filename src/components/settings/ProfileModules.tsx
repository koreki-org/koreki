import React from 'react';
import { FileText, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Save, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';

interface SidebarProps {
    profiles: any[];
    selectedProfile: string;
    isCreatingNew: boolean;
    editingProfileId: string | null;
    editingName: string;
    onStartNew: () => void;
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
    onSelectProfile, 
    onStartRename, 
    onDeleteProfile, 
    onConfirmRename, 
    setEditingName, 
    setEditingProfileId
}) => (
    <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100">
            <Button onClick={onStartNew} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md gap-2">
                <PlusCircle size={18} /> Neues Profil
            </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 pt-4">
            {/* User Profiles */}
            {profiles.filter(p => !p.isSystem).length > 0 && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">Eigene Profile</label>
                    {profiles.filter(p => !p.isSystem).map(p => (
                        <Button
                            key={p.id}
                            variant="ghost"
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
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
                        </Button>
                    ))}
                </div>
            )}
            {/* System Templates */}
            <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest px-2">System-Vorlagen</label>
                {profiles.filter(p => p.isSystem).map(p => (
                    <Button
                        key={p.name}
                        variant="ghost"
                        onClick={() => onSelectProfile(p)}
                        className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group ${selectedProfile === p.name ? 'bg-white border-indigo-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                    >
                        <div className="flex items-center gap-3">
                            <FileText size={18} className={selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className={`text-xs md:text-sm font-bold ${selectedProfile === p.name ? 'text-indigo-600' : 'text-slate-700'}`}>{p.name}</span>
                        </div>
                    </Button>
                ))}
            </div>
        </div>
    </div>
);

interface EditorProps {
    isCreatingNew: boolean;
    selectedProfile: string;
    isSystemSelected: boolean;
    isDirty: boolean;
    saving: boolean;
    newProfileName: string;
    correctionPrompt: string;
    setNewProfileName: (v: string) => void;
    setCorrectionPrompt: (v: string) => void;
    onSaveToDB: () => void;
    onStartNew: (p?: string) => void;
}

export const ProfileEditor: React.FC<EditorProps> = ({
    isCreatingNew, selectedProfile, isSystemSelected, isDirty, saving, 
    newProfileName, correctionPrompt, setNewProfileName, setCorrectionPrompt, 
    onSaveToDB, onStartNew
}) => (
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

        <div className="flex-1 flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={18} className="text-indigo-600" /> Pädagogische Expertise
                </label>
                <div className="flex gap-2">
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
