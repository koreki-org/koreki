import React from 'react';
import { Wrench, PlusCircle, Pencil, Trash2, Check, RefreshCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FloatingActions } from '@/components/ui/FloatingActions';
import { parseMarkdownProfile } from '@/lib/parsers/markdown-profile-parser';
import { useFileDropZone } from '@/hooks/useFileDropZone';
import { meldeHinweis } from '@/lib/notify';

/**
 * Seitenleiste der Skill-Profile — Auswahl, Umbenennen, Import, Export.
 *
 * Lag zuvor am Anfang von SkillsModules.tsx, also in derselben Datei wie der
 * Editor. Beide sind eigenstaendige Komponenten mit eigenen Props; sie standen
 * nur zusammen, weil sie zusammen entstanden sind.
 */
interface SkillsSidebarProps {
    profiles: any[];
    /** Kennung des gewaehlten Sets — die Markierung haengt daran, nicht am Namen. */
    selectedProfileId: string;
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
    selectedProfileId,
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

    /**
     * Liest eine abgelegte Profildatei ein.
     *
     * Der Fehlerfall war hier lange nicht abgefangen — im Gegenstueck fuer
     * KI-Profile schon. Bei einer kaputten Datei brach der Handler still ab und
     * die Lehrkraft sah einfach nichts passieren.
     */
    const importProfileFile = async (file: File) => {
        try {
            const text = await file.text();
            onImportParsedProfile(parseMarkdownProfile(text));
        } catch (err) {
            meldeHinweis('Ungültiges Skill-Profil-Format (Markdown erwartet).');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await importProfileFile(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const { isDragging, dragProps } = useFileDropZone(importProfileFile);

    return (
        <div 
            className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-200 h-full ${isDragging ? 'bg-primary/5 ring-2 ring-inset ring-primary' : ''}`}
            {...dragProps}
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
                                className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfileId === p.id ? 'bg-background border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-background/50'}`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0 relative pr-2">
                                    <Wrench size={18} className={selectedProfileId === p.id ? 'text-primary' : 'text-muted-foreground'} />
                                    {editingProfileId === p.id ? (
                                        <Input 
                                            autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                            className="h-8 text-xs font-bold border-primary/20" onClick={(e) => e.stopPropagation()}
                                            onBlur={onConfirmRename} onKeyDown={(e) => e.key === 'Enter' && onConfirmRename()}
                                        />
                                    ) : (
                                        <span 
                                            className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfileId === p.id ? 'text-primary' : 'text-foreground'} group-hover:pr-[110px]`}
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
                            key={p.id || p.name}
                            onClick={() => onSelectProfile(p)}
                            className={`w-full h-auto p-4 rounded-2xl border transition-all text-left flex justify-between items-center group cursor-pointer ${selectedProfileId === p.id ? 'bg-background border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-background/50'}`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0 relative pr-2">
                                <Wrench size={18} className={selectedProfileId === p.id ? 'text-primary' : 'text-muted-foreground'} />
                                <span 
                                    className={`text-xs md:text-sm font-bold truncate transition-all duration-300 ${selectedProfileId === p.id ? 'text-primary' : 'text-foreground'} group-hover:pr-[60px]`}
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
